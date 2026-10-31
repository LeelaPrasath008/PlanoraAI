import React from 'react';
import { Plus, Copy, Archive, Trash2 } from 'lucide-react';
import { formatCurrency, PlanoraEvent } from '../../types/event';

interface PortfolioSectionProps {
  allEvents: PlanoraEvent[];
  onOpenWizard: () => void;
  onSelectEvent: (eventId: string) => void;
  onDuplicateEvent: (evt: PlanoraEvent) => void;
  onToggleArchiveEvent: (evt: PlanoraEvent) => void;
  onDeleteEvent: (evt: PlanoraEvent) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = React.memo(
  ({
    allEvents,
    onOpenWizard,
    onSelectEvent,
    onDuplicateEvent,
    onToggleArchiveEvent,
    onDeleteEvent,
  }) => {
    return (
      <section aria-labelledby="portfolio-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              id="portfolio-heading"
              className="text-2xl font-bold text-[#1E1B4B] font-display"
            >
              Event Portfolio Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage upcoming events, planning progress, remaining budgets, and
              pending tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenWizard}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-lg self-start"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Create New Event Plan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allEvents.map((evt) => {
            const planned = evt.budgetItems.reduce(
              (s, b) => s + (Number(b.plannedAmount) || 0),
              0
            );
            const contingency = Math.round(
              evt.totalBudget * (evt.contingencyPercent / 100)
            );
            const rem = evt.totalBudget - planned - contingency;
            const doneTasks = evt.tasks.filter(
              (t) => t.status === 'Completed'
            ).length;
            const pct = Math.round(
              (doneTasks / Math.max(1, evt.tasks.length)) * 100
            );

            return (
              <article
                key={evt.id}
                aria-label={`${evt.title} summary card`}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono tabular-nums">
                    <span>{evt.eventType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evt.eventDate}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evt.status}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#1E1B4B] font-display">
                    {evt.title}
                  </h2>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {evt.description}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-200 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Budget</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(evt.totalBudget, evt.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining Balance</span>
                    <span
                      className={rem >= 0 ? 'text-emerald-700' : 'text-red-600'}
                    >
                      {formatCurrency(rem, evt.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Task Progress</span>
                    <span>
                      {doneTasks}/{evt.tasks.length} ({pct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(evt.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg"
                  >
                    Open Workspace
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicateEvent(evt)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                      title={`Duplicate ${evt.title}`}
                      aria-label={`Duplicate ${evt.title}`}
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleArchiveEvent(evt)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                      title={`Archive or unarchive ${evt.title}`}
                      aria-label={`Archive or unarchive ${evt.title}`}
                    >
                      <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(evt)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      title={`Delete ${evt.title}`}
                      aria-label={`Delete ${evt.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }
);
