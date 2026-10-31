import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Link2,
  Unlink,
  ArrowRight,
  GripHorizontal,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { PlanoraTask } from '../types/event';
import {
  wouldCreateCycle as checkCycle,
  resolveScheduleOverlaps,
} from '../utils/taskScheduler';

interface DraggableGanttChartProps {
  tasks: PlanoraTask[];
  eventDate: string;
  isReadOnly: boolean;
  onUpdateTask: (updated: PlanoraTask) => Promise<void> | void;
  onBatchUpdateTasks?: (updatedList: PlanoraTask[]) => Promise<void> | void;
}

const DAY_MS = 86400000;

function parseDateMs(dateStr: string): number {
  const ms = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function formatDateYMD(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const ms = parseDateMs(dateStr);
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getTaskDuration(task: PlanoraTask): number {
  const raw = Number(task.durationDays);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(180, Math.round(raw));
  }
  return 7;
}

function getTaskStartMs(task: PlanoraTask): number {
  const dueMs = parseDateMs(task.dueDate);
  const dur = getTaskDuration(task);
  return dueMs - (dur - 1) * DAY_MS;
}

type DragInteraction =
  | {
      type: 'move' | 'resize-start' | 'resize-end';
      taskId: string;
      startX: number;
      initialDueMs: number;
      initialDuration: number;
      currentDeltaDays: number;
    }
  | {
      type: 'connect';
      fromTaskId: string;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      hoveredTargetId: string | null;
    };

export const DraggableGanttChart: React.FC<DraggableGanttChartProps> = React.memo(
  ({
    tasks,
    eventDate,
    isReadOnly,
    onUpdateTask,
    onBatchUpdateTasks,
  }) => {
    const [zoomLevel, setZoomLevel] = useState<'fit' | 'comfortable' | 'detailed'>('comfortable');
  const [sortBy, setSortBy] = useState<'start' | 'chain' | 'due'>('chain');
  const [autoCascadeDependents, setAutoCascadeDependents] = useState<boolean>(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    tasks[0]?.id || null
  );
  const [dragState, setDragState] = useState<DragInteraction | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const ganttCanvasRef = useRef<HTMLDivElement | null>(null);
  const [trackWidthPx, setTrackWidthPx] = useState<number>(760);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Measure track width for accurate pixel-to-day conversion
  const updateTrackWidth = useCallback(() => {
    if (timelineTrackRef.current) {
      setTrackWidthPx(Math.max(320, timelineTrackRef.current.clientWidth));
    }
  }, []);

  useEffect(() => {
    updateTrackWidth();
    window.addEventListener('resize', updateTrackWidth);
    return () => window.removeEventListener('resize', updateTrackWidth);
  }, [updateTrackWidth, zoomLevel, tasks.length]);

  const taskById = useMemo(() => {
    const map = new Map<string, PlanoraTask>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  // Cycle check: would making `targetTaskId` depend on `candidatePrereqId` create a cycle?
  const wouldCreateCycle = useCallback(
    (targetTaskId: string, candidatePrereqId: string): boolean =>
      checkCycle(tasks, targetTaskId, candidatePrereqId),
    [tasks]
  );

  // Compute topological depth for chain sorting
  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const getDepth = (id: string, visited = new Set<string>()): number => {
      if (map.has(id)) return map.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const t = taskById.get(id);
      if (!t || !t.dependsOnTaskId || !taskById.has(t.dependsOnTaskId)) {
        map.set(id, 0);
        return 0;
      }
      const d = 1 + getDepth(t.dependsOnTaskId, visited);
      map.set(id, d);
      return d;
    };
    tasks.forEach((t) => getDepth(t.id));
    return map;
  }, [tasks, taskById]);

  // Sorted tasks for rows
  const orderedTasks = useMemo(() => {
    const copy = [...tasks];
    if (sortBy === 'start') {
      return copy.sort((a, b) => getTaskStartMs(a) - getTaskStartMs(b));
    }
    if (sortBy === 'due') {
      return copy.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    // 'chain': sort by topological depth first, then start date
    return copy.sort((a, b) => {
      const da = depthMap.get(a.id) ?? 0;
      const db = depthMap.get(b.id) ?? 0;
      if (da !== db) return da - db;
      return getTaskStartMs(a) - getTaskStartMs(b);
    });
  }, [tasks, sortBy, depthMap]);

  // Compute overall timeline window [minTimelineMs, maxTimelineMs]
  const timelineBounds = useMemo(() => {
    const eventMs = parseDateMs(eventDate);
    if (tasks.length === 0) {
      const minMs = eventMs - 30 * DAY_MS;
      return {
        minMs,
        maxMs: eventMs + 2 * DAY_MS,
        totalDays: 32,
        eventMs,
      };
    }

    let earliestStartMs = eventMs;
    let latestDueMs = eventMs;

    tasks.forEach((t) => {
      const sMs = getTaskStartMs(t);
      const dMs = parseDateMs(t.dueDate);
      if (sMs < earliestStartMs) earliestStartMs = sMs;
      if (dMs > latestDueMs) latestDueMs = dMs;
    });

    const paddedMinMs = earliestStartMs - 5 * DAY_MS;
    const paddedMaxMs = Math.max(eventMs, latestDueMs) + 3 * DAY_MS;
    const totalDays = Math.max(
      14,
      Math.round((paddedMaxMs - paddedMinMs) / DAY_MS)
    );

    return {
      minMs: paddedMinMs,
      maxMs: paddedMinMs + totalDays * DAY_MS,
      totalDays,
      eventMs,
    };
  }, [tasks, eventDate]);

  // Compute effective preview task state while dragging
  const getEffectiveTaskWindow = useCallback(
    (task: PlanoraTask) => {
      const baseDueMs = parseDateMs(task.dueDate);
      const baseDuration = getTaskDuration(task);
      const eventMaxMs = parseDateMs(eventDate);

      if (
        !dragState ||
        dragState.type === 'connect' ||
        dragState.taskId !== task.id
      ) {
        const startMs = baseDueMs - (baseDuration - 1) * DAY_MS;
        return {
          startMs,
          dueMs: baseDueMs,
          durationDays: baseDuration,
          startDateStr: formatDateYMD(startMs),
          dueDateStr: task.dueDate,
          isDraggingThis: false,
        };
      }

      const delta = dragState.currentDeltaDays;
      if (dragState.type === 'move') {
        const clampedDueMs = Math.min(
          eventMaxMs,
          dragState.initialDueMs + delta * DAY_MS
        );
        const startMs = clampedDueMs - (dragState.initialDuration - 1) * DAY_MS;
        return {
          startMs,
          dueMs: clampedDueMs,
          durationDays: dragState.initialDuration,
          startDateStr: formatDateYMD(startMs),
          dueDateStr: formatDateYMD(clampedDueMs),
          isDraggingThis: true,
        };
      }

      if (dragState.type === 'resize-start') {
        // Keep dueMs anchored, change durationDays by -delta
        const newDuration = Math.max(
          1,
          Math.min(180, dragState.initialDuration - delta)
        );
        const startMs = dragState.initialDueMs - (newDuration - 1) * DAY_MS;
        return {
          startMs,
          dueMs: dragState.initialDueMs,
          durationDays: newDuration,
          startDateStr: formatDateYMD(startMs),
          dueDateStr: formatDateYMD(dragState.initialDueMs),
          isDraggingThis: true,
        };
      }

      // resize-end: anchor startMs, change both durationDays and dueMs
      const initialStartMs =
        dragState.initialDueMs - (dragState.initialDuration - 1) * DAY_MS;
      const maxAllowedDuration = Math.max(
        1,
        Math.round((eventMaxMs - initialStartMs) / DAY_MS) + 1
      );
      const newDuration = Math.max(
        1,
        Math.min(180, maxAllowedDuration, dragState.initialDuration + delta)
      );
      const newDueMs = initialStartMs + (newDuration - 1) * DAY_MS;
      return {
        startMs: initialStartMs,
        dueMs: newDueMs,
        durationDays: newDuration,
        startDateStr: formatDateYMD(initialStartMs),
        dueDateStr: formatDateYMD(newDueMs),
        isDraggingThis: true,
      };
    },
    [dragState, eventDate]
  );

  // Convert a timestamp to percentage [0..100] along the timeline track
  const msToPercent = useCallback(
    (ms: number): number => {
      const span = Math.max(DAY_MS, timelineBounds.maxMs - timelineBounds.minMs);
      const raw = ((ms - timelineBounds.minMs) / span) * 100;
      return Math.max(0, Math.min(100, raw));
    },
    [timelineBounds]
  );

  // Generate tick marks for the timeline header
  const timelineTicks = useMemo(() => {
    const ticks: Array<{ ms: number; label: string; subLabel: string }> = [];
    const tickCount = zoomLevel === 'detailed' ? 12 : zoomLevel === 'comfortable' ? 9 : 7;
    const stepMs = (timelineBounds.maxMs - timelineBounds.minMs) / tickCount;

    for (let i = 0; i <= tickCount; i++) {
      const ms = timelineBounds.minMs + i * stepMs;
      const d = new Date(ms);
      ticks.push({
        ms,
        label: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
        subLabel: d.toLocaleDateString('en-US', {
          year: '2-digit',
          timeZone: 'UTC',
        }),
      });
    }
    return ticks;
  }, [timelineBounds, zoomLevel]);

  // Handle global pointer move & up when dragging a bar or connector
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (dragState.type === 'connect') {
        const canvasRect = ganttCanvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const currentX = e.clientX - canvasRect.left;
        const currentY = e.clientY - canvasRect.top;

        // Find if pointer is hovering over a task row
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const rowEl = el?.closest('[data-gantt-task-id]') as HTMLElement | null;
        const targetId = rowEl?.getAttribute('data-gantt-task-id') || null;

        setDragState((prev) =>
          prev && prev.type === 'connect'
            ? {
                ...prev,
                currentX,
                currentY,
                hoveredTargetId:
                  targetId && targetId !== prev.fromTaskId ? targetId : null,
              }
            : prev
        );
        return;
      }

      // Bar move or resize
      const pxPerDay = Math.max(
        2,
        trackWidthPx / Math.max(1, timelineBounds.totalDays)
      );
      const deltaPx = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaPx / pxPerDay);

      setDragState((prev) =>
        prev && prev.type !== 'connect'
          ? { ...prev, currentDeltaDays: deltaDays }
          : prev
      );
    };

    const handlePointerUp = async () => {
      if (!dragState) return;

      if (dragState.type === 'connect') {
        const { fromTaskId, hoveredTargetId } = dragState;
        setDragState(null);
        if (hoveredTargetId && hoveredTargetId !== fromTaskId) {
          const targetTask = taskById.get(hoveredTargetId);
          const sourceTask = taskById.get(fromTaskId);
          if (targetTask && sourceTask) {
            if (wouldCreateCycle(targetTask.id, sourceTask.id)) {
              setToastBanner(
                `Cannot link "${sourceTask.title}" → "${targetTask.title}" because it would create a circular dependency.`
              );
              setTimeout(() => setToastBanner(null), 4000);
              return;
            }
            const updatedTarget: PlanoraTask = {
              ...targetTask,
              dependsOnTaskId: sourceTask.id,
            };
            await onUpdateTask(updatedTarget);
            setSelectedTaskId(targetTask.id);
            setToastBanner(
              `Linked dependency: "${targetTask.title}" now depends on "${sourceTask.title}".`
            );
            setTimeout(() => setToastBanner(null), 3500);
          }
        }
        return;
      }

      // Commit move / resize
      const task = taskById.get(dragState.taskId);
      if (!task) {
        setDragState(null);
        return;
      }

      const preview = getEffectiveTaskWindow(task);
      setDragState(null);

      if (
        preview.dueDateStr === task.dueDate &&
        preview.durationDays === getTaskDuration(task)
      ) {
        return;
      }

      const updatedPrimary: PlanoraTask = {
        ...task,
        dueDate: preview.dueDateStr,
        durationDays: preview.durationDays,
      };

      // Check if we should cascade-shift downstream dependents when moving/extending dueDate
      if (autoCascadeDependents && onBatchUpdateTasks) {
        const eventMaxMs = parseDateMs(eventDate);
        const taskMap = new Map<string, PlanoraTask>();
        tasks.forEach((t) =>
          taskMap.set(t.id, t.id === updatedPrimary.id ? updatedPrimary : t)
        );

        let cascadedCount = 0;
        // Propagate forward through topological levels
        for (let pass = 0; pass < tasks.length; pass++) {
          let changedInPass = false;
          for (const candidate of taskMap.values()) {
            if (!candidate.dependsOnTaskId) continue;
            const parent = taskMap.get(candidate.dependsOnTaskId);
            if (!parent) continue;

            const parentDueMs = parseDateMs(parent.dueDate);
            const candDuration = getTaskDuration(candidate);
            const candStartMs = getTaskStartMs(candidate);

            // If dependent starts before parent finishes, shift dependent so it starts the day after parent finishes
            if (candStartMs < parentDueMs) {
              const desiredStartMs = parentDueMs + DAY_MS;
              const desiredDueMs = Math.min(
                eventMaxMs,
                desiredStartMs + (candDuration - 1) * DAY_MS
              );
              const newDueStr = formatDateYMD(desiredDueMs);
              if (newDueStr !== candidate.dueDate) {
                taskMap.set(candidate.id, {
                  ...candidate,
                  dueDate: newDueStr,
                  durationDays: candDuration,
                });
                changedInPass = true;
                cascadedCount++;
              }
            }
          }
          if (!changedInPass) break;
        }

        if (cascadedCount > 0) {
          await onBatchUpdateTasks(Array.from(taskMap.values()));
          setToastBanner(
            `Updated "${updatedPrimary.title}" (${preview.durationDays}d) and auto-shifted ${cascadedCount} downstream dependent task${
              cascadedCount > 1 ? 's' : ''
            }.`
          );
          setTimeout(() => setToastBanner(null), 4000);
          return;
        }
      }

      await onUpdateTask(updatedPrimary);
      setToastBanner(
        `Updated "${updatedPrimary.title}": ${formatShortDate(
          preview.startDateStr
        )} → ${formatShortDate(preview.dueDateStr)} (${preview.durationDays} days)`
      );
      setTimeout(() => setToastBanner(null), 3200);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    dragState,
    trackWidthPx,
    timelineBounds.totalDays,
    taskById,
    wouldCreateCycle,
    getEffectiveTaskWindow,
    autoCascadeDependents,
    onBatchUpdateTasks,
    onUpdateTask,
    eventDate,
    tasks,
  ]);

  // Detect any schedule overlaps (where a dependent task starts before its prerequisite finishes)
  const scheduleOverlaps = useMemo(() => {
    const list: Array<{ task: PlanoraTask; prereq: PlanoraTask }> = [];
    tasks.forEach((t) => {
      if (!t.dependsOnTaskId) return;
      const prereq = taskById.get(t.dependsOnTaskId);
      if (!prereq) return;
      const tStart = getTaskStartMs(t);
      const pDue = parseDateMs(prereq.dueDate);
      if (tStart < pDue) {
        list.push({ task: t, prereq });
      }
    });
    return list;
  }, [tasks, taskById]);

  // Auto-resolve all schedule overlaps with 1 click
  const handleResolveOverlaps = async () => {
    if (isReadOnly || scheduleOverlaps.length === 0) return;
    const { updatedTasks } = resolveScheduleOverlaps(tasks, eventDate);

    if (onBatchUpdateTasks) {
      await onBatchUpdateTasks(updatedTasks);
    } else {
      await Promise.all(updatedTasks.map((u) => onUpdateTask(u)));
    }
    setToastBanner(
      'Aligned dependent task start dates to follow their upstream prerequisites.'
    );
    setTimeout(() => setToastBanner(null), 3500);
  };

  const selectedTask = useMemo(
    () => (selectedTaskId ? taskById.get(selectedTaskId) || null : null),
    [selectedTaskId, taskById]
  );

  const ROW_HEIGHT = 60;
  const HEADER_HEIGHT = 52;
  const LEFT_COL_WIDTH = 280;

  const minTrackMinWidth =
    zoomLevel === 'detailed'
      ? 'min-w-[1150px]'
      : zoomLevel === 'comfortable'
      ? 'min-w-[860px]'
      : 'min-w-[640px]';

  return (
    <div className="space-y-4">
      {/* Top Controls & Interactive Instructions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E1B4B]" />
            <span className="font-semibold text-slate-900">
              Drag Bar Body:
            </span>
            <span className="text-slate-600">Shift Start &amp; Due Date</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" />
            <span className="font-semibold text-slate-900">
              Drag Left/Right Handles:
            </span>
            <span className="text-slate-600">Stretch Duration (Days)</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-semibold text-slate-900">
              Drag Right Connector Dot:
            </span>
            <span className="text-slate-600">Link Task Dependency</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Auto-Cascade Toggle */}
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={autoCascadeDependents}
              onChange={(e) => setAutoCascadeDependents(e.target.checked)}
              className="rounded border-slate-300 text-[#1E1B4B] focus:ring-[#1E1B4B]"
            />
            <span className="font-medium">Auto-shift dependents</span>
          </label>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'start' | 'chain' | 'due')
              }
              aria-label="Sort Gantt rows"
              className="px-2.5 py-1.5 bg-[#FAF8F5] border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
            >
              <option value="chain">Sort: Dependency Chain</option>
              <option value="start">Sort: Earliest Start Date</option>
              <option value="due">Sort: Due Date</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            {(
              [
                { id: 'fit', label: 'Fit' },
                { id: 'comfortable', label: 'Standard' },
                { id: 'detailed', label: 'Detailed' },
              ] as const
            ).map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoomLevel(z.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  zoomLevel === z.id
                    ? 'bg-white text-[#1E1B4B] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback Toast or Schedule Overlap Alert */}
      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-[#1E1B4B] text-white px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{toastBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="text-slate-300 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {scheduleOverlaps.length > 0 && !isReadOnly && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>
                {scheduleOverlaps.length} dependency schedule overlap
                {scheduleOverlaps.length > 1 ? 's' : ''} detected:
              </strong>{' '}
              “{scheduleOverlaps[0].task.title}” starts before its prerequisite
              “{scheduleOverlaps[0].prereq.title}” finishes. Drag the bar right
              or auto-align below.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResolveOverlaps}
            className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shrink-0 transition-colors"
          >
            Auto-Align Overlapping Bars
          </button>
        </div>
      )}

      {/* Main Scrollable Gantt Chart Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div
            ref={ganttCanvasRef}
            className={`relative select-none ${minTrackMinWidth}`}
          >
            {/* Header Row: Left Task Column Header + Right Timeline Date Scale */}
            <div
              className="flex border-b border-slate-200 bg-[#FAF8F5]"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Left Sticky Column Header */}
              <div
                className="shrink-0 px-4 flex items-center justify-between border-r border-slate-200 bg-[#FAF8F5] z-20 sticky left-0"
                style={{ width: LEFT_COL_WIDTH }}
              >
                <span className="text-xs font-bold text-[#1E1B4B] font-display">
                  Task &amp; Dependency Stage
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Duration · Due
                </span>
              </div>

              {/* Right Timeline Ticks Header */}
              <div
                ref={timelineTrackRef}
                className="flex-1 relative overflow-hidden"
              >
                {timelineTicks.map((tick, i) => {
                  const leftPct = msToPercent(tick.ms);
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-slate-200/80 pl-1.5 pt-2 flex flex-col justify-between pb-1.5 pointer-events-none"
                      style={{ left: `${leftPct}%` }}
                    >
                      <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                        {tick.label}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        ’{tick.subLabel}
                      </span>
                    </div>
                  );
                })}

                {/* Event Date Marker in Header */}
                <div
                  className="absolute top-0 bottom-0 z-10 flex items-center pointer-events-none"
                  style={{
                    left: `${msToPercent(timelineBounds.eventMs)}%`,
                  }}
                >
                  <div className="-translate-x-1/2 px-2 py-0.5 bg-[#1E1B4B] text-white text-[10px] font-mono tabular-nums font-semibold rounded shadow-2xs whitespace-nowrap">
                    Event: {formatShortDate(eventDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Gantt Rows + SVG Dependency Connector Overlay */}
            <div className="relative divide-y divide-slate-100">
              {/* Vertical Grid Lines & Event Date Line across all rows */}
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none"
                style={{ left: LEFT_COL_WIDTH }}
              >
                {timelineTicks.map((tick, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-slate-100"
                    style={{ left: `${msToPercent(tick.ms)}%` }}
                  />
                ))}

                {/* Event Date Vertical Deadline Line */}
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#1E1B4B]/40 z-10"
                  style={{
                    left: `${msToPercent(timelineBounds.eventMs)}%`,
                  }}
                />
              </div>

              {/* SVG Dependency Arrows Layer */}
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-15"
                style={{
                  height: orderedTasks.length * ROW_HEIGHT,
                }}
              >
                <defs>
                  <marker
                    id="gantt-arrow-emerald"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#34D399" />
                  </marker>
                  <marker
                    id="gantt-arrow-amber"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#FBBF24" />
                  </marker>
                  <marker
                    id="gantt-arrow-indigo"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#22D3EE" />
                  </marker>
                </defs>

                {orderedTasks.map((task, targetRowIdx) => {
                  if (!task.dependsOnTaskId) return null;
                  const prereqIdx = orderedTasks.findIndex(
                    (x) => x.id === task.dependsOnTaskId
                  );
                  if (prereqIdx === -1) return null;
                  const prereq = orderedTasks[prereqIdx];

                  const prereqWin = getEffectiveTaskWindow(prereq);
                  const targetWin = getEffectiveTaskWindow(task);

                  const startX =
                    LEFT_COL_WIDTH +
                    (msToPercent(prereqWin.dueMs) / 100) * trackWidthPx;
                  const startY = prereqIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                  const endX =
                    LEFT_COL_WIDTH +
                    (msToPercent(targetWin.startMs) / 100) * trackWidthPx;
                  const endY = targetRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                  const isUnlocked = prereq.status === 'Completed';
                  const hasOverlap = targetWin.startMs < prereqWin.dueMs;

                  // Smooth S-curve or stepped bezier path
                  const midX = (startX + endX) / 2;
                  const ctrlOffset = Math.max(28, Math.abs(endX - startX) * 0.35);
                  const pathD =
                    endX >= startX
                      ? `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
                      : `M ${startX} ${startY} C ${startX + ctrlOffset} ${startY}, ${
                          endX - ctrlOffset
                        } ${endY}, ${endX} ${endY}`;

                  const strokeColor = hasOverlap
                    ? '#FBBF24'
                    : isUnlocked
                    ? '#34D399'
                    : '#38BDF8';

                  return (
                    <g key={`edge-${prereq.id}-${task.id}`}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={
                          selectedTaskId === task.id ||
                          selectedTaskId === prereq.id
                            ? 2.25
                            : 1.65
                        }
                        strokeDasharray={
                          hasOverlap ? '5 4' : isUnlocked ? undefined : '4 4'
                        }
                        markerEnd={
                          hasOverlap
                            ? 'url(#gantt-arrow-amber)'
                            : isUnlocked
                            ? 'url(#gantt-arrow-emerald)'
                            : 'url(#gantt-arrow-indigo)'
                        }
                      />
                    </g>
                  );
                })}

                {/* Active Drag-to-Connect Wire */}
                {dragState && dragState.type === 'connect' && (
                  <path
                    d={`M ${dragState.startX} ${dragState.startY} C ${
                      (dragState.startX + dragState.currentX) / 2
                    } ${dragState.startY}, ${
                      (dragState.startX + dragState.currentX) / 2
                    } ${dragState.currentY}, ${dragState.currentX} ${
                      dragState.currentY
                    }`}
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth={2.25}
                    strokeDasharray="5 4"
                    markerEnd="url(#gantt-arrow-indigo)"
                  />
                )}
              </svg>

              {/* Task Rows */}
              {orderedTasks.map((task) => {
                const win = getEffectiveTaskWindow(task);
                const prereq = task.dependsOnTaskId
                  ? taskById.get(task.dependsOnTaskId)
                  : undefined;
                const isBlocked =
                  Boolean(prereq) && prereq!.status !== 'Completed';
                const isOverdue =
                  task.status !== 'Completed' && win.dueDateStr < todayStr;
                const hasScheduleOverlap =
                  Boolean(prereq) &&
                  win.startMs < getEffectiveTaskWindow(prereq!).dueMs;

                const leftPct = msToPercent(win.startMs);
                const rightPct = msToPercent(win.dueMs);
                const widthPct = Math.max(2.2, rightPct - leftPct);

                const isSelected = selectedTaskId === task.id;
                const isConnectTarget =
                  dragState?.type === 'connect' &&
                  dragState.hoveredTargetId === task.id;
                const isConnectInvalid =
                  isConnectTarget &&
                  dragState?.type === 'connect' &&
                  wouldCreateCycle(task.id, dragState.fromTaskId);

                const stageDepth = depthMap.get(task.id) ?? 0;

                // Bar color styling
                let barClasses =
                  'bg-[#1E1B4B] border-[#1E1B4B] text-white shadow-xs';
                if (task.status === 'Completed') {
                  barClasses =
                    'bg-[#059669] border-emerald-700 text-white shadow-xs';
                } else if (isOverdue) {
                  barClasses =
                    'bg-red-600 border-red-700 text-white task-pulse-overdue';
                } else if (isBlocked || hasScheduleOverlap) {
                  barClasses =
                    'bg-amber-600 border-amber-700 text-white task-pulse-blocked';
                } else if (task.status === 'In Progress') {
                  barClasses =
                    'bg-indigo-900 border-[#1E1B4B] text-white shadow-xs';
                }

                return (
                  <div
                    key={task.id}
                    data-gantt-task-id={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center transition-colors relative ${
                      isConnectTarget
                        ? isConnectInvalid
                          ? 'bg-red-50/90'
                          : 'bg-emerald-50/90 ring-2 ring-inset ring-emerald-500'
                        : isSelected
                        ? 'bg-[#FAF8F5]'
                        : 'hover:bg-slate-50/70'
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Left Sticky Task Metadata Cell */}
                    <div
                      className={`shrink-0 h-full px-4 py-2 border-r border-slate-200 flex items-center justify-between gap-2 z-20 sticky left-0 ${
                        isSelected ? 'bg-[#FAF8F5]' : 'bg-white'
                      }`}
                      style={{ width: LEFT_COL_WIDTH }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: PlanoraTask['status'] =
                                task.status === 'Completed'
                                  ? 'Todo'
                                  : 'Completed';
                              onUpdateTask({ ...task, status: nextStatus });
                            }}
                            title={`Status: ${task.status} (click to toggle)`}
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                              task.status === 'Completed'
                                ? 'bg-[#059669] border-[#059669] text-white'
                                : 'border-slate-300 hover:border-[#1E1B4B] bg-white'
                            }`}
                          >
                            {task.status === 'Completed' && (
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            )}
                          </button>

                          <span
                            className={`text-xs font-semibold truncate ${
                              task.status === 'Completed'
                                ? 'line-through text-slate-400'
                                : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <span className="font-mono tabular-nums text-slate-600">
                            Stage {stageDepth + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          {prereq && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`inline-flex items-center gap-0.5 font-medium truncate ${
                                  isBlocked
                                    ? 'text-amber-800'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {isBlocked ? (
                                  <Lock className="w-2.5 h-2.5 shrink-0" />
                                ) : (
                                  <Unlock className="w-2.5 h-2.5 shrink-0" />
                                )}
                                <span className="truncate">
                                  {prereq.title.split(' ').slice(0, 2).join(' ')}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono tabular-nums font-bold text-[#1E1B4B]">
                          {win.durationDays}d
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-slate-500">
                          {formatShortDate(win.dueDateStr)}
                        </div>
                      </div>
                    </div>

                    {/* Right Gantt Timeline Bar Area */}
                    <div className="flex-1 h-full relative">
                      <motion.div
                        layoutId={`gantt-bar-${task.id}`}
                        transition={{
                          layout: {
                            type: 'spring',
                            stiffness: 380,
                            damping: 32,
                          },
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: 13,
                          height: 34,
                        }}
                        className={`absolute rounded-lg border flex items-center justify-between px-2 group z-20 ${barClasses} ${
                          isReadOnly
                            ? 'cursor-default'
                            : win.isDraggingThis
                            ? 'cursor-grabbing ring-2 ring-[#1E1B4B]/40 scale-[1.02]'
                            : 'cursor-grab hover:brightness-105'
                        }`}
                        onPointerDown={(e) => {
                          if (isReadOnly) return;
                          e.stopPropagation();
                          setSelectedTaskId(task.id);
                          setDragState({
                            type: 'move',
                            taskId: task.id,
                            startX: e.clientX,
                            initialDueMs: parseDateMs(task.dueDate),
                            initialDuration: getTaskDuration(task),
                            currentDeltaDays: 0,
                          });
                        }}
                      >
                        {/* Left Resize Handle (Adjusts Start Date / Duration) */}
                        {!isReadOnly && (
                          <div
                            title="Drag left edge to adjust start date & duration"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                              setDragState({
                                type: 'resize-start',
                                taskId: task.id,
                                startX: e.clientX,
                                initialDueMs: parseDateMs(task.dueDate),
                                initialDuration: getTaskDuration(task),
                                currentDeltaDays: 0,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-l-lg hover:bg-white/25 transition-colors"
                          >
                            <span className="w-0.5 h-3.5 bg-white/70 rounded-full" />
                          </div>
                        )}

                        {/* Bar Label Content */}
                        <div className="flex items-center gap-1.5 min-w-0 px-1.5 pointer-events-none overflow-hidden">
                          <GripHorizontal className="w-3 h-3 opacity-70 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">
                            {task.title}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums opacity-85 shrink-0 hidden sm:inline">
                            ({win.durationDays}d)
                          </span>
                        </div>

                        {/* Right Resize Handle (Adjusts Duration + Due Date) */}
                        {!isReadOnly && (
                          <div
                            title="Drag right edge to stretch duration & due date"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                              setDragState({
                                type: 'resize-end',
                                taskId: task.id,
                                startX: e.clientX,
                                initialDueMs: parseDateMs(task.dueDate),
                                initialDuration: getTaskDuration(task),
                                currentDeltaDays: 0,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center rounded-r-lg hover:bg-white/25 transition-colors"
                          >
                            <span className="w-0.5 h-3.5 bg-white/70 rounded-full" />
                          </div>
                        )}

                        {/* Drag-to-Connect Dependency Handle (Outside Right Edge) */}
                        {!isReadOnly && (
                          <button
                            type="button"
                            title="Drag onto another task bar to link dependency"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const canvasRect =
                                ganttCanvasRef.current?.getBoundingClientRect();
                              if (!canvasRect) return;
                              const startX = e.clientX - canvasRect.left;
                              const startY = e.clientY - canvasRect.top;
                              setDragState({
                                type: 'connect',
                                fromTaskId: task.id,
                                startX,
                                startY,
                                currentX: startX,
                                currentY: startY,
                                hoveredTargetId: null,
                              });
                            }}
                            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#1E1B4B] text-[#1E1B4B] flex items-center justify-center shadow-xs opacity-85 group-hover:opacity-100 hover:scale-110 transition-transform cursor-crosshair z-30"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                          </button>
                        )}

                        {/* Live Floating HUD Tooltip while dragging this bar */}
                        {win.isDraggingThis && (
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded-md shadow-md whitespace-nowrap z-40 pointer-events-none">
                            {formatShortDate(win.startDateStr)} →{' '}
                            {formatShortDate(win.dueDateStr)} ·{' '}
                            <span className="text-emerald-300 font-bold">
                              {win.durationDays}d
                            </span>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Selected Task Precision Inspector & Dependency Linker */}
        {selectedTask && (
          <div className="bg-[#FAF8F5] border-t border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#1E1B4B] font-display">
                  Selected Bar: {selectedTask.title}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-mono tabular-nums text-slate-600">
                  Start:{' '}
                  {formatDateYMD(getTaskStartMs(selectedTask))} → Due:{' '}
                  {selectedTask.dueDate} ({getTaskDuration(selectedTask)} days)
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {selectedTask.description ||
                  'Drag the bar or use precision controls on the right to fine-tune duration and upstream dependency.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs">
              {/* Precision Duration Stepper */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Duration:</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  disabled={isReadOnly}
                  value={getTaskDuration(selectedTask)}
                  onChange={(e) => {
                    const nextDur = Math.max(
                      1,
                      Math.min(180, Number(e.target.value) || 1)
                    );
                    onUpdateTask({
                      ...selectedTask,
                      durationDays: nextDur,
                    });
                  }}
                  className="w-14 px-1.5 py-0.5 text-center font-mono tabular-nums font-semibold bg-slate-50 border border-slate-200 rounded"
                />
                <span className="text-slate-500">days</span>
              </div>

              {/* Precision Due Date Picker */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Due:</span>
                <input
                  type="date"
                  disabled={isReadOnly}
                  max={eventDate}
                  value={selectedTask.dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || val > eventDate) return;
                    onUpdateTask({
                      ...selectedTask,
                      dueDate: val,
                    });
                  }}
                  className="font-mono tabular-nums bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
                />
              </div>

              {/* Prerequisite Dependency Selector */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600">Depends on:</span>
                <select
                  disabled={isReadOnly}
                  value={selectedTask.dependsOnTaskId}
                  onChange={(e) => {
                    const nextPrereqId = e.target.value;
                    if (
                      nextPrereqId &&
                      wouldCreateCycle(selectedTask.id, nextPrereqId)
                    ) {
                      return;
                    }
                    onUpdateTask({
                      ...selectedTask,
                      dependsOnTaskId: nextPrereqId,
                    });
                  }}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 max-w-[180px] truncate"
                >
                  <option value="">None (Stage 1 Root)</option>
                  {tasks
                    .filter(
                      (cand) =>
                        cand.id !== selectedTask.id &&
                        !wouldCreateCycle(selectedTask.id, cand.id)
                    )
                    .map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.title}
                      </option>
                    ))}
                </select>
                {selectedTask.dependsOnTaskId && !isReadOnly && (
                  <button
                    type="button"
                    title="Remove dependency link"
                    onClick={() =>
                      onUpdateTask({ ...selectedTask, dependsOnTaskId: '' })
                    }
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
