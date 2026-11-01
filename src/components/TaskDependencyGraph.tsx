import React, { useState, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Circle,
  Lock,
  Flame,
  Calendar,
} from 'lucide-react';
import { TimelineTask } from '../types/event';
import {
  analyzeTaskSchedule,
  wouldCreateDependencyCycle,
  autoResolveScheduleConflicts,
  inferLogicalDependencies,
} from '../utils/taskScheduler';
import { DagStatsAndToolbar } from './dag/DagStatsAndToolbar';
import { DagTreeView } from './dag/DagTreeView';
import { DagNodeInspector } from './dag/DagNodeInspector';

export interface TaskDependencyGraphProps {
  tasks: TimelineTask[];
  onToggleTaskStatus: (taskId: string) => void;
  onSetTaskDependency: (
    taskId: string,
    dependsOnTaskId: string | undefined
  ) => void;
  onBulkUpdateTasks: (updatedTasks: TimelineTask[]) => void;
}

const NODE_WIDTH = 248;
const NODE_HEIGHT = 112;
const COL_GAP = 92;
const ROW_GAP = 26;
const PAD_X = 36;
const PAD_Y = 36;

/**
 * Interactive Task Dependency Graph (DAG) and Collapsible Hierarchy Tree.
 * Provides accessible SVG role="img" with <title> and <desc>, keyboard-focusable
 * task nodes, an equivalent screen-reader dependency list, and gentle pulse animations
 * on overdue or blocked nodes.
 */
export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  tasks,
  onToggleTaskStatus,
  onSetTaskDependency,
  onBulkUpdateTasks,
}) => {
  const uid = useId();
  const svgTitleId = `${uid}-dag-title`;
  const svgDescId = `${uid}-dag-desc`;

  const [displayMode, setDisplayMode] = useState<'dag' | 'tree'>('dag');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'blocked'>('all');
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [collapsedTreeIds, setCollapsedTreeIds] = useState<Set<string>>(new Set());

  const diagnostics = useMemo(() => analyzeTaskSchedule(tasks), [tasks]);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const visibleTasks = useMemo(() => {
    if (filterMode === 'all') return tasks;
    if (filterMode === 'critical') {
      return tasks.filter((t) => diagnostics.criticalPathIds.has(t.id));
    }
    return tasks.filter(
      (t) =>
        diagnostics.blockedTaskIds.has(t.id) ||
        diagnostics.overdueTaskIds.has(t.id) ||
        diagnostics.scheduleConflictIds.has(t.id) ||
        (diagnostics.dependentCountMap.get(t.id) || 0) > 0
    );
  }, [tasks, filterMode, diagnostics]);

  const dagLayout = useMemo(() => {
    const columns = new Map<number, TimelineTask[]>();
    let maxCol = 0;

    const sorted = [...visibleTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    for (const task of sorted) {
      const depth = diagnostics.dependencyDepthMap.get(task.id) || 0;
      if (depth > maxCol) maxCol = depth;
      const list = columns.get(depth) || [];
      list.push(task);
      columns.set(depth, list);
    }

    let maxRowsInAnyCol = 1;
    columns.forEach((list) => {
      if (list.length > maxRowsInAnyCol) maxRowsInAnyCol = list.length;
    });

    const canvasWidth = Math.max(
      760,
      PAD_X * 2 + (maxCol + 1) * NODE_WIDTH + maxCol * COL_GAP
    );
    const canvasHeight = Math.max(
      340,
      PAD_Y * 2 + maxRowsInAnyCol * NODE_HEIGHT + (maxRowsInAnyCol - 1) * ROW_GAP
    );

    const positions = new Map<string, { x: number; y: number; depth: number }>();
    for (let col = 0; col <= maxCol; col++) {
      const colTasks = columns.get(col) || [];
      const colTotalHeight =
        colTasks.length * NODE_HEIGHT + Math.max(0, colTasks.length - 1) * ROW_GAP;
      const startY = Math.max(PAD_Y, Math.round((canvasHeight - colTotalHeight) / 2));

      colTasks.forEach((task, rowIdx) => {
        const x = PAD_X + col * (NODE_WIDTH + COL_GAP);
        const y = startY + rowIdx * (NODE_HEIGHT + ROW_GAP);
        positions.set(task.id, { x, y, depth: col });
      });
    }

    const edges: Array<{
      id: string;
      fromId: string;
      toId: string;
      path: string;
      midX: number;
      midY: number;
      isBlockedEdge: boolean;
      isConflictEdge: boolean;
      isCriticalEdge: boolean;
    }> = [];

    for (const task of visibleTasks) {
      if (!task.dependsOnTaskId) continue;
      const fromPos = positions.get(task.dependsOnTaskId);
      const toPos = positions.get(task.id);
      if (!fromPos || !toPos) continue;

      const startX = fromPos.x + NODE_WIDTH;
      const startY = fromPos.y + NODE_HEIGHT / 2;
      const endX = toPos.x;
      const endY = toPos.y + NODE_HEIGHT / 2;
      const deltaX = Math.max(48, Math.abs(endX - startX) * 0.5);
      const path = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;

      edges.push({
        id: `${task.dependsOnTaskId}->${task.id}`,
        fromId: task.dependsOnTaskId,
        toId: task.id,
        path,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2,
        isBlockedEdge: diagnostics.blockedTaskIds.has(task.id),
        isConflictEdge: diagnostics.scheduleConflictIds.has(task.id),
        isCriticalEdge:
          diagnostics.criticalPathIds.has(task.id) &&
          diagnostics.criticalPathIds.has(task.dependsOnTaskId),
      });
    }

    return { positions, edges, canvasWidth, canvasHeight, maxCol };
  }, [visibleTasks, diagnostics]);

  const treeRoots = useMemo(() => {
    const childrenByParentId = new Map<string, TimelineTask[]>();
    const roots: TimelineTask[] = [];
    const sorted = [...visibleTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const visibleSet = new Set(visibleTasks.map((t) => t.id));

    for (const t of sorted) {
      if (t.dependsOnTaskId && visibleSet.has(t.dependsOnTaskId)) {
        const list = childrenByParentId.get(t.dependsOnTaskId) || [];
        list.push(t);
        childrenByParentId.set(t.dependsOnTaskId, list);
      } else {
        roots.push(t);
      }
    }
    return { roots, childrenByParentId };
  }, [visibleTasks]);

  const activeHighlightChain = useMemo(() => {
    const targetId = hoveredTaskId || selectedTaskId;
    const highlighted = new Set<string>();
    if (!targetId) return highlighted;
    highlighted.add(targetId);

    let curr = taskMap.get(targetId);
    const seenUp = new Set<string>();
    while (curr?.dependsOnTaskId && !seenUp.has(curr.dependsOnTaskId)) {
      seenUp.add(curr.dependsOnTaskId);
      highlighted.add(curr.dependsOnTaskId);
      curr = taskMap.get(curr.dependsOnTaskId);
    }

    const queue = [targetId];
    const seenDown = new Set<string>([targetId]);
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      for (const t of tasks) {
        if (t.dependsOnTaskId === parentId && !seenDown.has(t.id)) {
          seenDown.add(t.id);
          highlighted.add(t.id);
          queue.push(t.id);
        }
      }
    }
    return highlighted;
  }, [hoveredTaskId, selectedTaskId, taskMap, tasks]);

  const handleNodeActivate = (task: TimelineTask) => {
    setCycleError(null);
    if (linkingSourceId) {
      if (linkingSourceId === task.id) {
        setLinkingSourceId(null);
        return;
      }
      if (wouldCreateDependencyCycle(tasks, task.id, linkingSourceId)) {
        setCycleError(
          `Cannot make "${task.title}" depend on "${taskMap.get(linkingSourceId)?.title}" because it would create a circular dependency.`
        );
        setLinkingSourceId(null);
        return;
      }
      onSetTaskDependency(task.id, linkingSourceId);
      setLinkingSourceId(null);
      setSelectedTaskId(task.id);
      return;
    }
    setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
  };

  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) : undefined;
  const totalChainCount = tasks.filter((t) => Boolean(t.dependsOnTaskId)).length;
  const unlinkedCount =
    tasks.filter((t) => !t.dependsOnTaskId).length > 1
      ? tasks.filter((t) => !t.dependsOnTaskId).length - 1
      : 0;

  return (
    <div className="space-y-4">
      <DagStatsAndToolbar
        totalChainCount={totalChainCount}
        maxDepth={dagLayout.maxCol + 1}
        criticalCount={diagnostics.criticalPathIds.size}
        blockedCount={diagnostics.blockedTaskIds.size}
        overdueCount={diagnostics.overdueTaskIds.size}
        conflictCount={diagnostics.scheduleConflictIds.size}
        displayMode={displayMode}
        onSetDisplayMode={setDisplayMode}
        filterMode={filterMode}
        onSetFilterMode={setFilterMode}
        unlinkedCount={unlinkedCount}
        onAutoInfer={() => {
          onBulkUpdateTasks(inferLogicalDependencies(tasks));
          setCycleError(null);
        }}
        onAutoResolveConflicts={() => {
          const { updatedTasks } = autoResolveScheduleConflicts(tasks, 3);
          onBulkUpdateTasks(updatedTasks);
          setCycleError(null);
        }}
        linkingSourceId={linkingSourceId}
        linkingSourceTitle={taskMap.get(linkingSourceId || '')?.title}
        onCancelLinking={() => {
          setLinkingSourceId(null);
          setCycleError(null);
        }}
        cycleError={cycleError}
      />

      {/* Visually-hidden accessible text list of task dependencies for screen readers */}
      <div className="sr-only">
        <h4>Task Dependency Summary List</h4>
        <ul>
          {visibleTasks.map((t) => {
            const parent = t.dependsOnTaskId ? taskMap.get(t.dependsOnTaskId) : undefined;
            const isBlocked = diagnostics.blockedTaskIds.has(t.id);
            const isOverdue = diagnostics.overdueTaskIds.has(t.id);
            return (
              <li key={t.id}>
                {t.title} — Status: {t.status}, Priority: {t.priority}, Due: {t.dueDate}.{' '}
                {parent ? `Depends on prerequisite: ${parent.title} (${parent.status}).` : 'Root milestone (no prerequisite).'}{' '}
                {isBlocked ? 'Currently blocked.' : ''} {isOverdue ? 'Currently overdue.' : ''}
              </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence mode="wait">
        {displayMode === 'dag' ? (
          <motion.div
            key="dag-canvas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-2xl overflow-x-auto shadow-inner relative"
          >
            <div
              className="relative"
              style={{
                width: `${dagLayout.canvasWidth}px`,
                height: `${dagLayout.canvasHeight}px`,
              }}
            >
              <svg
                width={dagLayout.canvasWidth}
                height={dagLayout.canvasHeight}
                role="img"
                aria-labelledby={`${svgTitleId} ${svgDescId}`}
                className="absolute inset-0 pointer-events-none"
              >
                <title id={svgTitleId}>Task Dependency Directed Acyclic Graph</title>
                <desc id={svgDescId}>
                  Visualizes {visibleTasks.length} tasks and {dagLayout.edges.length} dependency links across {dagLayout.maxCol + 1} stages.
                </desc>
                <defs>
                  <marker id={`${uid}-arrow-normal`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L0,9 L8,4.5 z" fill="#34D399" />
                  </marker>
                  <marker id={`${uid}-arrow-blocked`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L0,9 L8,4.5 z" fill="#F87171" />
                  </marker>
                  <marker id={`${uid}-arrow-critical`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L0,9 L8,4.5 z" fill="#FBBF24" />
                  </marker>
                </defs>
                {dagLayout.edges.map((edge) => {
                  const strokeColor =
                    edge.isConflictEdge || edge.isBlockedEdge
                      ? '#F87171'
                      : edge.isCriticalEdge
                      ? '#FBBF24'
                      : '#34D399';
                  const markerId =
                    edge.isConflictEdge || edge.isBlockedEdge
                      ? `${uid}-arrow-blocked`
                      : edge.isCriticalEdge
                      ? `${uid}-arrow-critical`
                      : `${uid}-arrow-normal`;
                  return (
                    <path
                      key={edge.id}
                      d={edge.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2.2}
                      strokeDasharray={edge.isBlockedEdge ? '6 4' : undefined}
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                })}
              </svg>

              {/* Focusable Interactive Task Nodes */}
              {visibleTasks.map((task) => {
                const pos = dagLayout.positions.get(task.id);
                if (!pos) return null;

                const isBlocked = diagnostics.blockedTaskIds.has(task.id);
                const isOverdue = diagnostics.overdueTaskIds.has(task.id);
                const isConflict = diagnostics.scheduleConflictIds.has(task.id);
                const isCritical = diagnostics.criticalPathIds.has(task.id);
                const isSelected = selectedTaskId === task.id;
                const isUrgent = isBlocked || isOverdue || isConflict;
                const isDimmed =
                  activeHighlightChain.size > 0 && !activeHighlightChain.has(task.id);
                const parentTask = task.dependsOnTaskId
                  ? taskMap.get(task.dependsOnTaskId)
                  : undefined;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    role="button"
                    tabIndex={0}
                    aria-label={`${task.title}, status ${task.status}, priority ${task.priority}, due ${task.dueDate}${
                      parentTask ? `, depends on ${parentTask.title}` : ', root milestone'
                    }${isBlocked ? ', blocked' : ''}${isOverdue ? ', overdue' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNodeActivate(task);
                      }
                    }}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => handleNodeActivate(task)}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: NODE_WIDTH,
                      height: NODE_HEIGHT,
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                    className={`rounded-2xl p-3.5 cursor-pointer transition-colors flex flex-col justify-between border ${
                      isSelected
                        ? 'bg-white border-2 border-[#22D3EE] shadow-lg ring-4 ring-[#22D3EE]/15'
                        : isUrgent
                        ? 'bg-white border-2 border-[#F87171] shadow-sm'
                        : isCritical
                        ? 'bg-white border-2 border-[#FBBF24] shadow-sm'
                        : 'bg-white border border-[#E6DFD3]'
                    }`}
                  >
                    {isUrgent && (
                      <motion.div
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-[#F87171]"
                        animate={{
                          scale: [1, 1.03, 1],
                          opacity: [0.55, 0.15, 0.55],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}

                    <div className="flex items-center justify-between gap-1.5 relative z-10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskStatus(task.id);
                          }}
                          aria-label={`Cycle status for ${task.title}, current status ${task.status}`}
                          className="shrink-0 p-0.5 rounded hover:bg-[#FAF7F2]"
                        >
                          {task.status === 'Done' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#34D399]" aria-hidden="true" />
                          ) : task.status === 'In Progress' ? (
                            <Clock className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#CBD5E1]" aria-hidden="true" />
                          )}
                        </button>
                        <span className="text-xs font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F3EFE6] text-[#6E655A] truncate">
                          {task.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isBlocked && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171] text-xs font-bold">
                            <Lock className="w-3 h-3" aria-hidden="true" /> Blocked
                          </span>
                        )}
                        {!isBlocked && isCritical && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#B8860B]/15 text-[#FBBF24] text-xs font-bold">
                            <Flame className="w-3 h-3" aria-hidden="true" /> Critical
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="my-1 relative z-10">
                      <p
                        className={`text-xs font-bold leading-snug line-clamp-2 ${
                          task.status === 'Done'
                            ? 'line-through text-[#94A3B8]'
                            : 'text-[#1F1C18]'
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#E6DFD3] text-xs text-[#6E655A] relative z-10">
                      <span className="font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#B8860B]" aria-hidden="true" />
                        {task.dueDate}
                      </span>
                      <span className="font-mono">{task.priority}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <DagTreeView
            rootTasks={treeRoots.roots}
            childrenByParentId={treeRoots.childrenByParentId}
            diagnostics={diagnostics}
            selectedTaskId={selectedTaskId}
            collapsedTreeIds={collapsedTreeIds}
            onSelectTask={(id) =>
              setSelectedTaskId((prev) => (prev === id ? null : id))
            }
            onToggleStatus={onToggleTaskStatus}
            onToggleCollapse={(id) =>
              setCollapsedTreeIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
        )}
      </AnimatePresence>

      {selectedTask && (
        <DagNodeInspector
          selectedTask={selectedTask}
          tasks={tasks}
          diagnostics={diagnostics}
          linkingSourceId={linkingSourceId}
          onToggleLinkingSource={(id) =>
            setLinkingSourceId((prev) => (prev === id ? null : id))
          }
          onToggleStatus={onToggleTaskStatus}
          onSetDependency={(taskId, parentId) => {
            onSetTaskDependency(taskId, parentId);
            setCycleError(null);
          }}
          onSelectTask={setSelectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};
