import React from 'react';
import {
  Sparkles,
  PieChart,
  Calendar,
  Sliders,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Users,
  Briefcase,
} from 'lucide-react';
import { PlanoraEvent } from '../types/event';
import { formatCurrency } from '../utils/budgetCalculations';
import { EventArtwork } from './EventArtwork';

interface LandingPageProps {
  sampleEvents: PlanoraEvent[];
  onEnterWorkspace: (eventId?: string) => void;
  onOpenGenerator: () => void;
}

/**
 * Editorial landing page for Planora AI with accessible headings,
 * interactive showcase blueprints, and WCAG AA contrast.
 */
export const LandingPage: React.FC<LandingPageProps> = ({
  sampleEvents,
  onEnterWorkspace,
  onOpenGenerator,
}) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Editorial Hero Section */}
      <section className="relative rounded-3xl bg-[#F3EFE6] border border-[#E6DFD3] p-8 sm:p-12 lg:p-16 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#B8860B]/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#2E5A44]/10 blur-3xl pointer-events-none"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DFD3] text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              AI Event Planning &amp; Budget Intelligence
            </div>

            <h1
              id="section-main-heading"
              tabIndex={-1}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1F1C18] leading-[1.08] tracking-tight focus:outline-none"
            >
              Orchestrate Extraordinary Events Without Budget Surprises.
            </h1>

            <p className="text-base sm:text-lg text-[#6E655A] max-w-2xl leading-relaxed">
              Planora AI transforms raw event goals—guest count, location,
              priorities, and budget cap—into a mathematically balanced budget
              allocation, milestone timeline, vendor pipeline, and live what-if
              scenario simulator.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onOpenGenerator}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#1F1C18] text-[#FAF7F2] text-sm font-semibold hover:bg-[#332E28] transition-all shadow-md min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
                Generate Custom AI Blueprint
              </button>

              <button
                type="button"
                onClick={() => onEnterWorkspace(sampleEvents[0]?.id)}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-[#E6DFD3] text-[#1F1C18] text-sm font-semibold hover:border-[#1F1C18] transition-all min-h-[44px]"
              >
                Explore Live Interactive Workspace
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#E6DFD3]/80 max-w-xl">
              <div>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F1C18] block">
                  100%
                </span>
                <span className="text-xs text-[#6E655A]">
                  Budget-Balanced Allocations
                </span>
              </div>
              <div>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#2E5A44] block">
                  Real-Time
                </span>
                <span className="text-xs text-[#6E655A]">
                  What-If Scenario Modeling
                </span>
              </div>
              <div>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#B8860B] block">
                  360°
                </span>
                <span className="text-xs text-[#6E655A]">
                  Budget · Timeline · Vendors
                </span>
              </div>
            </div>
          </div>

          {/* Right Live Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
                    Live Blueprint Preview
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#1F1C18]">
                    Botanical Garden Wedding
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#2E5A44]/10 text-[#34D399] font-mono text-xs font-semibold">
                  On Budget
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
                  <span className="text-xs uppercase tracking-wider text-[#6E655A] block">
                    Total Budget Cap
                  </span>
                  <span className="font-mono text-lg font-bold text-[#1F1C18]">
                    $68,000
                  </span>
                  <span className="text-xs text-[#34D399] block mt-0.5 font-mono">
                    $6,800 (10%) Contingency
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]">
                  <span className="text-xs uppercase tracking-wider text-[#6E655A] block">
                    Target Per Guest
                  </span>
                  <span className="font-mono text-lg font-bold text-[#1F1C18]">
                    $425 / guest
                  </span>
                  <span className="text-xs text-[#6E655A] block mt-0.5 font-mono">
                    140 Confirmed Guests
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1F1C18]">
                    Venue &amp; Conservatory Rental
                  </span>
                  <span className="font-mono text-[#6E655A]">
                    $18,500 (30%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F3EFE6] overflow-hidden">
                  <div
                    className="bg-[#B8860B] h-full rounded-full"
                    style={{ width: '30%' }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-medium text-[#1F1C18]">
                    Farm-to-Table Catering &amp; Bar
                  </span>
                  <span className="font-mono text-[#6E655A]">
                    $21,000 (34%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F3EFE6] overflow-hidden">
                  <div
                    className="bg-[#2E5A44] h-full rounded-full"
                    style={{ width: '34%' }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-medium text-[#1F1C18]">
                    Botanical Floral &amp; Candlelight
                  </span>
                  <span className="font-mono text-[#6E655A]">$8,200 (13%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F3EFE6] overflow-hidden">
                  <div
                    className="bg-[#D97706] h-full rounded-full"
                    style={{ width: '13%' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEnterWorkspace(sampleEvents[0]?.id)}
                className="w-full py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#E6DFD3] text-xs font-semibold text-[#1F1C18] transition-colors flex items-center justify-center gap-1.5 min-h-[38px]"
              >
                Open This Blueprint in Workspace{' '}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
            Built for Real-World Execution
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1C18]">
            Everything Required to Plan Within Budget
          </h2>
          <p className="text-sm text-[#6E655A]">
            Move seamlessly from high-level AI concept generation to granular
            cost control, vendor negotiation, and timeline execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Sparkles,
              title: 'AI Event Blueprint Generator',
              desc: 'Enter your event type, guest count, date, and budget cap to synthesize a complete, realistic line-item budget, milestone checklist, and vendor strategy.',
            },
            {
              icon: PieChart,
              title: 'Dynamic Budget Optimizer',
              desc: 'Track Planned vs. Quoted vs. Actual spend, lock non-negotiable categories, reserve emergency contingency buffers, and auto-rebalance over-allocations.',
            },
            {
              icon: Sliders,
              title: 'What-If Scenario Simulator',
              desc: 'Test how scaling guest count, switching from plated to buffet catering, or upgrading venue tiers impacts total cost and per-guest economics.',
            },
            {
              icon: Calendar,
              title: 'Milestone Timeline & Runbook',
              desc: 'Structured countdown tasks across 90+, 60, 30, and 7 days out with priority filtering, status tracking, and monthly calendar grouping.',
            },
            {
              icon: Briefcase,
              title: 'Vendor Shortlist & Quote Tracker',
              desc: 'Manage vendor contacts, compare estimated prices against formal quotes, track booking statuses, and store creative execution ideas.',
            },
            {
              icon: ShieldCheck,
              title: 'Proactive Risk & Export Hub',
              desc: 'Identify hidden costs early, chat with the contextual AI Co-Pilot to apply live changes, and export clean CSV spreadsheets or print briefs.',
            },
          ].map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs hover:border-[#B8860B]/60 transition-all space-y-3"
              >
                <div
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex items-center justify-center text-[#1F1C18]"
                >
                  <Icon className="w-5 h-5 text-[#B8860B]" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
                  {feat.title}
                </h3>
                <p className="text-xs text-[#6E655A] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Showcase Blueprints */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#2E5A44] font-semibold">
              Instant Demo Blueprints
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#1F1C18]">
              Explore Pre-Built Event Plans
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenGenerator}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8860B] hover:underline"
          >
            Or build a custom event from scratch{' '}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleEvents.map((ev) => {
            const plannedSum = ev.budgetItems.reduce(
              (s, b) => s + b.plannedAmount,
              0
            );
            const doneTasks = ev.tasks.filter(
              (t) => t.status === 'Done'
            ).length;
            return (
              <div
                key={ev.id}
                onClick={() => onEnterWorkspace(ev.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open blueprint for ${ev.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEnterWorkspace(ev.id);
                  }
                }}
                className="group bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#1F1C18] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 w-full overflow-hidden border-b border-[#E6DFD3] relative">
                    <EventArtwork type={ev.type} />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-[#1F1C18] text-xs font-mono uppercase font-semibold border border-[#E6DFD3]">
                        {ev.type}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-[#1F1C18]/85 backdrop-blur-xs text-white font-mono text-xs font-bold">
                      {formatCurrency(ev.totalBudget)}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#1F1C18] group-hover:text-[#B8860B] transition-colors">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-[#6E655A] mt-1">
                        {ev.location} · {ev.date}
                      </p>
                    </div>

                    <p className="text-xs text-[#6E655A] line-clamp-3 leading-relaxed">
                      {ev.aiConceptSummary}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-[#E6DFD3] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#6E655A]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                      {ev.guestCount} guests
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Layers className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                      {formatCurrency(plannedSum)} allocated
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[#34D399]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                      {doneTasks}/{ev.tasks.length}
                    </span>
                  </div>

                  <div className="w-full py-2 rounded-xl bg-[#FAF7F2] group-hover:bg-[#1F1C18] group-hover:text-white text-[#1F1C18] text-xs font-semibold text-center transition-colors">
                    Launch Blueprint Workspace →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
