import { TimelineTask, TaskPriority } from '../types/event';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface TaskWindow {
  task: TimelineTask;
  durationDays: number;
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
}

/**
 * Parses an ISO date string (`YYYY-MM-DD`) into a UTC/local midnight timestamp in milliseconds.
 * @param dateStr ISO date string.
 * @param fallbackIso Optional fallback ISO date if `dateStr` is invalid.
 */
export function parseIsoDay(dateStr: string, fallbackIso?: string): number {
  const clean = (dateStr || fallbackIso || '').trim();
  const parsed = Date.parse(`${clean}T00:00:00`);
  if (!Number.isNaN(parsed)) return parsed;
  const fallback = Date.parse(`${fallbackIso || '2026-06-01'}T00:00:00`);
  return Number.isNaN(fallback) ? Date.now() : fallback;
}

/**
 * Formats a millisecond timestamp as a `YYYY-MM-DD` ISO date string.
 * @param ms Timestamp in milliseconds.
 */
export function formatIsoDay(ms: number): string {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a millisecond timestamp as a short human-readable date label (e.g., `Sep 15`).
 * @param ms Timestamp in milliseconds.
 */
export function formatShortLabel(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Adds `deltaDays` (positive or negative) to an ISO date string (`YYYY-MM-DD`).
 * @param dateStr Starting ISO date string.
 * @param deltaDays Number of days to shift.
 * @param fallbackIso Fallback ISO date if `dateStr` is invalid.
 */
export function addDaysIso(
  dateStr: string,
  deltaDays: number,
  fallbackIso?: string
): string {
  const baseMs = parseIsoDay(dateStr, fallbackIso);
  return formatIsoDay(baseMs + Math.round(deltaDays) * DAY_MS);
}

/**
 * Infers a default duration in days based on task priority and category when `durationDays` is unset.
 * @param priority Task priority (`High`, `Medium`, `Low`).
 * @param category Task category name.
 */
export function inferDefaultDuration(
  priority: TaskPriority,
  category: string
): number {
  const cat = (category || '').toLowerCase();
  if (cat.includes('venue') || cat.includes('catering')) return 10;
  if (cat.includes('vendor') || cat.includes('production')) return 8;
  if (priority === 'High') return 7;
  if (priority === 'Medium') return 5;
  return 3;
}

/**
 * Computes the start/end timestamps and ISO strings for a `TimelineTask`.
 * @param task Timeline task item.
 * @param eventDate Fallback event date.
 * @param previewOverride Optional live drag preview override.
 */
export function computeTaskWindow(
  task: TimelineTask,
  eventDate: string,
  previewOverride?: { dueDate?: string; durationDays?: number }
): TaskWindow {
  const durationDays = Math.max(
    1,
    Math.min(
      90,
      Math.round(
        previewOverride?.durationDays ??
          task.durationDays ??
          inferDefaultDuration(task.priority, task.category)
      )
    )
  );
  const effectiveDueIso =
    previewOverride?.dueDate ||
    task.dueDate ||
    eventDate ||
    new Date().toISOString().split('T')[0];
  const endMs = parseIsoDay(effectiveDueIso, eventDate);
  const startMs = endMs - (durationDays - 1) * DAY_MS;

  return {
    task: {
      ...task,
      dueDate: formatIsoDay(endMs),
      durationDays,
    },
    durationDays,
    startMs,
    endMs,
    startIso: formatIsoDay(startMs),
    endIso: formatIsoDay(endMs),
  };
}
