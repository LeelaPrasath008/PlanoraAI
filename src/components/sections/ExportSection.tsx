import React from 'react';
import {
  Download,
  Copy,
  Check,
  Printer,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { PlanoraEvent } from '../../types/event';
import { downloadEventCsv, formatPlanSummaryText } from '../../utils/csvExport';

export interface ExportSectionProps {
  activeEvent: PlanoraEvent;
  copiedBrief: boolean;
  onCopyBrief: () => void;
  onNotify: (msg: string) => void;
}

/**
 * Export & Share Hub section with CSV spreadsheet download, clipboard executive brief,
 * and print-ready formatting.
 */
export const ExportSection: React.FC<ExportSectionProps> = React.memo(({
  activeEvent,
  copiedBrief,
  onCopyBrief,
  onNotify,
}) => {
  const summaryText = formatPlanSummaryText(activeEvent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#2E5A44]/15 text-[#34D399] flex items-center justify-center"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
              Download Full CSV Ledger
            </h3>
            <p className="text-xs text-[#6E655A] leading-relaxed">
              Exports all budget line items, vendor quotes, and timeline
              milestones into a formula-safe spreadsheet compatible with Excel
              and Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              downloadEventCsv(activeEvent);
              onNotify('Downloaded full event CSV spreadsheet.');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors min-h-[38px]"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
            Spreadsheet
          </button>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#B8860B]/15 text-[#FBBF24] flex items-center justify-center"
            >
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
              Copy Executive Plan Brief
            </h3>
            <p className="text-xs text-[#6E655A] leading-relaxed">
              Copies a structured plain-text summary of your event concept, top
              budget categories, upcoming tasks, and vendor shortlist for email
              or Slack.
            </p>
          </div>
          <button
            type="button"
            onClick={onCopyBrief}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-h-[38px]"
          >
            {copiedBrief ? (
              <>
                <Check className="w-4 h-4 text-[#34D399]" aria-hidden="true" />{' '}
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" /> Copy Executive
                Summary
              </>
            )}
          </button>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-[#1F1C18]/10 text-[#1F1C18] flex items-center justify-center"
            >
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
              Print / Save PDF Brief
            </h3>
            <p className="text-xs text-[#6E655A] leading-relaxed">
              Opens your system print dialog to save a clean, stakeholder-ready
              PDF runbook of this event blueprint.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-h-[38px]"
          >
            <Printer className="w-4 h-4" aria-hidden="true" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Live Preview of Formatted Executive Brief */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-serif text-base font-bold text-[#1F1C18]">
            Executive Brief Preview
          </h4>
          <span className="text-xs font-mono text-[#6E655A]">
            Plain-text stakeholder format
          </span>
        </div>
        <pre className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] font-mono text-xs text-[#1F1C18] overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {summaryText}
        </pre>
      </div>
    </div>
  );
});
