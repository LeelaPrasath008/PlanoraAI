import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Calculator,
  Network,
  Sliders,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import { EventArtwork } from './EventArtwork';
import { DEMO_EVENTS } from '../data/initialEvents';
import { formatCurrency } from '../types/event';

interface LandingPageProps {
  onEnterDemoWorkspace: (demoEventId?: string) => void;
  onStartWizard: () => void;
  onGoogleSignIn: () => void;
  isSigningIn: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterDemoWorkspace,
  onStartWizard,
  onGoogleSignIn,
  isSigningIn,
}) => {
  return (
    <div id="top" className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1E1B4B] focus:text-white focus:rounded-lg focus:text-xs focus:font-semibold"
      >
        Skip to main content
      </a>
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-[#1E1B4B] font-display whitespace-nowrap shrink-0"
        >
          Planora AI
        </a>

        <nav
          aria-label="Landing Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#features"
            className="hover:text-[#1E1B4B] transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#1E1B4B] transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#sample-preview"
            className="hover:text-[#1E1B4B] transition-colors whitespace-nowrap shrink-0"
          >
            Sample Blueprint
          </a>
          <button
            type="button"
            onClick={() => onEnterDemoWorkspace()}
            className="hover:text-[#1E1B4B] transition-colors whitespace-nowrap shrink-0"
          >
            Interactive Demo
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartWizard}
            className="px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Plan My Event
          </motion.button>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-12 space-y-20"
      >
        {/* Hero Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 flex flex-col justify-between gap-8 shadow-xs"
          >
            <div className="space-y-4">
              <div className="text-xs font-medium text-[#059669] flex items-center gap-2">
                <span>GenAI-Powered Event Architecture</span>
                <span aria-hidden="true">·</span>
                <span>Weddings, Birthdays, College & Community Gatherings</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1E1B4B] font-display tracking-tight leading-tight"
                style={{ textWrap: 'balance' } as React.CSSProperties}
              >
                Your Events. Your Budget. Your Perfect Plan.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-[62ch]">
                Transform any event idea, guest count, and budget into a structured production blueprint—complete with category-by-category financial reconciliation, visual task dependency graphs, vendor quotation comparisons, and a live “What If?” Scenario Simulator.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStartWizard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1E1B4B] rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Plan My Event</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onEnterDemoWorkspace()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#1E1B4B] bg-[#FAF8F5] border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Live Demo Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGoogleSignIn}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#059669] hover:underline whitespace-nowrap shrink-0"
                >
                  <span>
                    {isSigningIn
                      ? 'Connecting Account...'
                      : 'Sign In with Google for Private Cloud Sync'}
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>Supports INR (₹), USD ($), EUR (€), GBP (£)</span>
                <span aria-hidden="true">·</span>
                <span>Interactive SVG task dependency graphs</span>
                <span aria-hidden="true">·</span>
                <span>Private Cloud Firestore persistence</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
            className="lg:col-span-5 flex flex-col gap-4"
          >
            <EventArtwork
              category="Wedding"
              title="Aarav & Meera — Courtyard Wedding (150 Guests · ₹3,00,000)"
              location="Jaipur, Rajasthan"
              className="w-full flex-1 min-h-[260px] rounded-2xl border border-slate-200"
            />
            <div className="grid grid-cols-2 gap-4">
              <EventArtwork
                category="Birthday"
                title="Kabir’s 30th Terrace Supper"
                location="Bengaluru · 30 Guests"
                className="h-36 rounded-xl border border-slate-200"
              />
              <EventArtwork
                category="Community"
                title="Greenfield Cultural Mela"
                location="Pune · Volunteer Roster"
                className="h-36 rounded-xl border border-slate-200"
              />
            </div>
          </motion.div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#1E1B4B] font-display">
              Engineered for Real Financial & Operational Control
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Unlike generic checklists or chat-only assistants, Planora AI reconciles every rupee or dollar in application code and visualizes critical task blockers in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Calculator,
                color: 'text-[#1E1B4B]',
                title: '01. Intelligent Budget Ledger',
                desc: 'Track planned, quoted, and actual expenses with low/high uncertainty ranges, interactive donut charts, contingency reserves, and AI budget optimization.',
              },
              {
                icon: Network,
                color: 'text-[#059669]',
                title: '02. Task Dependency Graph & Tree',
                desc: 'Trace upstream blockers and critical paths across animated Directed Dependency Graphs, collapsible Blocker Trees, Calendar, and Milestone views.',
              },
              {
                icon: Sliders,
                color: 'text-[#1E1B4B]',
                title: '03. “What If?” Scenario Simulator',
                desc: 'Test guest count changes, catering tiers, and indoor/outdoor swaps side-by-side before applying updates to your saved event plan.',
              },
              {
                icon: ShieldCheck,
                color: 'text-[#059669]',
                title: '04. Vendor Comparison & Sharing',
                desc: 'Compare quotations side-by-side, export committee-ready PDFs and CSV checklists, and share revocable read-only event links.',
              },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + idx * 0.06 }}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5 transition-shadow hover:shadow-md"
                >
                  <Icon className={`w-5 h-5 ${feat.color}`} />
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1E1B4B] font-display">
                How Planora AI Works in 3 Steps
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                From initial vision to family or committee presentation in minutes
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartWizard}
              className="px-4 py-2 text-xs font-medium text-white bg-[#059669] rounded-lg hover:bg-emerald-700 self-start"
            >
              Launch 5-Step Wizard
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <div className="text-xs font-mono tabular-nums font-bold text-[#059669]">
                01. Define Parameters
              </div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Enter Event Vision, Scale & Priorities
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Specify your event type, city, date, guest count, total budget (INR/USD/EUR/GBP), dietary needs, cultural traditions, and top priorities.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono tabular-nums font-bold text-[#059669]">
                02. Generate & Calibrate
              </div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Receive a Structured AI Blueprint
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Planora AI generates a customized concept, category budget allocations, multi-stage task dependency graphs, vendor archetypes, and risk contingencies.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono tabular-nums font-bold text-[#059669]">
                03. Simulate, Track & Share
              </div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Run “What If?” Scenarios & Export
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compare vendor quotations, consult the AI Copilot with confirmation safeguards, and export printable PDF summaries or CSV task lists.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Sample Event-Plan Preview */}
        <section id="sample-preview" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1E1B4B] font-display">
                Sample Event Blueprint Preview (Illustrative Demo Data)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any demo plan below to open its budget, dependency graph, and simulator inside the interactive workspace
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEMO_EVENTS.map((demo, idx) => {
              const plannedSum = demo.budgetItems.reduce(
                (s, b) => s + b.plannedAmount,
                0
              );
              return (
                <motion.div
                  key={demo.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + idx * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#1E1B4B] hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono tabular-nums">
                      <span>{demo.eventType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{demo.guestCount} Guests</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#059669] font-semibold">
                        {formatCurrency(demo.totalBudget, demo.currency)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#1E1B4B] font-display">
                      {demo.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {demo.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between font-mono tabular-nums text-slate-600">
                      <span>Planned Categories ({demo.budgetItems.length})</span>
                      <span>{formatCurrency(plannedSum, demo.currency)}</span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-slate-600">
                      <span>Dependency Graph Nodes</span>
                      <span>{demo.tasks.length} milestones</span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onEnterDemoWorkspace(demo.id)}
                      className="w-full mt-2 py-2 px-3 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg transition-colors"
                    >
                      Open in Interactive Workspace →
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-5 mt-12">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Planora AI — “Your Events. Your Budget. Your Perfect Plan.”
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onStartWizard}
              className="hover:text-[#1E1B4B]"
            >
              Create Event Plan
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onEnterDemoWorkspace()}
              className="hover:text-[#1E1B4B]"
            >
              Demo Mode
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
