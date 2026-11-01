import React, { useState, useMemo, useId } from 'react';
import {
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Loader2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { PlanoraEvent, SavedScenario } from '../types/event';
import { formatCurrency } from '../utils/budgetCalculations';
import { logClientWarning } from '../utils/clientLogger';

export interface ScenarioSimulatorProps {
  event: PlanoraEvent;
  onSaveScenario: (scenario: SavedScenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onApplyScenarioToPlan: (scenario: SavedScenario) => void;
}

const VENUE_MULTIPLIERS = { Budget: 0.72, Standard: 1.0, Premium: 1.35 } as const;
const CATERING_MULTIPLIERS = { Buffet: 0.8, Cocktail: 0.72, Plated: 1.15 } as const;
const DECOR_MULTIPLIERS = { Minimal: 0.65, Curated: 1.0, Luxury: 1.45 } as const;

/**
 * Interactive What-If Scenario Simulator with accessible sliders, `<fieldset>` + `<legend>`
 * option groups, side-by-side comparison cards, and AI trade-off analysis.
 */
export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  event,
  onSaveScenario,
  onDeleteScenario,
  onApplyScenarioToPlan,
}) => {
  const uid = useId();
  const nameInputId = `${uid}-scenario-name`;
  const guestRangeId = `${uid}-scenario-guests`;
  const budgetRangeId = `${uid}-scenario-budget`;

  const [scenarioName, setScenarioName] = useState('Alternative Option');
  const [guestCount, setGuestCount] = useState(event.guestCount);
  const [totalBudget, setTotalBudget] = useState(event.totalBudget);
  const [venueTier, setVenueTier] = useState<'Budget' | 'Standard' | 'Premium'>('Standard');
  const [cateringStyle, setCateringStyle] = useState<'Buffet' | 'Plated' | 'Cocktail'>('Plated');
  const [decorLevel, setDecorLevel] = useState<'Minimal' | 'Curated' | 'Luxury'>('Curated');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    tradeOffAnalysis: string;
    recommendations: string[];
  } | null>(null);

  const baselinePlanned = useMemo(
    () => event.budgetItems.reduce((s, i) => s + i.plannedAmount, 0),
    [event.budgetItems]
  );

  const simulatedMetrics = useMemo(() => {
    const guestRatio = guestCount / Math.max(1, event.guestCount);
    const venueMult = VENUE_MULTIPLIERS[venueTier];
    const cateringMult = CATERING_MULTIPLIERS[cateringStyle];
    const decorMult = DECOR_MULTIPLIERS[decorLevel];

    let estimatedTotal = 0;
    for (const item of event.budgetItems) {
      const cat = item.category.toLowerCase();
      if (cat.includes('catering') || cat.includes('food') || cat.includes('bar')) {
        estimatedTotal += item.plannedAmount * guestRatio * cateringMult;
      } else if (cat.includes('venue') || cat.includes('space')) {
        estimatedTotal += item.plannedAmount * venueMult;
      } else if (cat.includes('decor') || cat.includes('floral') || cat.includes('lighting')) {
        estimatedTotal += item.plannedAmount * decorMult;
      } else {
        estimatedTotal += item.plannedAmount * (0.7 + 0.3 * guestRatio);
      }
    }

    const roundedTotal = Math.round(estimatedTotal / 50) * 50;
    const contingencyReserve = Math.round(totalBudget * (event.contingencyPercent / 100));
    const usableCap = totalBudget - contingencyReserve;
    const deltaFromBaseline = roundedTotal - baselinePlanned;
    const perGuest = Math.round(roundedTotal / Math.max(1, guestCount));
    const fitsUsable = roundedTotal <= usableCap;

    return {
      estimatedTotal: roundedTotal,
      usableCap,
      deltaFromBaseline,
      perGuest,
      fitsUsable,
    };
  }, [
    guestCount,
    totalBudget,
    venueTier,
    cateringStyle,
    decorLevel,
    event.guestCount,
    event.budgetItems,
    event.contingencyPercent,
    baselinePlanned,
  ]);

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/simulate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: {
            title: event.title,
            guestCount: event.guestCount,
            totalBudget: event.totalBudget,
            plannedTotal: baselinePlanned,
          },
          simulatedScenario: {
            name: scenarioName,
            guestCount,
            totalBudget,
            venueTier,
            cateringStyle,
            decorLevel,
            estimatedTotalCost: simulatedMetrics.estimatedTotal,
          },
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAiAnalysis({
        tradeOffAnalysis: String(data.tradeOffAnalysis || ''),
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations.map(String)
          : [],
      });
    } catch (error) {
      logClientWarning({
        context: 'ScenarioSimulator /api/ai/simulate-scenario fallback',
        error,
      });
      setAiAnalysis({
        tradeOffAnalysis: `Under the "${scenarioName}" configuration (${guestCount} guests, ${venueTier} venue, ${cateringStyle} catering), projected spend is ${formatCurrency(simulatedMetrics.estimatedTotal)} (${formatCurrency(simulatedMetrics.perGuest)}/guest).`,
        recommendations: [
          'Lock catering guest-count guarantees 21 days prior to event date.',
          'Preserve your contingency reserve for last-minute AV or weather needs.',
        ],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSnapshot = () => {
    const newScenario: SavedScenario = {
      id: `scen_${Date.now()}`,
      name: scenarioName.trim() || `Scenario (${guestCount} Guests)`,
      guestCount,
      totalBudget,
      venueTier,
      cateringStyle,
      decorLevel,
      estimatedTotalCost: simulatedMetrics.estimatedTotal,
      summaryNotes: `${venueTier} venue · ${cateringStyle} catering · ${decorLevel} décor (${formatCurrency(simulatedMetrics.perGuest)}/guest)`,
    };
    onSaveScenario(newScenario);
  };

  const handleReset = () => {
    setGuestCount(event.guestCount);
    setTotalBudget(event.totalBudget);
    setVenueTier('Standard');
    setCateringStyle('Plated');
    setDecorLevel('Curated');
    setAiAnalysis(null);
  };

  return (
    <div className="space-y-6" aria-busy={isAnalyzing}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-[#1F1C18] text-[#FAF7F2] flex items-center justify-center"
              >
                <Sliders className="w-4 h-4 text-[#B8860B]" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
                  What-If Scenario Sandbox
                </h3>
                <p className="text-xs text-[#6E655A]">
                  Simulate guest count, budget cap, and service tiers without
                  overwriting your live plan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-semibold text-[#6E655A] hover:text-[#1F1C18] min-h-[32px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset
            </button>
          </div>

          <div>
            <label
              htmlFor={nameInputId}
              className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-1.5"
            >
              Scenario Snapshot Name
            </label>
            <input
              id={nameInputId}
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., Intimate Luxury Option or High-Capacity Cocktail Format"
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs text-[#1F1C18]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label
                  htmlFor={guestRangeId}
                  className="font-semibold text-[#6E655A] uppercase"
                >
                  Simulated Guests
                </label>
                <span className="font-mono font-bold text-[#1F1C18]">
                  {guestCount} (Base: {event.guestCount})
                </span>
              </div>
              <input
                id={guestRangeId}
                type="range"
                min={20}
                max={Math.max(500, event.guestCount * 2)}
                step={5}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full accent-[#22D3EE]"
              />
            </div>

            <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label
                  htmlFor={budgetRangeId}
                  className="font-semibold text-[#6E655A] uppercase"
                >
                  Simulated Cap
                </label>
                <span className="font-mono font-bold text-[#34D399]">
                  {formatCurrency(totalBudget)}
                </span>
              </div>
              <input
                id={budgetRangeId}
                type="range"
                min={3000}
                max={Math.max(150000, event.totalBudget * 1.6)}
                step={500}
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full accent-[#34D399]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-1.5">
                Venue Tier
              </legend>
              <div className="flex flex-col gap-1.5">
                {(['Budget', 'Standard', 'Premium'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={venueTier === tier}
                    onClick={() => setVenueTier(tier)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all min-h-[34px] ${
                      venueTier === tier
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                        : 'bg-[#FAF7F2] text-[#1F1C18] border-[#E6DFD3]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-1.5">
                Catering Style
              </legend>
              <div className="flex flex-col gap-1.5">
                {(['Cocktail', 'Buffet', 'Plated'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={cateringStyle === style}
                    onClick={() => setCateringStyle(style)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all min-h-[34px] ${
                      cateringStyle === style
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                        : 'bg-[#FAF7F2] text-[#1F1C18] border-[#E6DFD3]'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-1.5">
                Décor &amp; Production
              </legend>
              <div className="flex flex-col gap-1.5">
                {(['Minimal', 'Curated', 'Luxury'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={decorLevel === level}
                    onClick={() => setDecorLevel(level)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all min-h-[34px] ${
                      decorLevel === level
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                        : 'bg-[#FAF7F2] text-[#1F1C18] border-[#E6DFD3]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Right Live Impact Card */}
        <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
                Projected Financial Impact
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  simulatedMetrics.fitsUsable
                    ? 'bg-[#2E5A44]/15 text-[#34D399]'
                    : 'bg-[#A63A2B]/15 text-[#F87171]'
                }`}
              >
                {simulatedMetrics.fitsUsable
                  ? 'Within Usable Cap'
                  : 'Exceeds Usable Cap'}
              </span>
            </div>

            <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-2xl p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#6E655A]">
                  Simulated Total Spend
                </span>
                <span className="font-mono text-2xl font-bold text-[#1F1C18]">
                  {formatCurrency(simulatedMetrics.estimatedTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-[#E6DFD3] pt-2">
                <span className="text-[#6E655A]">Delta vs Current Plan</span>
                <span
                  className={`font-mono font-semibold ${
                    simulatedMetrics.deltaFromBaseline <= 0
                      ? 'text-[#34D399]'
                      : 'text-[#F87171]'
                  }`}
                >
                  {simulatedMetrics.deltaFromBaseline > 0 ? '+' : ''}
                  {formatCurrency(simulatedMetrics.deltaFromBaseline)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6E655A]">Simulated Cost / Guest</span>
                <span className="font-mono font-semibold text-[#1F1C18]">
                  {formatCurrency(simulatedMetrics.perGuest)} / guest
                </span>
              </div>
            </div>

            {aiAnalysis && (
              <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-4 space-y-2 text-xs">
                <span className="font-mono uppercase tracking-wider text-[#B8860B] font-semibold block">
                  AI Trade-Off Analysis
                </span>
                <p className="text-[#1F1C18] leading-relaxed">
                  {aiAnalysis.tradeOffAnalysis}
                </p>
                <ul className="space-y-1 pt-1">
                  {aiAnalysis.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-1.5 text-[#6E655A]"
                    >
                      <ArrowRight
                        className="w-3.5 h-3.5 text-[#34D399] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors disabled:opacity-60 min-h-[38px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Analyzing Trade-Offs...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                  AI Trade-Off Analysis
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:border-[#B8860B] transition-colors min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Save Snapshot
            </button>
          </div>
        </div>
      </div>

      {/* Saved Scenarios Comparison Grid */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-4">
        <h4 className="font-serif text-lg font-bold text-[#1F1C18]">
          Saved Scenario Snapshots ({event.savedScenarios.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {event.savedScenarios.map((scen) => (
            <div
              key={scen.id}
              className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-serif text-base font-bold text-[#1F1C18]">
                    {scen.name}
                  </h5>
                  <button
                    type="button"
                    onClick={() => onDeleteScenario(scen.id)}
                    aria-label={`Delete scenario ${scen.name}`}
                    className="p-1 text-[#CBD5E1] hover:text-[#F87171]"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-[#6E655A] mt-1">
                  {scen.summaryNotes}
                </p>
                <div className="mt-3 pt-2 border-t border-[#E6DFD3] flex items-center justify-between text-xs font-mono">
                  <span>{scen.guestCount} guests</span>
                  <span className="font-bold text-[#1F1C18]">
                    Est. {formatCurrency(scen.estimatedTotalCost)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplyScenarioToPlan(scen)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F1C18] text-white text-xs font-semibold hover:bg-[#332E28] transition-colors min-h-[34px]"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Apply Scenario
                to Active Plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
