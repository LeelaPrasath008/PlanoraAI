import React from 'react';
import { Download, Printer, Share2 } from 'lucide-react';
import { formatCurrency, PlanoraEvent } from '../../types/event';
import { BudgetSummaryMetrics } from '../../utils/budgetCalculations';
import {
  buildBudgetAndVendorsCsvContent,
  buildTasksCsvContent,
  triggerCsvDownload,
} from '../../utils/csvExport';

interface ExportSectionProps {
  activeEvent: PlanoraEvent;
  budgetSummary: BudgetSummaryMetrics;
  onToggleShareAccess: () => Promise<void>;
  onCopyShareLink: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = React.memo(
  ({
    activeEvent,
    budgetSummary,
    onToggleShareAccess,
    onCopyShareLink,
  }) => {
    const slug = activeEvent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const handleDownloadTasksCsv = () => {
      const csv = buildTasksCsvContent(activeEvent);
      triggerCsvDownload(`${slug || 'event'}-tasks.csv`, csv);
    };

    const handleDownloadBudgetCsv = () => {
      const csv = buildBudgetAndVendorsCsvContent(activeEvent);
      triggerCsvDownload(`${slug || 'event'}-budget-vendors.csv`, csv);
    };

    return (
      <section aria-label="Export, Print PDF and Shareable Access" className="space-y-6">
        <div className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B] font-display">
              Export, Print PDF &amp; Shareable Read-Only Access
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All exports contain your actual saved event numbers, tasks, and
              vendor quotations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print / Save Event Summary as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTasksCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Task Checklist (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBudgetCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Budget &amp; Vendor Ledger (CSV)</span>
            </button>
          </div>

          {/* Shareable Read-Only Link Access Control */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <Share2
                  className="w-3.5 h-3.5 text-[#059669]"
                  aria-hidden="true"
                />
                <span>
                  Shareable Read-Only Event Link (Status:{' '}
                  {activeEvent.isShared
                    ? 'Active & Accessible'
                    : 'Private / Revoked'}
                  )
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Enable read-only sharing to present this plan to family members
                or organizing committees. Revoke anytime.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleShareAccess}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg ${
                  activeEvent.isShared
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#059669] text-white'
                }`}
              >
                {activeEvent.isShared
                  ? 'Revoke Share Access'
                  : 'Enable Shareable Link'}
              </button>

              {activeEvent.isShared && (
                <button
                  type="button"
                  onClick={onCopyShareLink}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#1E1B4B] bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Copy Link
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Printable Family / Committee Executive Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-[#059669]">
                PLANORA AI — EXECUTIVE EVENT SUMMARY DOSSIER
              </div>
              <h2 className="text-xl font-bold text-[#1E1B4B] font-display mt-1">
                {activeEvent.title}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeEvent.eventType} · {activeEvent.eventDate} ·{' '}
                {activeEvent.city} · {activeEvent.guestCount} Guests
              </p>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div>
                Total Budget:{' '}
                <strong>
                  {formatCurrency(
                    activeEvent.totalBudget,
                    activeEvent.currency
                  )}
                </strong>
              </div>
              <div>
                Planned Spend:{' '}
                <strong>
                  {formatCurrency(
                    budgetSummary.plannedTotal,
                    activeEvent.currency
                  )}
                </strong>
              </div>
              <div>
                Remaining Buffer:{' '}
                <strong>
                  {formatCurrency(
                    budgetSummary.remainingBudget,
                    activeEvent.currency
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              1. Concept &amp; Hospitality Direction
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeEvent.aiConceptSummary}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              2. Budget Allocation Summary
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-1.5">
                    Category
                  </th>
                  <th scope="col" className="py-1.5">
                    Line Item
                  </th>
                  <th scope="col" className="py-1.5 text-right">
                    Planned
                  </th>
                  <th scope="col" className="py-1.5 text-right">
                    Actual Paid
                  </th>
                  <th scope="col" className="py-1.5 pl-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEvent.budgetItems.map((b) => (
                  <tr key={b.id}>
                    <td className="py-1.5 font-medium">{b.category}</td>
                    <td className="py-1.5">{b.title}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {formatCurrency(b.plannedAmount, activeEvent.currency)}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {formatCurrency(b.actualAmount, activeEvent.currency)}
                    </td>
                    <td className="py-1.5 pl-4">{b.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase">
              3. Preparation Schedule &amp; Milestones
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-1.5">
                    Due Date
                  </th>
                  <th scope="col" className="py-1.5">
                    Task
                  </th>
                  <th scope="col" className="py-1.5">
                    Assignee
                  </th>
                  <th scope="col" className="py-1.5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEvent.tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-1.5 font-mono tabular-nums">
                      {t.dueDate}
                    </td>
                    <td className="py-1.5 font-medium">{t.title}</td>
                    <td className="py-1.5">{t.assignee}</td>
                    <td className="py-1.5">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }
);
