import { PlanoraEvent } from '../types/event';

/**
 * Sanitizes a cell value against OWASP CSV Formula Injection (=, +, -, @, \t, \r)
 * and formats it according to RFC-4180.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '').trim();
  const safeFormula = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safeFormula.replace(/"/g, '""')}"`;
}

export function buildTasksCsvContent(event: PlanoraEvent): string {
  const rows: string[][] = [
    [
      'Task Title',
      'Category',
      'Priority',
      'Due Date',
      'Duration Days',
      'Status',
      'Assignee',
      'Prerequisite Task ID',
      'Description',
    ],
    ...event.tasks.map((t) => [
      t.title,
      t.category,
      t.priority,
      t.dueDate,
      String(t.durationDays || 7),
      t.status,
      t.assignee,
      t.dependsOnTaskId,
      t.description,
    ]),
  ];
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}

export function buildBudgetAndVendorsCsvContent(event: PlanoraEvent): string {
  const rows: string[][] = [
    [
      'Record Type',
      'Category',
      'Title / Vendor',
      'Planned / Estimate',
      'Quoted',
      'Actual Paid',
      'Status',
      'Notes',
    ],
    ...event.budgetItems.map((b) => [
      'Budget Expense',
      b.category,
      b.title,
      String(b.plannedAmount),
      String(b.quotedAmount),
      String(b.actualAmount),
      b.paymentStatus,
      b.notes,
    ]),
    ...event.vendors.map((v) => [
      'Vendor Quote',
      v.category,
      v.vendorName,
      String(v.estimatedPrice),
      String(v.quotedAmount),
      '0',
      v.bookingStatus,
      v.notes,
    ]),
  ];
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
