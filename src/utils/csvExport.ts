import { PlanoraEvent, BudgetItem, TimelineTask, VendorItem } from '../types/event';

/**
 * Escapes CSV cell values and neutralizes spreadsheet formula injection
 * (`=`, `+`, `-`, `@`, tab, CR) by prefixing a single quote before wrapping in quotes.
 * @param val Cell value to escape.
 * @returns Safe CSV cell string.
 */
export function escapeCsvCell(val: string | number | undefined | null): string {
  const raw = String(val ?? '');
  const sanitized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = sanitized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates a complete multi-section CSV export string for a `PlanoraEvent`.
 * @param event Event to serialize as CSV.
 * @returns Multi-section CSV text.
 */
export function generateEventCsv(event: PlanoraEvent): string {
  const lines: string[] = [];

  lines.push(
    [
      escapeCsvCell('Event Title'),
      escapeCsvCell('Type'),
      escapeCsvCell('Date'),
      escapeCsvCell('Location'),
      escapeCsvCell('Guest Count'),
      escapeCsvCell('Total Budget'),
      escapeCsvCell('Contingency %'),
    ].join(',')
  );
  lines.push(
    [
      escapeCsvCell(event.title),
      escapeCsvCell(event.type),
      escapeCsvCell(event.date),
      escapeCsvCell(event.location),
      escapeCsvCell(event.guestCount),
      escapeCsvCell(event.totalBudget),
      escapeCsvCell(event.contingencyPercent),
    ].join(',')
  );
  lines.push('');

  lines.push(
    [
      escapeCsvCell('Budget Category'),
      escapeCsvCell('Item Title'),
      escapeCsvCell('Planned Amount'),
      escapeCsvCell('Quoted Amount'),
      escapeCsvCell('Actual Amount'),
      escapeCsvCell('Low Estimate'),
      escapeCsvCell('High Estimate'),
      escapeCsvCell('Payment Status'),
      escapeCsvCell('Notes'),
    ].join(',')
  );
  for (const item of event.budgetItems) {
    lines.push(
      [
        escapeCsvCell(item.category),
        escapeCsvCell(item.title),
        escapeCsvCell(item.plannedAmount),
        escapeCsvCell(item.quotedAmount),
        escapeCsvCell(item.actualAmount),
        escapeCsvCell(item.lowEstimate),
        escapeCsvCell(item.highEstimate),
        escapeCsvCell(item.paymentStatus),
        escapeCsvCell(item.notes),
      ].join(',')
    );
  }
  lines.push('');

  lines.push(
    [
      escapeCsvCell('Task Title'),
      escapeCsvCell('Category'),
      escapeCsvCell('Due Date'),
      escapeCsvCell('Priority'),
      escapeCsvCell('Status'),
      escapeCsvCell('Assignee'),
      escapeCsvCell('Description'),
    ].join(',')
  );
  for (const task of event.tasks) {
    lines.push(
      [
        escapeCsvCell(task.title),
        escapeCsvCell(task.category),
        escapeCsvCell(task.dueDate),
        escapeCsvCell(task.priority),
        escapeCsvCell(task.status),
        escapeCsvCell(task.assignee),
        escapeCsvCell(task.description),
      ].join(',')
    );
  }
  lines.push('');

  lines.push(
    [
      escapeCsvCell('Vendor Name'),
      escapeCsvCell('Category'),
      escapeCsvCell('Estimated Price'),
      escapeCsvCell('Quoted Amount'),
      escapeCsvCell('Booking Status'),
      escapeCsvCell('Contact Info'),
      escapeCsvCell('Follow Up Date'),
      escapeCsvCell('Notes'),
    ].join(',')
  );
  for (const vendor of event.vendors) {
    lines.push(
      [
        escapeCsvCell(vendor.vendorName),
        escapeCsvCell(vendor.category),
        escapeCsvCell(vendor.estimatedPrice),
        escapeCsvCell(vendor.quotedAmount),
        escapeCsvCell(vendor.bookingStatus),
        escapeCsvCell(vendor.contactInfo),
        escapeCsvCell(vendor.followUpDate),
        escapeCsvCell(vendor.notes),
      ].join(',')
    );
  }

  return lines.join('\n');
}

/**
 * Triggers a browser file download containing the CSV breakdown for an event.
 * @param event Event to export.
 */
export function downloadEventCsv(event: PlanoraEvent): void {
  const csvContent = generateEventCsv(event);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeFilename =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'planora-event';
  link.href = url;
  link.setAttribute('download', `${safeFilename}-budget-plan.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats an event blueprint as a structured plain-text executive summary for clipboard sharing.
 * @param event Event to summarize.
 */
export function formatPlanSummaryText(event: PlanoraEvent): string {
  const totalPlanned = event.budgetItems.reduce((s, i) => s + i.plannedAmount, 0);
  const totalActual = event.budgetItems.reduce((s, i) => s + i.actualAmount, 0);
  const doneTasks = event.tasks.filter((t) => t.status === 'Done').length;

  return [
    `PLANORA AI — EVENT EXECUTIVE BRIEF`,
    `==================================`,
    `Event: ${event.title} (${event.type})`,
    `Date: ${event.date} | Location: ${event.location} (${event.venuePreference})`,
    `Guests: ${event.guestCount} | Total Budget: $${event.totalBudget.toLocaleString()} (${event.contingencyPercent}% Contingency)`,
    `Planned Allocation: $${totalPlanned.toLocaleString()} | Actual Spent: $${totalActual.toLocaleString()}`,
    `Tasks Completed: ${doneTasks} / ${event.tasks.length}`,
    ``,
    `STRATEGIC CONCEPT:`,
    event.aiConceptSummary,
    ``,
    `TOP BUDGET ALLOCATIONS:`,
    ...event.budgetItems
      .slice(0, 8)
      .map(
        (b: BudgetItem) =>
          `- [${b.category}] ${b.title}: Planned $${b.plannedAmount.toLocaleString()} | Actual $${b.actualAmount.toLocaleString()} (${b.paymentStatus})`
      ),
    ``,
    `KEY UPCOMING TASKS:`,
    ...event.tasks
      .filter((t: TimelineTask) => t.status !== 'Done')
      .slice(0, 6)
      .map(
        (t: TimelineTask) =>
          `- [${t.dueDate}] ${t.title} (${t.priority} Priority - ${t.assignee})`
      ),
    ``,
    `SHORTLISTED VENDORS:`,
    ...event.vendors
      .slice(0, 5)
      .map(
        (v: VendorItem) =>
          `- ${v.vendorName} (${v.category}): Est. $${v.estimatedPrice.toLocaleString()} [${v.bookingStatus}]`
      ),
  ].join('\n');
}
