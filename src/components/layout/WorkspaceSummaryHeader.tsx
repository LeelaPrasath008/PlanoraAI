import React, { useId } from 'react';
import { User } from 'firebase/auth';
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Cloud,
  CloudOff,
  LayoutDashboard,
  PieChart,
  CheckSquare,
  Briefcase,
  Sliders,
  Download,
  FolderKanban,
} from 'lucide-react';
import { PlanoraEvent } from '../../types/event';
import { BudgetMetrics, formatCurrency } from '../../utils/budgetCalculations';
import { ActiveSection } from './AppHeader';

export interface WorkspaceSummaryHeaderProps {
  events: PlanoraEvent[];
  activeEvent: PlanoraEvent;
  metrics: BudgetMetrics;
  activeSection: ActiveSection;
  onNavigateSection: (section: ActiveSection) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenGeneratorModal: () => void;
  currentUser: User | null;
  onSignIn: () => void;
}

export const WORKSPACE_NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget & Optimizer', icon: PieChart },
  { id: 'timeline', label: 'Timeline & Tasks', icon: CheckSquare },
  { id: 'vendors', label: 'Vendors & Ideas', icon: Briefcase },
  { id: 'scenarios', label: 'What-If Simulator', icon: Sliders },
  { id: 'export', label: 'Export & Share', icon: Download },
  { id: 'portfolio', label: 'All Events Portfolio', icon: FolderKanban },
];

/**
 * Renders the left sidebar navigation, mobile switcher, cloud/demo status banner,
 * and the top active-event summary header with `<h1>` focus target and 4 financial KPI cards.
 */
export const WorkspaceSummaryHeader: React.FC<WorkspaceSummaryHeaderProps> = ({
  events,
  activeEvent,
  metrics,
  activeSection,
  onNavigateSection,
  onSelectEvent,
  onOpenGeneratorModal,
  currentUser,
  onSignIn,
}) => {
  const uid = useId();
  const mobileSwitcherId = `${uid}-mobile-event-select`;

  const completedTasks = activeEvent.tasks.filter(
    (t) => t.status === 'Done'
  ).length;
  const totalTasks = activeEvent.tasks.length;
  const taskProgressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <>
      {/* Mobile Event & Section Switcher */}
      <div className="lg:hidden space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor={mobileSwitcherId} className="sr-only">
            Switch active event blueprint
          </label>
          <select
            id={mobileSwitcherId}
            value={activeEvent.id}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E6DFD3] text-xs font-semibold text-[#1F1C18]"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({formatCurrency(ev.totalBudget)})
              </option>
            ))}
          </select>
        </div>
        <div
          role="navigation"
          aria-label="Mobile section navigation"
          className="flex gap-1.5 overflow-x-auto pb-1"
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
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all min-h-[36px] ${
                  active
                    ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                    : 'bg-white text-[#6E655A] border-[#E6DFD3]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode & Persistence Context Banner */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E655A]">
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
              <span>
                <strong className="text-[#1F1C18]">Cloud Sync Active:</strong>{' '}
                Signed in as {currentUser.email || currentUser.displayName}. All
                budget, timeline, and scenario edits sync to Firestore.
              </span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              <span>
                <strong className="text-[#1F1C18]">
                  Interactive Demo Workspace:
                </strong>{' '}
                Changes are saved in your browser. Sign in with Google anytime
                to sync across devices.
              </span>
            </>
          )}
        </div>
        {!currentUser && (
          <button
            type="button"
            onClick={onSignIn}
            className="font-semibold text-[#B8860B] hover:underline"
          >
            Enable Cloud Sync →
          </button>
        )}
      </div>

      {/* Top Event Summary Header Bar */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E6DFD3]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#F3EFE6] text-[#B8860B] font-mono text-xs uppercase tracking-widest font-semibold">
                {activeEvent.type}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold ${
                  metrics.healthStatus === 'Healthy'
                    ? 'bg-[#2E5A44]/15 text-[#34D399]'
                    : metrics.healthStatus === 'Tight'
                    ? 'bg-[#D97706]/15 text-[#FBBF24]'
                    : 'bg-[#A63A2B]/15 text-[#F87171]'
                }`}
              >
                Budget Status: {metrics.healthStatus}
              </span>
            </div>

            <h1
              id="section-main-heading"
              tabIndex={-1}
              className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1C18] focus:outline-none"
            >
              {activeEvent.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E655A]">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                {activeEvent.date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                {activeEvent.location} ({activeEvent.venuePreference})
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Users className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                {activeEvent.guestCount} Guests
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateSection('scenarios')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#E6DFD3] text-xs font-semibold text-[#1F1C18] transition-colors min-h-[38px]"
            >
              <Sliders className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              What-If Simulator
            </button>
            <button
              type="button"
              onClick={onOpenGeneratorModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F1C18] text-white hover:bg-[#332E28] text-xs font-semibold transition-colors min-h-[38px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              Generate Another Plan
            </button>
          </div>
        </div>

        {/* 4 Key Financial & Execution Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block">
              Total Budget Cap
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F1C18] mt-1 block">
              {formatCurrency(metrics.totalBudget)}
            </span>
            <span className="text-xs font-mono text-[#6E655A] mt-0.5 block">
              {formatCurrency(metrics.usableBudget)} usable +{' '}
              {formatCurrency(metrics.contingencyAmount)} buffer (
              {metrics.contingencyPercent}%)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block">
              Planned Allocation
            </span>
            <span
              className={`font-mono text-xl sm:text-2xl font-bold mt-1 block ${
                metrics.isOverAllocated ? 'text-[#F87171]' : 'text-[#34D399]'
              }`}
            >
              {formatCurrency(metrics.totalPlanned)}
            </span>
            <span className="text-xs font-mono text-[#6E655A] mt-0.5 block">
              {metrics.remainingUsable >= 0
                ? `${formatCurrency(metrics.remainingUsable)} unallocated buffer`
                : `${formatCurrency(Math.abs(metrics.remainingUsable))} over usable cap`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block">
              Actual Spent &amp; Per-Guest
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F1C18] mt-1 block">
              {formatCurrency(metrics.totalActual)}
            </span>
            <span className="text-xs font-mono text-[#B8860B] mt-0.5 block">
              Planned: {formatCurrency(metrics.costPerGuestPlanned)} / guest
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block">
              Execution Readiness
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F1C18] mt-1 block">
              {taskProgressPercent}%
            </span>
            <span className="text-xs font-mono text-[#6E655A] mt-0.5 block">
              {completedTasks}/{totalTasks} Tasks ·{' '}
              {
                activeEvent.vendors.filter((v) => v.bookingStatus === 'Booked')
                  .length
              }{' '}
              Vendors Booked
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
