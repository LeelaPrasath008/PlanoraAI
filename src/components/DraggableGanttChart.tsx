import React, { useState, useMemo, useRef, useEffect, useCallback, useId } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  GripHorizontal,
  Flag,
} from 'lucide-react';
import { TimelineTask } from '../types/event';
import {
  analyzeTaskSchedule,
  wouldCreateDependencyCycle,
  autoResolveScheduleConflicts,
  inferLogicalDependencies,
} from '../utils/taskScheduler';
import {
  DAY_MS,
  TaskWindow,
  parseIsoDay,
  formatIsoDay,
  formatShortLabel,
  addDaysIso,
  computeTaskWindow,
} from '../utils/ganttMath';
import { GanttToolbar } from './gantt/GanttToolbar';
import { GanttInspector } from './gantt/GanttInspector';

export interface DraggableGanttChartProps {
  tasks: TimelineTask[];
  eventDate: string;
  onUpdateTasks: (updatedTasks: TimelineTask[]) => void;
  onToggleTaskStatus: (taskId: string) => void;
}

type DragInteractionMode = 'move' | 'resize-start' | 'resize-end';

interface ActiveDragState {
  taskId: string;
  mode: DragInteractionMode;
  initialClientX: number;
  originStartMs: number;
  originEndMs: number;
  originDurationDays: number;
  currentDeltaDays: number;
}

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 54;

/**
 * Interactive & Keyboard-Accessible Draggable Gantt Chart.
 * Supports pointer dragging, resize handles, dependency connector ports,
 * and keyboard operability (`ArrowLeft`/`ArrowRight` to move ±1 day,
 * `Shift+ArrowLeft`/`Shift+ArrowRight` to resize duration ±1 day) with live screen-reader announcements.
 */
export const DraggableGanttChart: React.FC<DraggableGanttChartProps> = ({
  tasks,
  eventDate,
  onUpdateTasks,
  onToggleTaskStatus,
}) => {
  const svgUid = useId();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [cascadeDependents, setCascadeDependents] = useState<boolean>(true);
  const [linkingFromTaskId, setLinkingFromTaskId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'compact' | 'comfortable' | 'detailed'>('comfortable');
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    tone: 'info' | 'warning' | 'success';
  } | null>(null);

  const timelineTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackToast) return;
    const timer = window.setTimeout(() => setFeedbackToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedbackToast]);

  const diagnostics = useMemo(() => analyzeTaskSchedule(tasks), [tasks]);

  const sortedTasks = useMemo(() => {
    const orderMap = new Map<string, number>();
    diagnostics.topologicalOrder.forEach((id, index) => orderMap.set(id, index));
    return [...tasks].sort((a, b) => {
      const idxA = orderMap.get(a.id) ?? 999;
      const idxB = orderMap.get(b.id) ?? 999;
      if (idxA !== idxB) return idxA - idxB;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, diagnostics.topologicalOrder]);

  const previewOverrides = useMemo(() => {
    const map = new Map<string, { dueDate: string; durationDays: number }>();
    if (!activeDrag) return map;
    const { taskId, mode, originStartMs, originEndMs, originDurationDays, currentDeltaDays } = activeDrag;

    if (mode === 'move') {
      const newEndMs = originEndMs + currentDeltaDays * DAY_MS;
      map.set(taskId, { dueDate: formatIsoDay(newEndMs), durationDays: originDurationDays });
      if (cascadeDependents && currentDeltaDays !== 0) {
        const descendants = new Set<string>();
        const queue = [taskId];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          for (const t of tasks) {
            if (t.dependsOnTaskId === curr && !descendants.has(t.id)) {
              descendants.add(t.id);
              queue.push(t.id);
            }
          }
        }
        for (const descId of descendants) {
          const descTask = tasks.find((t) => t.id === descId);
          if (descTask) {
            const w = computeTaskWindow(descTask, eventDate);
            map.set(descId, {
              dueDate: formatIsoDay(w.endMs + currentDeltaDays * DAY_MS),
              durationDays: w.durationDays,
            });
          }
        }
      }
    } else if (mode === 'resize-end') {
      const newDuration = Math.max(1, Math.min(90, originDurationDays + currentDeltaDays));
      const newEndMs = originStartMs + (newDuration - 1) * DAY_MS;
      map.set(taskId, { dueDate: formatIsoDay(newEndMs), durationDays: newDuration });
    } else if (mode === 'resize-start') {
      const newDuration = Math.max(1, Math.min(90, originDurationDays - currentDeltaDays));
      map.set(taskId, { dueDate: formatIsoDay(originEndMs), durationDays: newDuration });
    }
    return map;
  }, [activeDrag, cascadeDependents, tasks, eventDate]);

  const taskWindows: TaskWindow[] = useMemo(
    () => sortedTasks.map((t) => computeTaskWindow(t, eventDate, previewOverrides.get(t.id))),
    [sortedTasks, eventDate, previewOverrides]
  );

  const windowById = useMemo(() => {
    const map = new Map<string, TaskWindow>();
    taskWindows.forEach((w) => map.set(w.task.id, w));
    return map;
  }, [taskWindows]);

  const timelineBounds = useMemo(() => {
    const eventMs = parseIsoDay(eventDate);
    if (taskWindows.length === 0) {
      const minMs = eventMs - 30 * DAY_MS;
      const maxMs = eventMs + 7 * DAY_MS;
      return { minMs, maxMs, totalDays: 38, eventMs };
    }
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const w of taskWindows) {
      if (w.startMs < minMs) minMs = w.startMs;
      if (w.endMs > maxMs) maxMs = w.endMs;
    }
    if (!Number.isNaN(eventMs)) {
      if (eventMs < minMs) minMs = eventMs;
      if (eventMs > maxMs) maxMs = eventMs;
    }
    const padBeforeDays = zoomLevel === 'compact' ? 6 : 4;
    const padAfterDays = zoomLevel === 'compact' ? 8 : 5;
    const paddedMinMs = minMs - padBeforeDays * DAY_MS;
    const paddedMaxMs = maxMs + padAfterDays * DAY_MS;
    const totalDays = Math.max(14, Math.round((paddedMaxMs - paddedMinMs) / DAY_MS) + 1);
    return { minMs: paddedMinMs, maxMs: paddedMinMs + totalDays * DAY_MS, totalDays, eventMs };
  }, [taskWindows, eventDate, zoomLevel]);

  const dateTicks = useMemo(() => {
    const { minMs, totalDays } = timelineBounds;
    const stepDays = totalDays > 120 ? 14 : totalDays > 60 ? 7 : totalDays > 28 ? 4 : 2;
    const ticks: Array<{ ms: number; label: string; iso: string; percentLeft: number }> = [];
    for (let d = 0; d <= totalDays; d += stepDays) {
      const ms = minMs + d * DAY_MS;
      ticks.push({ ms, label: formatShortLabel(ms), iso: formatIsoDay(ms), percentLeft: (d / totalDays) * 100 });
    }
    return ticks;
  }, [timelineBounds]);

  const getLeftPercent = useCallback(
    (ms: number) => Math.max(0, Math.min(100, ((ms - timelineBounds.minMs) / (timelineBounds.totalDays * DAY_MS)) * 100)),
    [timelineBounds]
  );

  const getWidthPercent = useCallback(
    (durationDays: number) => Math.max(1.8, Math.min(100, (durationDays / timelineBounds.totalDays) * 100)),
    [timelineBounds]
  );

  const startBarDrag = (e: React.PointerEvent, windowItem: TaskWindow, mode: DragInteractionMode) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTaskId(windowItem.task.id);
    setActiveDrag({
      taskId: windowItem.task.id,
      mode,
      initialClientX: e.clientX,
      originStartMs: windowItem.startMs,
      originEndMs: windowItem.endMs,
      originDurationDays: windowItem.durationDays,
      currentDeltaDays: 0,
    });
  };

  useEffect(() => {
    if (!activeDrag) return;
    const handlePointerMove = (e: PointerEvent) => {
      const trackEl = timelineTrackRef.current;
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      const pxPerDay = Math.max(4, rect.width / timelineBounds.totalDays);
      const deltaDays = Math.round((e.clientX - activeDrag.initialClientX) / pxPerDay);
      setActiveDrag((prev) => (prev && prev.currentDeltaDays !== deltaDays ? { ...prev, currentDeltaDays: deltaDays } : prev));
    };
    const handlePointerUp = () => {
      if (activeDrag.currentDeltaDays !== 0) {
        const updated = tasks.map((t) => {
          const override = previewOverrides.get(t.id);
          return override ? { ...t, dueDate: override.dueDate, durationDays: override.durationDays } : t;
        });
        onUpdateTasks(updated);
        const edited = previewOverrides.get(activeDrag.taskId);
        if (edited) {
          const msg = `Updated task schedule: Due ${edited.dueDate} (${edited.durationDays}d duration)`;
          setLiveAnnouncement(msg);
          setFeedbackToast({ message: msg, tone: 'success' });
        }
      }
      setActiveDrag(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, timelineBounds.totalDays, tasks, previewOverrides, onUpdateTasks]);

  const handleBarKeyDown = (e: React.KeyboardEvent, w: TaskWindow) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) {
        const nextDur = Math.max(1, Math.min(90, w.durationDays + delta));
        const nextEndIso = formatIsoDay(w.startMs + (nextDur - 1) * DAY_MS);
        onUpdateTasks(
          tasks.map((t) => (t.id === w.task.id ? { ...t, durationDays: nextDur, dueDate: nextEndIso } : t))
        );
        const msg = `${w.task.title} duration resized to ${nextDur} days, due ${nextEndIso}.`;
        setLiveAnnouncement(msg);
        setFeedbackToast({ message: msg, tone: 'info' });
      } else {
        const nextDueIso = addDaysIso(w.endIso, delta, eventDate);
        onUpdateTasks(tasks.map((t) => (t.id === w.task.id ? { ...t, dueDate: nextDueIso } : t)));
        const msg = `${w.task.title} moved to due date ${nextDueIso}.`;
        setLiveAnnouncement(msg);
        setFeedbackToast({ message: msg, tone: 'info' });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedTaskId(w.task.id);
    }
  };

  const handleCompleteDependencyLink = (targetTaskId: string) => {
    if (!linkingFromTaskId) return;
    if (linkingFromTaskId === targetTaskId) {
      setLinkingFromTaskId(null);
      return;
    }
    if (wouldCreateDependencyCycle(tasks, targetTaskId, linkingFromTaskId)) {
      setFeedbackToast({ message: 'Cannot create circular dependency chain.', tone: 'warning' });
      setLinkingFromTaskId(null);
      return;
    }
    onUpdateTasks(tasks.map((t) => (t.id === targetTaskId ? { ...t, dependsOnTaskId: linkingFromTaskId } : t)));
    setFeedbackToast({ message: 'Dependency linked on Gantt timeline.', tone: 'success' });
    setLinkingFromTaskId(null);
  };

  const selectedWindow = selectedTaskId ? windowById.get(selectedTaskId) : undefined;
  const minTrackWidthClass =
    zoomLevel === 'detailed' ? 'min-w-[980px]' : zoomLevel === 'comfortable' ? 'min-w-[740px]' : 'min-w-[540px]';
  const eventMarkerPercent = !Number.isNaN(timelineBounds.eventMs) ? getLeftPercent(timelineBounds.eventMs) : null;
  const unlinkedCount = tasks.filter((t) => !t.dependsOnTaskId).length > 1 ? tasks.filter((t) => !t.dependsOnTaskId).length - 1 : 0;

  return (
    <div className="space-y-4">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <GanttToolbar
        taskCount={tasks.length}
        conflictCount={diagnostics.scheduleConflictIds.size}
        criticalCount={diagnostics.criticalPathIds.size}
        unlinkedCount={unlinkedCount}
        cascadeDependents={cascadeDependents}
        onToggleCascade={() => setCascadeDependents((v) => !v)}
        onAutoLink={() => {
          onUpdateTasks(inferLogicalDependencies(tasks));
          setFeedbackToast({ message: 'Connected tasks into chronological dependency chain.', tone: 'success' });
        }}
        onAutoFixOverlaps={() => {
          const { updatedTasks, adjustedCount } = autoResolveScheduleConflicts(tasks, 3);
          onUpdateTasks(updatedTasks);
          setFeedbackToast({ message: `Auto-shifted ${adjustedCount} dependent task(s).`, tone: 'success' });
        }}
        zoomLevel={zoomLevel}
        onCycleZoom={() =>
          setZoomLevel((z) => (z === 'compact' ? 'comfortable' : z === 'comfortable' ? 'detailed' : 'compact'))
        }
        linkingFromTaskId={linkingFromTaskId}
        linkingFromTaskTitle={windowById.get(linkingFromTaskId || '')?.task.title}
        onCancelLinking={() => setLinkingFromTaskId(null)}
        feedbackToast={feedbackToast}
        tasks={tasks}
      />

      <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Sticky Task Column */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E6DFD3] bg-[#FAF7F2]/60">
            <div
              className="px-4 border-b border-[#E6DFD3] flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#6E655A]"
              style={{ height: HEADER_HEIGHT }}
            >
              <span>Task &amp; Status</span>
              <span>Window / Duration</span>
            </div>
            <div className="divide-y divide-[#E6DFD3]">
              {taskWindows.map((w) => {
                const { task, durationDays, startIso, endIso } = w;
                const isSelected = selectedTaskId === task.id;
                const isOverdue = diagnostics.overdueTaskIds.has(task.id);
                const isBlocked = diagnostics.blockedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTaskId(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTaskId(task.id);
                      }
                    }}
                    style={{ height: ROW_HEIGHT }}
                    className={`px-4 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#B8860B]/10' : 'hover:bg-[#F3EFE6]/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTaskStatus(task.id);
                        }}
                        aria-label={`Cycle status for ${task.title}, current status ${task.status}`}
                        className="shrink-0 p-1 rounded hover:bg-white/50 min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        {task.status === 'Done' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#34D399]" aria-hidden="true" />
                        ) : task.status === 'In Progress' ? (
                          <Clock className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#CBD5E1]" aria-hidden="true" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              task.status === 'Done' ? 'line-through text-[#94A3B8]' : 'text-[#1F1C18]'
                            }`}
                          >
                            {task.title}
                          </span>
                          {(isOverdue || isBlocked) && (
                            <span className="px-1.5 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171] text-xs font-bold shrink-0">
                              {isOverdue ? 'Overdue' : 'Blocked'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#6E655A] truncate block">
                          {task.category} · {task.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold text-[#1F1C18] block">
                        {durationDays}d
                      </span>
                      <span className="font-mono text-xs text-[#6E655A] block">
                        {startIso.slice(5)} → {endIso.slice(5)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Scrollable Timeline Canvas */}
          <div className="lg:col-span-8 overflow-x-auto">
            <div ref={timelineTrackRef} className={`relative ${minTrackWidthClass} select-none`}>
              {/* Date Axis Header */}
              <div className="relative border-b border-[#E6DFD3] bg-[#F3EFE6]/50" style={{ height: HEADER_HEIGHT }}>
                {dateTicks.map((tick) => (
                  <div
                    key={tick.iso}
                    className="absolute top-0 bottom-0 border-l border-[#E6DFD3]/70 pl-1.5 pt-2 flex flex-col justify-between pb-1.5 pointer-events-none"
                    style={{ left: `${tick.percentLeft}%` }}
                  >
                    <span className="text-xs font-mono font-semibold text-[#6E655A] whitespace-nowrap">
                      {tick.label}
                    </span>
                    <span className="text-xs font-mono text-[#94A3B8] whitespace-nowrap">
                      {tick.iso.slice(5)}
                    </span>
                  </div>
                ))}
                {eventMarkerPercent !== null && (
                  <div
                    className="absolute top-1 z-20 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#1F1C18] text-[#FAF7F2] text-xs font-mono font-semibold flex items-center gap-1 shadow-xs"
                    style={{ left: `${eventMarkerPercent}%` }}
                  >
                    <Flag className="w-3 h-3 text-[#B8860B]" aria-hidden="true" /> Event: {eventDate}
                  </div>
                )}
              </div>

              {/* Rows + SVG Dependency Arrows */}
              <div className="relative" style={{ height: taskWindows.length * ROW_HEIGHT }}>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox={`0 0 1000 ${Math.max(1, taskWindows.length * ROW_HEIGHT)}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <marker id={`${svgUid}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
                    </marker>
                  </defs>
                  {taskWindows.map((childWindow, childIdx) => {
                    const parentId = childWindow.task.dependsOnTaskId;
                    if (!parentId) return null;
                    const parentIdx = taskWindows.findIndex((w) => w.task.id === parentId);
                    if (parentIdx === -1) return null;
                    const parentWindow = taskWindows[parentIdx];
                    const startX = (getLeftPercent(parentWindow.startMs) + getWidthPercent(parentWindow.durationDays)) * 10;
                    const startY = parentIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const endX = getLeftPercent(childWindow.startMs) * 10;
                    const endY = childIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const midX = (startX + endX) / 2;
                    return (
                      <path
                        key={`${parentId}->${childWindow.task.id}`}
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth={1.75}
                        markerEnd={`url(#${svgUid}-arrow)`}
                      />
                    );
                  })}
                </svg>

                {/* Task Bars */}
                {taskWindows.map((w) => {
                  const { task, durationDays, startMs, startIso, endIso } = w;
                  const leftPct = getLeftPercent(startMs);
                  const widthPct = getWidthPercent(durationDays);
                  const isOverdue = diagnostics.overdueTaskIds.has(task.id);
                  const isBlocked = diagnostics.blockedTaskIds.has(task.id);
                  const isConflict = diagnostics.scheduleConflictIds.has(task.id);
                  const isUrgent = isOverdue || isBlocked || isConflict;

                  const barStyle =
                    task.status === 'Done'
                      ? 'bg-[#2E5A44] text-white border-[#2E5A44]'
                      : isUrgent
                      ? 'bg-[#A63A2B] text-white border-[#7D281C]'
                      : task.status === 'In Progress'
                      ? 'bg-[#B8860B] text-white border-[#956B07]'
                      : 'bg-[#1F1C18] text-[#FAF7F2] border-[#1F1C18]';

                  const statusTag =
                    task.status === 'Done'
                      ? '[Done]'
                      : isOverdue
                      ? '[Overdue]'
                      : isBlocked
                      ? '[Blocked]'
                      : task.status === 'In Progress'
                      ? '[Active]'
                      : '[Todo]';

                  return (
                    <div
                      key={task.id}
                      style={{ height: ROW_HEIGHT }}
                      className="relative border-b border-[#E6DFD3]/70 flex items-center"
                    >
                      <motion.div
                        layout="position"
                        role="slider"
                        tabIndex={0}
                        aria-label={`${task.title} schedule bar (${statusTag})`}
                        aria-valuemin={1}
                        aria-valuemax={90}
                        aria-valuenow={durationDays}
                        aria-valuetext={`Status ${task.status}, starts ${startIso}, due ${endIso}, duration ${durationDays} days`}
                        onKeyDown={(e) => handleBarKeyDown(e, w)}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId((prev) => (prev === task.id ? null : prev))}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (linkingFromTaskId) {
                            handleCompleteDependencyLink(task.id);
                          } else {
                            setSelectedTaskId(task.id);
                          }
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          minWidth: '88px',
                        }}
                        className={`absolute h-9 rounded-xl border shadow-xs flex items-center justify-between px-2.5 group z-20 cursor-grab active:cursor-grabbing ${barStyle}`}
                      >
                        <div
                          onPointerDown={(e) => startBarDrag(e, w, 'resize-start')}
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-l-xl hover:bg-black/20"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (linkingFromTaskId) handleCompleteDependencyLink(task.id);
                          }}
                          aria-label={`Link dependency into ${task.title}`}
                          className=" -ml-4 w-5 h-5 rounded-full border-2 border-white bg-[#6E655A] hover:bg-[#34D399] transition-all shrink-0 flex items-center justify-center"
                        />
                        <div
                          onPointerDown={(e) => startBarDrag(e, w, 'move')}
                          className="flex-1 flex items-center justify-between gap-1.5 overflow-hidden px-1.5"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <GripHorizontal className="w-3.5 h-3.5 opacity-75 shrink-0" aria-hidden="true" />
                            {isUrgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                            <span className="text-xs font-semibold truncate">
                              {statusTag} {task.title}
                            </span>
                          </div>
                          <span className="text-xs font-mono opacity-95 shrink-0 hidden sm:inline">
                            {durationDays}d
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkingFromTaskId((prev) => (prev === task.id ? null : task.id));
                          }}
                          aria-label={`Start dependency link from ${task.title}`}
                          className="-mr-4 w-5 h-5 rounded-full border-2 border-white bg-[#1F1C18] hover:bg-[#B8860B] transition-all shrink-0 flex items-center justify-center"
                        />
                        <div
                          onPointerDown={(e) => startBarDrag(e, w, 'resize-end')}
                          aria-hidden="true"
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-r-xl hover:bg-black/20"
                        />
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedWindow && (
        <GanttInspector
          selectedWindow={selectedWindow}
          allWindows={taskWindows}
          tasks={tasks}
          diagnostics={diagnostics}
          eventDate={eventDate}
          onToggleTaskStatus={onToggleTaskStatus}
          onUpdateDuration={(taskId, durationDays) => {
            const w = windowById.get(taskId);
            if (!w) return;
            const newEndIso = formatIsoDay(w.startMs + (durationDays - 1) * DAY_MS);
            onUpdateTasks(tasks.map((t) => (t.id === taskId ? { ...t, durationDays, dueDate: newEndIso } : t)));
          }}
          onUpdateDueDate={(taskId, dueDate) => {
            onUpdateTasks(tasks.map((t) => (t.id === taskId ? { ...t, dueDate } : t)));
          }}
          onUpdateDependency={(taskId, parentId) => {
            if (parentId && wouldCreateDependencyCycle(tasks, taskId, parentId)) {
              setFeedbackToast({ message: 'Circular dependency prevented.', tone: 'warning' });
              return;
            }
            onUpdateTasks(tasks.map((t) => (t.id === taskId ? { ...t, dependsOnTaskId: parentId } : t)));
          }}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
      {hoveredTaskId && <span className="sr-only">Hovered task ID: {hoveredTaskId}</span>}
    </div>
  );
};
