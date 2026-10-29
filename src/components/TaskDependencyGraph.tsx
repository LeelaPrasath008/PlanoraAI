import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  GitBranch,
  Network,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { PlanoraTask } from '../types/event';

interface TaskDependencyGraphProps {
  tasks: PlanoraTask[];
  eventDate: string;
  isReadOnly?: boolean;
  initialSubMode?: 'graph' | 'tree';
  onUpdateTask: (updated: PlanoraTask) => Promise<void> | void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
}

interface EdgeCoord {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBlocking: boolean;
  prereqStatus: PlanoraTask['status'];
  isCriticalPath: boolean;
}

const NODE_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 30,
  mass: 0.85,
};

export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  tasks,
  isReadOnly = false,
  initialSubMode = 'graph',
  onUpdateTask,
  onDeleteTask,
}) => {
  const [subMode, setSubMode] = useState<'graph' | 'tree'>(initialSubMode);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [dependencyFilter, setDependencyFilter] = useState<
    'all' | 'blocked' | 'overdue' | 'bottlenecks' | 'ready'
  >('all');
  const [highlightCriticalPath, setHighlightCriticalPath] =
    useState<boolean>(true);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>(
    {}
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Track tasks that recently changed status, connection, or unlocked state for subtle highlight animations
  const [transientHighlights, setTransientHighlights] = useState<
    Record<string, 'status' | 'connection' | 'unlocked'>
  >({});
  const prevTasksSnapshotRef = useRef<
    Map<
      string,
      {
        status: PlanoraTask['status'];
        dependsOnTaskId: string;
        isBlocked: boolean;
      }
    >
  >(new Map());

  // Sync subMode when parent changes initialSubMode
  useEffect(() => {
    setSubMode(initialSubMode);
  }, [initialSubMode]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edges, setEdges] = useState<EdgeCoord[]>([]);

  const taskMap = useMemo(() => {
    const map = new Map<string, PlanoraTask>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  // Build adjacency lists (childrenMap: prereqId -> dependent tasks)
  const {
    childrenMap,
    downstreamCountMap,
    criticalPathIds,
    stages,
    stats,
  } = useMemo(() => {
    const cMap = new Map<string, PlanoraTask[]>();
    tasks.forEach((t) => cMap.set(t.id, []));

    tasks.forEach((t) => {
      if (t.dependsOnTaskId && taskMap.has(t.dependsOnTaskId)) {
        const list = cMap.get(t.dependsOnTaskId) || [];
        list.push(t);
        cMap.set(t.dependsOnTaskId, list);
      }
    });

    // Compute topological depth for each task (with cycle protection)
    const dMap = new Map<string, number>();
    const computeDepth = (
      taskId: string,
      visited = new Set<string>()
    ): number => {
      if (dMap.has(taskId)) return dMap.get(taskId)!;
      if (visited.has(taskId)) return 0;
      visited.add(taskId);
      const t = taskMap.get(taskId);
      if (!t || !t.dependsOnTaskId || !taskMap.has(t.dependsOnTaskId)) {
        dMap.set(taskId, 0);
        return 0;
      }
      const d = 1 + computeDepth(t.dependsOnTaskId, visited);
      dMap.set(taskId, d);
      return d;
    };

    tasks.forEach((t) => computeDepth(t.id));

    // Compute total transitive downstream tasks for each task
    const dsCount = new Map<string, number>();
    const getTransitiveDependents = (
      taskId: string,
      visited = new Set<string>()
    ): Set<string> => {
      const result = new Set<string>();
      const direct = cMap.get(taskId) || [];
      for (const child of direct) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          result.add(child.id);
          const sub = getTransitiveDependents(child.id, visited);
          sub.forEach((id) => result.add(id));
        }
      }
      return result;
    };

    tasks.forEach((t) => {
      dsCount.set(t.id, getTransitiveDependents(t.id).size);
    });

    // Find longest chain (Critical Path)
    let longestDepth = 0;
    dMap.forEach((d) => {
      if (d > longestDepth) longestDepth = d;
    });

    const critIds = new Set<string>();
    tasks.forEach((t) => {
      if ((dMap.get(t.id) || 0) === longestDepth && longestDepth > 0) {
        let curr: PlanoraTask | undefined = t;
        const seen = new Set<string>();
        while (curr && !seen.has(curr.id)) {
          seen.add(curr.id);
          critIds.add(curr.id);
          curr = curr.dependsOnTaskId
            ? taskMap.get(curr.dependsOnTaskId)
            : undefined;
        }
      }
    });

    // Group tasks by stage level
    const stageGroups: PlanoraTask[][] = Array.from(
      { length: longestDepth + 1 },
      () => []
    );
    tasks.forEach((t) => {
      const d = dMap.get(t.id) || 0;
      stageGroups[d].push(t);
    });
    stageGroups.forEach((group) =>
      group.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    );

    // Compute dependency intelligence metrics
    let blockedCount = 0;
    let readyCount = 0;
    let bottleneckCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      const prereq = t.dependsOnTaskId
        ? taskMap.get(t.dependsOnTaskId)
        : undefined;
      const isBlocked = Boolean(prereq && prereq.status !== 'Completed');
      const isOverdue = t.status !== 'Completed' && t.dueDate < todayIso;
      const dependents = cMap.get(t.id) || [];

      if (t.status !== 'Completed') {
        if (isOverdue) {
          overdueCount += 1;
        }
        if (isBlocked) {
          blockedCount += 1;
        } else {
          readyCount += 1;
        }
        if (dependents.length > 0) {
          bottleneckCount += 1;
        }
      }
    });

    return {
      childrenMap: cMap,
      depthMap: dMap,
      maxDepth: longestDepth,
      downstreamCountMap: dsCount,
      criticalPathIds: critIds,
      stages: stageGroups,
      stats: {
        blockedCount,
        readyCount,
        bottleneckCount,
        overdueCount,
        stageCount: longestDepth + 1,
      },
    };
  }, [tasks, taskMap, todayIso]);

  // Detect status changes, dependency connection updates, and newly unlocked downstream tasks
  useEffect(() => {
    const prevMap = prevTasksSnapshotRef.current;
    const nextHighlights: Record<string, 'status' | 'connection' | 'unlocked'> =
      {};

    tasks.forEach((t) => {
      const prereq = t.dependsOnTaskId
        ? taskMap.get(t.dependsOnTaskId)
        : undefined;
      const isBlocked = Boolean(prereq && prereq.status !== 'Completed');
      const prev = prevMap.get(t.id);

      if (prev) {
        if (prev.dependsOnTaskId !== t.dependsOnTaskId) {
          nextHighlights[t.id] = 'connection';
        } else if (prev.status !== t.status) {
          nextHighlights[t.id] = 'status';
        } else if (prev.isBlocked && !isBlocked) {
          nextHighlights[t.id] = 'unlocked';
        }
      }

      prevMap.set(t.id, {
        status: t.status,
        dependsOnTaskId: t.dependsOnTaskId,
        isBlocked,
      });
    });

    if (Object.keys(nextHighlights).length > 0) {
      setTransientHighlights((curr) => ({ ...curr, ...nextHighlights }));
      const timer = setTimeout(() => {
        setTransientHighlights((curr) => {
          const copy = { ...curr };
          Object.keys(nextHighlights).forEach((k) => delete copy[k]);
          return copy;
        });
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [tasks, taskMap]);

  // Active focus task (hovered or clicked) and its connected upstream + downstream lineage
  const activeFocusId = hoveredTaskId || selectedTaskId;

  const connectedLineageIds = useMemo(() => {
    if (!activeFocusId) return null;
    const set = new Set<string>([activeFocusId]);

    // Walk upstream prerequisites
    let curr = taskMap.get(activeFocusId);
    const upSeen = new Set<string>();
    while (curr && curr.dependsOnTaskId && !upSeen.has(curr.id)) {
      upSeen.add(curr.id);
      if (taskMap.has(curr.dependsOnTaskId)) {
        set.add(curr.dependsOnTaskId);
        curr = taskMap.get(curr.dependsOnTaskId);
      } else {
        break;
      }
    }

    // Walk downstream dependents
    const walkDown = (id: string, downSeen = new Set<string>()) => {
      const children = childrenMap.get(id) || [];
      for (const ch of children) {
        if (!downSeen.has(ch.id)) {
          downSeen.add(ch.id);
          set.add(ch.id);
          walkDown(ch.id, downSeen);
        }
      }
    };
    walkDown(activeFocusId);

    return set;
  }, [activeFocusId, taskMap, childrenMap]);

  // Check if linking `taskId` to `candidatePrereqId` would create a cycle
  const wouldCreateCycle = useCallback(
    (taskId: string, candidatePrereqId: string): boolean => {
      if (!candidatePrereqId) return false;
      if (taskId === candidatePrereqId) return true;
      let curr = taskMap.get(candidatePrereqId);
      const visited = new Set<string>();
      while (curr && curr.dependsOnTaskId && !visited.has(curr.id)) {
        visited.add(curr.id);
        if (curr.dependsOnTaskId === taskId) return true;
        curr = taskMap.get(curr.dependsOnTaskId);
      }
      return false;
    },
    [taskMap]
  );

  // Recalculate SVG edge coordinates whenever layout, tasks, filter, or window size changes
  const recomputeEdges = useCallback(() => {
    if (!containerRef.current || subMode !== 'graph') return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const nextEdges: EdgeCoord[] = [];

    tasks.forEach((task) => {
      if (!task.dependsOnTaskId) return;
      const prereq = taskMap.get(task.dependsOnTaskId);
      if (!prereq) return;

      const fromEl = nodeRefs.current[prereq.id];
      const toEl = nodeRefs.current[task.id];
      if (!fromEl || !toEl) return;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const isHorizontal = toRect.left > fromRect.right - 20;
      const x1 = isHorizontal
        ? fromRect.right - containerRect.left
        : fromRect.left + fromRect.width / 2 - containerRect.left;
      const y1 = isHorizontal
        ? fromRect.top + fromRect.height / 2 - containerRect.top
        : fromRect.bottom - containerRect.top;
      const x2 = isHorizontal
        ? toRect.left - containerRect.left
        : toRect.left + toRect.width / 2 - containerRect.left;
      const y2 = isHorizontal
        ? toRect.top + toRect.height / 2 - containerRect.top
        : toRect.top - containerRect.top;

      nextEdges.push({
        id: `${prereq.id}->${task.id}`,
        fromId: prereq.id,
        toId: task.id,
        x1,
        y1,
        x2,
        y2,
        isBlocking: prereq.status !== 'Completed',
        prereqStatus: prereq.status,
        isCriticalPath:
          criticalPathIds.has(prereq.id) && criticalPathIds.has(task.id),
      });
    });

    setEdges(nextEdges);
  }, [tasks, taskMap, subMode, criticalPathIds]);

  // Smooth 60fps requestAnimationFrame edge tracking while nodes glide into new positions
  const triggerSmoothEdgeTracking = useCallback(
    (durationMs = 520) => {
      let rafId = 0;
      const start = performance.now();
      const step = (now: number) => {
        recomputeEdges();
        if (now - start < durationMs) {
          rafId = requestAnimationFrame(step);
        }
      };
      rafId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafId);
    },
    [recomputeEdges]
  );

  useEffect(() => {
    const cancel = triggerSmoothEdgeTracking(560);
    window.addEventListener('resize', recomputeEdges);
    return () => {
      cancel();
      window.removeEventListener('resize', recomputeEdges);
    };
  }, [
    triggerSmoothEdgeTracking,
    recomputeEdges,
    tasks,
    dependencyFilter,
    subMode,
    selectedTaskId,
  ]);

  const cycleTaskStatus = async (task: PlanoraTask) => {
    if (isReadOnly) return;
    const order: PlanoraTask['status'][] = ['Todo', 'In Progress', 'Completed'];
    const nextStatus = order[(order.indexOf(task.status) + 1) % order.length];
    await onUpdateTask({ ...task, status: nextStatus });
  };

  const matchesFilter = (task: PlanoraTask): boolean => {
    if (dependencyFilter === 'all') return true;
    const prereq = task.dependsOnTaskId
      ? taskMap.get(task.dependsOnTaskId)
      : undefined;
    const isBlocked = Boolean(prereq && prereq.status !== 'Completed');
    const isOverdue = task.status !== 'Completed' && task.dueDate < todayIso;
    const dependents = childrenMap.get(task.id) || [];

    if (dependencyFilter === 'blocked') {
      return task.status !== 'Completed' && isBlocked;
    }
    if (dependencyFilter === 'overdue') {
      return isOverdue;
    }
    if (dependencyFilter === 'bottlenecks') {
      return task.status !== 'Completed' && dependents.length > 0;
    }
    if (dependencyFilter === 'ready') {
      return task.status !== 'Completed' && !isBlocked;
    }
    return true;
  };

  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) : null;

  // Root tasks for Tree View
  const rootTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.dependsOnTaskId || !taskMap.has(t.dependsOnTaskId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, taskMap]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (
    task: PlanoraTask,
    level: number,
    visited = new Set<string>()
  ): React.ReactNode => {
    if (visited.has(task.id)) return null;
    visited.add(task.id);

    const children = (childrenMap.get(task.id) || []).sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );
    const prereq = task.dependsOnTaskId
      ? taskMap.get(task.dependsOnTaskId)
      : undefined;
    const isBlocked = Boolean(prereq && prereq.status !== 'Completed');
    const isCollapsed = Boolean(collapsedNodes[task.id]);
    const isVisibleByFilter = matchesFilter(task);
    const downstreamTotal = downstreamCountMap.get(task.id) || 0;
    const highlightState = transientHighlights[task.id];
    const isOverdue = task.status !== 'Completed' && task.dueDate < todayIso;
    const needsUrgentPulse = task.status !== 'Completed' && (isOverdue || isBlocked);

    return (
      <motion.div
        key={task.id}
        layoutId={`tree-node-${task.id}`}
        layout="position"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: isVisibleByFilter ? 1 : 0.4,
          y: 0,
          scale: highlightState ? 1.012 : 1,
        }}
        exit={{ opacity: 0, y: -8 }}
        transition={NODE_SPRING}
        className="relative"
      >
        <motion.div
          animate={{
            backgroundColor:
              selectedTaskId === task.id
                ? '#FFFFFF'
                : highlightState === 'unlocked' || highlightState === 'status'
                ? '#ECFDF5'
                : highlightState === 'connection'
                ? '#EEF2FF'
                : isOverdue
                ? '#FEF2F2'
                : isBlocked && task.status !== 'Completed'
                ? '#FFFBEB'
                : task.status === 'Completed'
                ? '#F0FDF4'
                : '#FFFFFF',
            borderColor:
              selectedTaskId === task.id
                ? '#1E1B4B'
                : highlightState === 'unlocked' || highlightState === 'status'
                ? '#059669'
                : highlightState === 'connection'
                ? '#4F46E5'
                : isOverdue
                ? '#FCA5A5'
                : isBlocked && task.status !== 'Completed'
                ? '#FCD34D'
                : task.status === 'Completed'
                ? '#86EFAC'
                : '#E2E8F0',
          }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            selectedTaskId === task.id
              ? 'shadow-md'
              : isOverdue
              ? 'task-pulse-overdue'
              : isBlocked && task.status !== 'Completed'
              ? 'task-pulse-blocked'
              : 'hover:shadow-xs'
          }`}
        >
          {/* Collapse / Expand toggle if task has children */}
          <button
            type="button"
            onClick={() =>
              setCollapsedNodes((prev) => ({
                ...prev,
                [task.id]: !prev[task.id],
              }))
            }
            disabled={children.length === 0}
            className={`mt-0.5 p-1 rounded-md transition-colors ${
              children.length > 0
                ? 'text-[#1E1B4B] hover:bg-slate-100 cursor-pointer'
                : 'text-slate-300 cursor-default'
            }`}
            aria-label={
              isCollapsed ? 'Expand dependent tasks' : 'Collapse dependent tasks'
            }
          >
            {children.length > 0 ? (
              isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )
            ) : (
              <GitBranch className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Status Quick-Toggle Button with gentle pulse when overdue or blocked */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            animate={
              needsUrgentPulse
                ? { scale: [1, 1.08, 1] }
                : { scale: 1 }
            }
            transition={
              needsUrgentPulse
                ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            onClick={() => cycleTaskStatus(task)}
            title="Click to cycle status (Todo → In Progress → Completed)"
            className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              task.status === 'Completed'
                ? 'bg-[#059669] text-white'
                : isOverdue
                ? 'bg-red-100 text-red-700 border border-red-300'
                : task.status === 'In Progress'
                ? 'bg-[#1E1B4B] text-white'
                : isBlocked
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${task.status}-${isOverdue ? 'overdue' : isBlocked ? 'blocked' : 'open'}`}
                initial={{ scale: 0.5, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 25 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                {task.status === 'Completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isOverdue ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : isBlocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Main Task Info */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() =>
              setSelectedTaskId((prev) => (prev === task.id ? null : task.id))
            }
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span className="font-semibold text-[#1E1B4B]">
                Stage 0{level + 1}
              </span>
              <span aria-hidden="true">·</span>
              <span className={isOverdue ? 'text-red-700 font-semibold' : ''}>
                Due {task.dueDate}
              </span>
              {isOverdue && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-red-600 font-semibold">
                    Overdue · Action Required
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{task.category}</span>
              <span aria-hidden="true">·</span>
              <span>{task.priority} Priority</span>
              {task.assignee && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Owner: {task.assignee}</span>
                </>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <h4
                className={`text-sm font-bold font-display transition-colors duration-200 ${
                  task.status === 'Completed'
                    ? 'line-through text-slate-500'
                    : 'text-slate-900'
                }`}
              >
                {task.title}
              </h4>

              <div className="flex items-center gap-3 text-xs">
                <AnimatePresence mode="wait" initial={false}>
                  {isBlocked && prereq ? (
                    <motion.span
                      key={`blocked-${prereq.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="text-amber-800 font-medium inline-flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Blocked by “{prereq.title.slice(0, 26)}”</span>
                    </motion.span>
                  ) : prereq ? (
                    <motion.span
                      key={`unlocked-${prereq.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="text-emerald-700 font-medium inline-flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Prerequisite Complete</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="root"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-slate-500"
                    >
                      Root Milestone
                    </motion.span>
                  )}
                </AnimatePresence>

                {downstreamTotal > 0 && (
                  <span
                    className={`font-mono tabular-nums font-semibold transition-colors duration-200 ${
                      task.status === 'Completed'
                        ? 'text-emerald-700'
                        : 'text-[#1E1B4B]'
                    }`}
                  >
                    {task.status === 'Completed'
                      ? `Unlocked ${downstreamTotal} downstream`
                      : `Blocks ${downstreamTotal} downstream`}
                  </span>
                )}
              </div>
            </div>

            {task.description && (
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Inline Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              disabled={isReadOnly}
              value={task.dependsOnTaskId}
              onChange={(e) =>
                onUpdateTask({ ...task, dependsOnTaskId: e.target.value })
              }
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md max-w-[150px] truncate"
              title="Change prerequisite task"
            >
              <option value="">No Prerequisite (Root)</option>
              {tasks
                .filter(
                  (cand) =>
                    cand.id !== task.id && !wouldCreateCycle(task.id, cand.id)
                )
                .map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    After: {cand.title.slice(0, 25)}
                  </option>
                ))}
            </select>

            <select
              disabled={isReadOnly}
              value={task.status}
              onChange={(e) =>
                onUpdateTask({
                  ...task,
                  status: e.target.value as PlanoraTask['status'],
                })
              }
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md font-medium"
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </motion.div>

        {/* Nested Dependent Children */}
        <AnimatePresence initial={false}>
          {children.length > 0 && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="pl-7 md:pl-10 mt-2.5 space-y-2.5 relative before:content-[''] before:absolute before:left-3.5 md:before:left-5 before:top-0 before:bottom-4 before:w-px before:bg-slate-300"
            >
              {children.map((child) => (
                <div key={child.id} className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -left-3.5 md:-left-5 top-6 w-3.5 md:w-5 h-px bg-slate-300"
                  />
                  {renderTreeNode(child, level + 1, new Set(visited))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Dependency Intelligence & Control Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white border border-slate-200 rounded-xl p-4"
        >
          <div className="text-xs text-slate-500">
            Ready to Execute (Unblocked)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={stats.readyCount}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold text-[#059669] font-mono tabular-nums"
              >
                {stats.readyCount}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-slate-500">
              Prerequisites satisfied
            </span>
          </div>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className={`bg-white border rounded-xl p-4 ${
            stats.blockedCount > 0 || stats.overdueCount > 0
              ? 'border-amber-300/90'
              : 'border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-500">
            Blocked or Overdue Tasks
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${stats.blockedCount}-${stats.overdueCount}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`text-xl font-bold font-mono tabular-nums ${
                  stats.overdueCount > 0
                    ? 'text-red-600'
                    : stats.blockedCount > 0
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {stats.blockedCount} blocked · {stats.overdueCount} overdue
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-slate-500">Urgent attention</span>
          </div>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-xl p-4"
        >
          <div className="text-xs text-slate-500">
            Active Critical Bottlenecks
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={stats.bottleneckCount}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold text-[#1E1B4B] font-mono tabular-nums"
              >
                {stats.bottleneckCount}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-slate-500">
              Tasks blocking others
            </span>
          </div>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-xl p-4"
        >
          <div className="text-xs text-slate-500">
            Dependency Chain Stages
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={stats.stageCount}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold text-slate-900 font-mono tabular-nums"
              >
                {stats.stageCount} Stages
              </motion.span>
            </AnimatePresence>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {criticalPathIds.size} on critical path
            </span>
          </div>
        </motion.div>
      </div>

      {/* Topology Mode Switcher & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubMode('graph')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                subMode === 'graph'
                  ? 'bg-[#1E1B4B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Directed Dependency Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setSubMode('tree')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                subMode === 'tree'
                  ? 'bg-[#1E1B4B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Hierarchical Blocker Tree</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Nodes' },
                { id: 'blocked', label: `Blocked (${stats.blockedCount})` },
                { id: 'overdue', label: `Overdue (${stats.overdueCount})` },
                {
                  id: 'bottlenecks',
                  label: `Bottlenecks (${stats.bottleneckCount})`,
                },
                { id: 'ready', label: `Ready (${stats.readyCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDependencyFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dependencyFilter === f.id
                    ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={highlightCriticalPath}
              onChange={(e) => setHighlightCriticalPath(e.target.checked)}
              className="rounded border-slate-300 text-[#1E1B4B]"
            />
            <span>Highlight Critical Path</span>
          </label>

          <div className="flex items-center gap-3 text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#059669] inline-block" />
              <span>Unlocked</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-600 border-b border-dashed border-amber-600 inline-block" />
              <span>Blocking</span>
            </span>
          </div>
        </div>
      </div>

      {/* MODE 1: VISUAL DIRECTED DEPENDENCY GRAPH CANVAS */}
      {subMode === 'graph' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 overflow-x-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Blocked and overdue task nodes gently pulse to highlight items needing urgent action. Click any node’s status icon to complete prerequisites and unlock downstream tasks.
            </div>
            {selectedTaskId && (
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="text-xs font-medium text-[#1E1B4B] hover:underline shrink-0"
              >
                Clear Selection
              </button>
            )}
          </div>

          <LayoutGroup id="dependency-graph-canvas">
            <div
              ref={containerRef}
              className="relative min-w-[780px] py-2"
              onMouseLeave={() => setHoveredTaskId(null)}
            >
              {/* Animated SVG Bézier Dependency Connector Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <marker
                    id="arrow-unlocked"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#34D399" />
                  </marker>
                  <marker
                    id="arrow-blocking"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#FBBF24" />
                  </marker>
                  <marker
                    id="arrow-critical"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#22D3EE" />
                  </marker>
                </defs>

                <AnimatePresence>
                  {edges.map((edge) => {
                    const dx = Math.max(48, Math.abs(edge.x2 - edge.x1) * 0.48);
                    const d = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${
                      edge.y1
                    }, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;

                    const isFocusedEdge =
                      !connectedLineageIds ||
                      (connectedLineageIds.has(edge.fromId) &&
                        connectedLineageIds.has(edge.toId));

                    const strokeColor = !edge.isBlocking
                      ? '#34D399'
                      : highlightCriticalPath && edge.isCriticalPath
                      ? '#22D3EE'
                      : '#FBBF24';

                    const markerId = !edge.isBlocking
                      ? 'url(#arrow-unlocked)'
                      : highlightCriticalPath && edge.isCriticalPath
                      ? 'url(#arrow-critical)'
                      : 'url(#arrow-blocking)';

                    return (
                      <motion.g
                        key={edge.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isFocusedEdge ? 1 : 0.16 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {(activeFocusId ||
                          transientHighlights[edge.toId] ||
                          transientHighlights[edge.fromId]) &&
                          isFocusedEdge && (
                            <path
                              d={d}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={7}
                              strokeOpacity={0.16}
                            />
                          )}

                        <motion.path
                          d={d}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={
                            highlightCriticalPath && edge.isCriticalPath
                              ? 2.5
                              : 2
                          }
                          strokeDasharray={edge.isBlocking ? '6 5' : undefined}
                          markerEnd={markerId}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{
                            pathLength: 1,
                            opacity: 1,
                            stroke: strokeColor,
                          }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />

                        <circle r="3" fill={strokeColor}>
                          <animateMotion
                            dur={edge.isBlocking ? '3.2s' : '2.2s'}
                            repeatCount="indefinite"
                            path={d}
                          />
                        </circle>
                      </motion.g>
                    );
                  })}
                </AnimatePresence>
              </svg>

              {/* Stage Columns Grid */}
              <motion.div
                layout
                transition={NODE_SPRING}
                className="relative z-10 grid gap-8 items-start"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(
                    1,
                    stages.length
                  )}, minmax(240px, 1fr))`,
                }}
              >
                {stages.map((stageTasks, stageIdx) => (
                  <motion.div
                    key={`stage-col-${stageIdx}`}
                    layout="position"
                    transition={NODE_SPRING}
                    className="space-y-4"
                  >
                    <div className="pb-2 border-b border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1E1B4B] font-display">
                        0{stageIdx + 1}.{' '}
                        {stageIdx === 0
                          ? 'Foundation Prerequisites'
                          : stageIdx === stages.length - 1 && stages.length > 1
                          ? 'Final Execution Milestones'
                          : `Stage ${stageIdx + 1} Dependents`}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {stageTasks.length}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {stageTasks.map((task) => {
                        const prereq = task.dependsOnTaskId
                          ? taskMap.get(task.dependsOnTaskId)
                          : undefined;
                        const isBlocked = Boolean(
                          prereq && prereq.status !== 'Completed'
                        );
                        const isOverdue =
                          task.status !== 'Completed' &&
                          task.dueDate < todayIso;
                        const needsUrgentPulse =
                          task.status !== 'Completed' &&
                          (isOverdue || isBlocked);
                        const directChildren = childrenMap.get(task.id) || [];
                        const totalDownstream =
                          downstreamCountMap.get(task.id) || 0;
                        const isInLineage =
                          !connectedLineageIds ||
                          connectedLineageIds.has(task.id);
                        const isFilterMatch = matchesFilter(task);
                        const isOnCritPath =
                          highlightCriticalPath && criticalPathIds.has(task.id);
                        const highlightState = transientHighlights[task.id];

                        const targetBg =
                          selectedTaskId === task.id
                            ? '#FFFFFF'
                            : highlightState === 'unlocked' ||
                              highlightState === 'status'
                            ? '#ECFDF5'
                            : highlightState === 'connection'
                            ? '#EEF2FF'
                            : isOverdue
                            ? '#FEF2F2'
                            : isBlocked && task.status !== 'Completed'
                            ? '#FFFBEB'
                            : '#FFFFFF';

                        const targetBorder =
                          selectedTaskId === task.id
                            ? '#1E1B4B'
                            : highlightState === 'unlocked' ||
                              highlightState === 'status'
                            ? '#059669'
                            : highlightState === 'connection'
                            ? '#4F46E5'
                            : isOverdue
                            ? '#FCA5A5'
                            : isBlocked && task.status !== 'Completed'
                            ? '#FCD34D'
                            : task.status === 'Completed'
                            ? '#6EE7B7'
                            : isOnCritPath
                            ? '#1E1B4B'
                            : '#E2E8F0';

                        return (
                          <motion.div
                            key={task.id}
                            layoutId={`graph-node-${task.id}`}
                            layout
                            ref={(el) => {
                              nodeRefs.current[task.id] = el;
                            }}
                            onLayoutAnimationStart={() =>
                              triggerSmoothEdgeTracking(480)
                            }
                            onLayoutAnimationComplete={recomputeEdges}
                            initial={{ opacity: 0, y: 14, scale: 0.96 }}
                            animate={{
                              opacity:
                                isInLineage && isFilterMatch
                                  ? 1
                                  : isFilterMatch
                                  ? 0.3
                                  : 0.2,
                              y: 0,
                              scale:
                                selectedTaskId === task.id
                                  ? 1.02
                                  : highlightState
                                  ? 1.025
                                  : 1,
                              backgroundColor: targetBg,
                              borderColor: targetBorder,
                            }}
                            whileHover={{ y: -3 }}
                            transition={NODE_SPRING}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onClick={() =>
                              setSelectedTaskId((prev) =>
                                prev === task.id ? null : task.id
                              )
                            }
                            className={`relative p-4 rounded-xl border cursor-pointer transition-shadow space-y-2.5 ${
                              selectedTaskId === task.id
                                ? 'shadow-lg ring-2 ring-[#1E1B4B]/15'
                                : highlightState
                                ? 'shadow-md ring-2 ring-emerald-500/20'
                                : isOverdue
                                ? 'task-pulse-overdue hover:shadow-md'
                                : isBlocked && task.status !== 'Completed'
                                ? 'task-pulse-blocked hover:shadow-md'
                                : 'hover:shadow-md'
                            }`}
                          >
                            {/* Top Metadata Row */}
                            <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                              <span
                                className={
                                  isOverdue
                                    ? 'text-red-700 font-semibold'
                                    : 'text-slate-500'
                                }
                              >
                                {task.dueDate}
                                {isOverdue ? ' · Overdue' : ` · ${task.category}`}
                              </span>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.9 }}
                                animate={
                                  needsUrgentPulse
                                    ? { scale: [1, 1.07, 1] }
                                    : { scale: 1 }
                                }
                                transition={
                                  needsUrgentPulse
                                    ? {
                                        duration: 2.2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                      }
                                    : { duration: 0.2 }
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cycleTaskStatus(task);
                                }}
                                title="Click to cycle task status"
                                className={`inline-flex items-center gap-1 font-sans font-semibold transition-colors duration-200 ${
                                  task.status === 'Completed'
                                    ? 'text-[#059669]'
                                    : isOverdue
                                    ? 'text-red-600'
                                    : isBlocked
                                    ? 'text-amber-700'
                                    : 'text-[#1E1B4B]'
                                }`}
                              >
                                <AnimatePresence mode="wait" initial={false}>
                                  <motion.span
                                    key={`${task.status}-${
                                      isOverdue
                                        ? 'overdue'
                                        : isBlocked
                                        ? 'blocked'
                                        : 'open'
                                    }`}
                                    initial={{
                                      scale: 0.6,
                                      opacity: 0,
                                      rotate: -20,
                                    }}
                                    animate={{
                                      scale: 1,
                                      opacity: 1,
                                      rotate: 0,
                                    }}
                                    exit={{
                                      scale: 0.6,
                                      opacity: 0,
                                      rotate: 20,
                                    }}
                                    transition={{ duration: 0.16 }}
                                    className="inline-flex items-center gap-1"
                                  >
                                    {task.status === 'Completed' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : isOverdue ? (
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    ) : isBlocked ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5" />
                                    )}
                                    <span>{task.status}</span>
                                  </motion.span>
                                </AnimatePresence>
                              </motion.button>
                            </div>

                            {/* Task Title */}
                            <h4
                              className={`text-xs font-bold font-display leading-snug transition-colors duration-200 ${
                                task.status === 'Completed'
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </h4>

                            {/* Dependency Status Line with smooth crossfade */}
                            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                              <AnimatePresence mode="wait" initial={false}>
                                {prereq ? (
                                  <motion.div
                                    key={`${prereq.id}-${
                                      isBlocked ? 'blocked' : 'unlocked'
                                    }`}
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -3 }}
                                    transition={{ duration: 0.18 }}
                                    className={
                                      isBlocked
                                        ? 'text-amber-800 font-medium'
                                        : 'text-emerald-700 font-medium'
                                    }
                                  >
                                    {isBlocked
                                      ? `Blocked by: ${prereq.title.slice(
                                          0,
                                          28
                                        )}...`
                                      : `Unlocked by: ${prereq.title.slice(
                                          0,
                                          28
                                        )}...`}
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="root-prereq"
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -3 }}
                                    transition={{ duration: 0.18 }}
                                    className="text-slate-500"
                                  >
                                    Root task (No upstream blocker)
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="flex items-center justify-between text-slate-500 font-mono tabular-nums">
                                <span className="truncate max-w-[120px]">
                                  {task.assignee || 'Organizer'}
                                </span>
                                {directChildren.length > 0 && (
                                  <span
                                    className={
                                      task.status === 'Completed'
                                        ? 'text-emerald-700 font-semibold'
                                        : 'text-[#1E1B4B] font-semibold'
                                    }
                                  >
                                    {task.status === 'Completed'
                                      ? `Unlocks ${totalDownstream}`
                                      : `Blocks ${totalDownstream}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </LayoutGroup>

          {/* Interactive Selected Node Inspector Drawer */}
          <AnimatePresence>
            {selectedTask && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
                className="p-5 bg-[#FAF8F5] border border-slate-200 rounded-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      Selected Node Inspector · Due {selectedTask.dueDate} ·{' '}
                      {selectedTask.priority} Priority
                    </div>
                    <h4 className="text-base font-bold text-[#1E1B4B] font-display mt-0.5">
                      {selectedTask.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      disabled={isReadOnly}
                      value={selectedTask.dependsOnTaskId}
                      onChange={(e) =>
                        onUpdateTask({
                          ...selectedTask,
                          dependsOnTaskId: e.target.value,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="">No Prerequisite (Root Task)</option>
                      {tasks
                        .filter(
                          (cand) =>
                            cand.id !== selectedTask.id &&
                            !wouldCreateCycle(selectedTask.id, cand.id)
                        )
                        .map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            Depends on: {cand.title.slice(0, 36)}
                          </option>
                        ))}
                    </select>

                    <select
                      disabled={isReadOnly}
                      value={selectedTask.status}
                      onChange={(e) =>
                        onUpdateTask({
                          ...selectedTask,
                          status: e.target.value as PlanoraTask['status'],
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTask(selectedTask.id);
                          setSelectedTaskId(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-900">
                      Upstream Prerequisite:
                    </span>{' '}
                    {selectedTask.dependsOnTaskId &&
                    taskMap.has(selectedTask.dependsOnTaskId) ? (
                      <span className="text-slate-700">
                        “{taskMap.get(selectedTask.dependsOnTaskId)!.title}” (
                        {taskMap.get(selectedTask.dependsOnTaskId)!.status})
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        None — this task can start immediately.
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Directly Blocks (
                      {(childrenMap.get(selectedTask.id) || []).length}):
                    </span>{' '}
                    {(childrenMap.get(selectedTask.id) || []).length > 0 ? (
                      <span className="text-slate-700">
                        {(childrenMap.get(selectedTask.id) || [])
                          .map((c) => c.title)
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Terminal milestone — no downstream tasks waiting on this.
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* MODE 2: COLLAPSIBLE HIERARCHICAL DEPENDENCY TREE VIEW */}
      {subMode === 'tree' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
                Hierarchical Task Dependency Tree
              </h3>
              <p className="text-xs text-slate-500">
                Parent milestones expand to reveal every downstream task they unlock. Reassign prerequisites or toggle completion inline.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCollapsedNodes({})}
                className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => {
                  const allCollapsed: Record<string, boolean> = {};
                  tasks.forEach((t) => {
                    if ((childrenMap.get(t.id) || []).length > 0) {
                      allCollapsed[t.id] = true;
                    }
                  });
                  setCollapsedNodes(allCollapsed);
                }}
                className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium"
              >
                Collapse Branches
              </button>
            </div>
          </div>

          <LayoutGroup id="dependency-tree-canvas">
            <motion.div layout className="space-y-3">
              {rootTasks.map((root) => renderTreeNode(root, 0))}
            </motion.div>
          </LayoutGroup>
        </div>
      )}
    </div>
  );
};
