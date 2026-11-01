import React from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Copy,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { PlanoraEvent } from '../../types/event';
import { calculateBudgetMetrics, formatCurrency } from '../../utils/budgetCalculations';
import { EventArtwork } from '../EventArtwork';

export interface PortfolioSectionProps {
  events: PlanoraEvent[];
  activeEventId: string;
  onSelectEvent: (eventId: string) => void;
  onOpenGeneratorModal: () => void;
  onDuplicateEvent: (event: PlanoraEvent, e: React.MouseEvent) => void;
  onDeleteEvent: (eventId: string, e: React.MouseEvent) => void;
}

/**
 * Multi-Event Portfolio dashboard with accessible event cards, artwork, and quick actions.
 */
export const PortfolioSection: React.FC<PortfolioSectionProps> = React.memo(({
  events,
  activeEventId,
  onSelectEvent,
  onOpenGeneratorModal,
  onDuplicateEvent,
  onDeleteEvent,
}) => {
  const totalPortfolioBudget = events.reduce((s, e) => s + e.totalBudget, 0);
  const totalPortfolioGuests = events.reduce((s, e) => s + e.guestCount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E6DFD3]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold block mb-1">
            Multi-Event Command Center
          </span>
          <h1
            id="section-main-heading"
            tabIndex={-1}
            className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1C18] focus:outline-none"
          >
            Event Portfolio ({events.length} Active Blueprints)
          </h1>
          <p className="text-sm text-[#6E655A] mt-1">
            Combined Portfolio Capacity: {totalPortfolioGuests.toLocaleString()}{' '}
            guests · Total Managed Budget:{' '}
            <span className="font-mono font-semibold text-[#1F1C18]">
              {formatCurrency(totalPortfolioBudget)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenGeneratorModal}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors shadow-xs shrink-0 min-h-[42px]"
        >
          <Sparkles className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
          Generate New AI Event Blueprint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => {
          const evMetrics = calculateBudgetMetrics(ev);
          const doneCount = ev.tasks.filter((t) => t.status === 'Done').length;
          const isCurrent = ev.id === activeEventId;

          return (
            <article
              key={ev.id}
              className={`group bg-white rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-2 border-[#1F1C18] shadow-md'
                  : 'border-[#E6DFD3] hover:border-[#B8860B] shadow-xs'
              }`}
            >
              <div>
                <div className="h-36 relative overflow-hidden border-b border-[#E6DFD3]">
                  <EventArtwork type={ev.type} />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-[#1F1C18]/85 text-[#FAF7F2] text-xs font-mono uppercase tracking-wider font-semibold backdrop-blur-xs">
                      {ev.type}
                    </span>
                    {isCurrent && (
                      <span className="px-2.5 py-1 rounded-full bg-[#B8860B] text-white text-xs font-mono uppercase tracking-wider font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => onDuplicateEvent(ev, e)}
                      aria-label={`Duplicate event blueprint ${ev.title}`}
                      className="p-2 rounded-lg bg-white/90 text-[#1F1C18] hover:bg-white shadow-xs min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteEvent(ev.id, e)}
                        aria-label={`Delete event blueprint ${ev.title}`}
                        className="p-2 rounded-lg bg-white/90 text-[#F87171] hover:bg-white shadow-xs min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  className="w-full text-left p-5 space-y-3 cursor-pointer block"
                >
                  <h2 className="font-serif text-xl font-bold text-[#1F1C18] group-hover:text-[#B8860B] transition-colors line-clamp-1">
                    {ev.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E655A]">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                      {ev.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                      {ev.location}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Users className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                      {ev.guestCount}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E655A] line-clamp-2 leading-relaxed">
                    {ev.aiConceptSummary}
                  </p>
                </button>
              </div>

              <div className="px-5 py-3.5 bg-[#FAF7F2] border-t border-[#E6DFD3] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#6E655A] block">Planned / Cap</span>
                  <span className="font-mono font-bold text-[#1F1C18]">
                    {formatCurrency(evMetrics.totalPlanned)} /{' '}
                    {formatCurrency(ev.totalBudget)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#6E655A] block">Tasks Done</span>
                  <span className="font-mono font-bold text-[#34D399]">
                    {doneCount}/{ev.tasks.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  aria-label={`Open workspace for ${ev.title}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#1F1C18] group-hover:text-[#B8860B] min-h-[28px] px-1"
                >
                  Open <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
});
