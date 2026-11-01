import React from 'react';
import {
  Sparkles,
  Plus,
  Copy,
  Trash2,
} from 'lucide-react';
import { PlanoraEvent } from '../../types/event';
import { formatCurrency } from '../../utils/budgetCalculations';
import { ActiveSection } from './AppHeader';
import { WORKSPACE_NAV_ITEMS } from './WorkspaceSummaryHeader';

export interface WorkspaceSidebarProps {
  events: PlanoraEvent[];
  activeEvent: PlanoraEvent;
  activeSection: ActiveSection;
  onNavigateSection: (section: ActiveSection) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenGeneratorModal: () => void;
  onDuplicateEvent: (event: PlanoraEvent, e: React.MouseEvent) => void;
  onDeleteEvent: (eventId: string, e: React.MouseEvent) => void;
}

/**
 * Desktop left sidebar containing the multi-event portfolio switcher,
 * workspace section navigation (`aria-current="page"`), and quick AI generator card.
 */
export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  events,
  activeEvent,
  activeSection,
  onNavigateSection,
  onSelectEvent,
  onOpenGeneratorModal,
  onDuplicateEvent,
  onDeleteEvent,
}) => {
  return (
    <aside
      aria-label="Event portfolio and section sidebar"
      className="w-64 shrink-0 hidden lg:flex flex-col gap-6"
    >
      {/* Event Switcher Card */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] font-semibold">
            Your Event Plans ({events.length})
          </span>
          <button
            type="button"
            onClick={onOpenGeneratorModal}
            className="text-xs font-semibold text-[#B8860B] hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" aria-hidden="true" /> New
          </button>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {events.map((ev) => {
            const isSelected = ev.id === activeEvent.id;
            return (
              <div
                key={ev.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                    : 'bg-[#FAF7F2] text-[#1F1C18] border-transparent hover:border-[#E6DFD3]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectEvent(ev.id);
                    if (activeSection === 'portfolio') {
                      onNavigateSection('overview');
                    }
                  }}
                  aria-label={`Select event ${ev.title}`}
                  className="min-w-0 pr-2 flex-1 text-left cursor-pointer"
                >
                  <span className="text-xs font-semibold truncate block">
                    {ev.title}
                  </span>
                  <span
                    className={`text-xs font-mono block ${
                      isSelected ? 'text-[#CBD5E1]' : 'text-[#6E655A]'
                    }`}
                  >
                    {ev.type} · {formatCurrency(ev.totalBudget)}
                  </span>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={(e) => onDuplicateEvent(ev, e)}
                    aria-label={`Duplicate ${ev.title}`}
                    className={`p-1 rounded hover:bg-black/10 ${
                      isSelected ? 'text-white' : 'text-[#6E655A]'
                    }`}
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  </button>
                  {events.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => onDeleteEvent(ev.id, e)}
                      aria-label={`Delete ${ev.title}`}
                      className={`p-1 rounded hover:bg-black/10 ${
                        isSelected ? 'text-white' : 'text-[#F87171]'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Navigation */}
      <nav
        aria-label="Event workspace sections"
        className="bg-white border border-[#E6DFD3] rounded-2xl p-3 shadow-xs space-y-1"
      >
        {WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigateSection(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[38px] ${
                active
                  ? 'bg-[#FAF7F2] text-[#1F1C18] border border-[#E6DFD3] shadow-2xs'
                  : 'text-[#6E655A] hover:text-[#1F1C18] hover:bg-[#FAF7F2]/60'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`w-4 h-4 ${
                  active ? 'text-[#B8860B]' : 'text-[#6E655A]'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick AI Action Card */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1C18]">
          <Sparkles className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
          <span>Need a Fresh Concept?</span>
        </div>
        <p className="text-xs text-[#6E655A] leading-relaxed">
          Use the 5-step AI Wizard to synthesize a new event plan with custom
          contingency and priorities.
        </p>
        <button
          type="button"
          onClick={onOpenGeneratorModal}
          className="w-full py-2 rounded-xl bg-white border border-[#E6DFD3] hover:border-[#1F1C18] text-xs font-semibold text-[#1F1C18] transition-colors min-h-[36px]"
        >
          Launch Blueprint Wizard
        </button>
      </div>
    </aside>
  );
};
