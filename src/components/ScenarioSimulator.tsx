import React, { useState, useMemo } from 'react';
import { Wand2, Loader2, Check, RotateCcw } from 'lucide-react';
import {
  formatCurrency,
  PlanoraEvent,
  VenuePreference,
} from '../types/event';
import {
  CateringTier,
  simulateEventScenario,
} from '../utils/budgetCalculations';

interface ScenarioSimulatorProps {
  event: PlanoraEvent;
  onApplyScenario: (updatedEvent: PlanoraEvent) => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = React.memo(({
  event,
  onApplyScenario,
}) => {
  const [simGuests, setSimGuests] = useState<number>(event.guestCount);
  const [simBudget, setSimBudget] = useState<number>(event.totalBudget);
  const [simDate, setSimDate] = useState<string>(event.eventDate);
  const [simVenue, setSimVenue] = useState<VenuePreference>(
    event.venuePreference
  );
  const [cateringTier, setCateringTier] = useState<CateringTier>(
    'Signature (Baseline)'
  );
  const [simPriorities, setSimPriorities] = useState<string>(event.priorities);

  const [aiAnalysis, setAiAnalysis] = useState<{
    tradeOffAnalysis: string;
    recommendations: string[];
    isDeterministicFallback?: boolean;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState(false);

  // Reset simulator when switching events
  React.useEffect(() => {
    setSimGuests(event.guestCount);
    setSimBudget(event.totalBudget);
    setSimDate(event.eventDate);
    setSimVenue(event.venuePreference);
    setCateringTier('Signature (Baseline)');
    setSimPriorities(event.priorities);
    setAiAnalysis(null);
    setAppliedBanner(false);
  }, [event.id, event.guestCount, event.totalBudget, event.eventDate, event.venuePreference, event.priorities]);

  // Deterministic Application-Code Math for Scenario Comparison
  const comparison = useMemo(
    () =>
      simulateEventScenario(event, {
        simGuests,
        simBudget,
        simDate,
        simVenue,
        cateringTier,
      }),
    [event, simGuests, simBudget, simDate, simVenue, cateringTier]
  );

  const handleRequestAiTradeOffs = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/simulate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: {
            guestCount: event.guestCount,
            totalBudget: event.totalBudget,
            currency: event.currency,
            eventDate: event.eventDate,
            venuePreference: event.venuePreference,
            priorities: event.priorities,
          },
          simulatedScenario: {
            guestCount: simGuests,
            totalBudget: simBudget,
            eventDate: simDate,
            venuePreference: simVenue,
            cateringTier,
            priorityFocus: simPriorities,
            projectedTotalSpend: comparison.projectedTotalSpend,
            projectedRemaining: comparison.projectedRemaining,
          },
        }),
      });
      const data = await res.json();
      setAiAnalysis({
        tradeOffAnalysis:
          data.tradeOffAnalysis ||
          'Compared current baseline against proposed parameters.',
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations
          : [],
        isDeterministicFallback: data.isDeterministicFallback,
      });
    } catch {
      setAiAnalysis({
        tradeOffAnalysis:
          'Unable to reach AI advisor; review the deterministic category-by-category math below.',
        recommendations: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmApply = () => {
    // Recalculate task due dates if eventDate shifted
    const updatedTasks = event.tasks.map((t) => {
      if (comparison.dayShift === 0) return t;
      const ms = new Date(t.dueDate).getTime();
      if (!Number.isFinite(ms)) return t;
      const shifted = new Date(ms + comparison.dayShift * 86400000)
        .toISOString()
        .slice(0, 10);
      return { ...t, dueDate: shifted };
    });

    const updatedBudgetItems = comparison.simulatedItems.map((si) => ({
      id: si.id,
      eventId: si.eventId,
      ownerId: si.ownerId,
      category: si.category,
      title: si.title,
      plannedAmount: si.simulatedPlanned,
      quotedAmount: si.quotedAmount,
      actualAmount: si.actualAmount,
      lowEstimate: Math.round(si.simulatedPlanned * 0.9),
      highEstimate: Math.round(si.simulatedPlanned * 1.12),
      paymentStatus: si.paymentStatus,
      notes: si.notes,
    }));

    onApplyScenario({
      ...event,
      guestCount: simGuests,
      totalBudget: simBudget,
      eventDate: simDate,
      venuePreference: simVenue,
      priorities: simPriorities,
      budgetItems: updatedBudgetItems,
      tasks: updatedTasks,
    });
    setAppliedBanner(true);
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B] font-display">
              Interactive “What If?” Scenario Simulator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust guest count, budget, date, venue setting, and catering tier. Preview exact numeric impacts before confirming changes.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSimGuests(event.guestCount);
                setSimBudget(event.totalBudget);
                setSimDate(event.eventDate);
                setSimVenue(event.venuePreference);
                setCateringTier('Signature (Baseline)');
                setSimPriorities(event.priorities);
                setAppliedBanner(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Current</span>
            </button>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleRequestAiTradeOffs}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>Analyze Trade-Offs with AI</span>
            </button>
          </div>
        </div>

        {/* Interactive Parameter Sliders & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700">
                Simulated Guest Count
              </label>
              <span className="font-mono tabular-nums font-bold text-[#1E1B4B]">
                {simGuests} guests (was {event.guestCount})
              </span>
            </div>
            <input
              type="range"
              aria-label="Simulated Guest Count"
              min={10}
              max={Math.max(500, event.guestCount * 2)}
              step={5}
              value={simGuests}
              onChange={(e) => {
                setSimGuests(Number(e.target.value));
                setAppliedBanner(false);
              }}
              className="w-full accent-[#1E1B4B]"
            />
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700">
                Simulated Total Budget
              </label>
              <span className="font-mono tabular-nums font-bold text-[#1E1B4B]">
                {formatCurrency(simBudget, event.currency)}
              </span>
            </div>
            <input
              type="range"
              aria-label="Simulated Total Budget"
              min={Math.round(event.totalBudget * 0.4)}
              max={Math.round(event.totalBudget * 2)}
              step={Math.max(500, Math.round(event.totalBudget * 0.02))}
              value={simBudget}
              onChange={(e) => {
                setSimBudget(Number(e.target.value));
                setAppliedBanner(false);
              }}
              className="w-full accent-[#1E1B4B]"
            />
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Catering & Hospitality Tier
            </label>
            <select
              aria-label="Catering and Hospitality Tier"
              value={cateringTier}
              onChange={(e) => {
                setCateringTier(e.target.value as CateringTier);
                setAppliedBanner(false);
              }}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
            >
              <option value="Essential (-18%)">
                Essential Tier (-18% per plate)
              </option>
              <option value="Signature (Baseline)">
                Signature Tier (Current Baseline)
              </option>
              <option value="Luxury (+25%)">
                Luxury Tier (+25% gourmet counters)
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Proposed Event Date
            </label>
            <input
              type="date"
              aria-label="Proposed Event Date"
              value={simDate}
              onChange={(e) => {
                setSimDate(e.target.value);
                setAppliedBanner(false);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
            />
            {comparison.dayShift !== 0 && (
              <p className="text-xs text-amber-800 mt-1 font-mono tabular-nums">
                Shifts all task deadlines by{' '}
                {comparison.dayShift > 0
                  ? `+${comparison.dayShift}`
                  : comparison.dayShift}{' '}
                days
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Venue Type Setting
            </label>
            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              {(['Indoor', 'Outdoor', 'Hybrid'] as VenuePreference[]).map(
                (v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setSimVenue(v);
                      setAppliedBanner(false);
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-md ${
                      simVenue === v
                        ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Priority Focus
            </label>
            <input
              type="text"
              aria-label="Priority Focus"
              value={simPriorities}
              onChange={(e) => setSimPriorities(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
            />
          </div>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Current Saved Plan ({event.guestCount} Guests)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500">Planned Spend</div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(
                    comparison.currentTotalPlanned,
                    event.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Contingency</div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(comparison.currentContingency, event.currency)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Remaining Buffer</div>
                <div
                  className={`font-bold ${
                    comparison.currentRemaining >= 0
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(comparison.currentRemaining, event.currency)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-[#1E1B4B]">
              Proposed Scenario Preview ({simGuests} Guests · {cateringTier})
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-600">Projected Spend</div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(
                    comparison.projectedTotalSpend,
                    event.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-slate-600">Contingency</div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(
                    comparison.projectedContingency,
                    event.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-slate-600">Net Balance</div>
                <div
                  className={`font-bold ${
                    comparison.projectedRemaining >= 0
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(
                    comparison.projectedRemaining,
                    event.currency
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Trade-Off Analysis Box */}
        {aiAnalysis && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-[#1E1B4B]">
              AI Scenario Trade-Off Assessment
            </div>
            <p className="text-slate-700 leading-relaxed">
              {aiAnalysis.tradeOffAnalysis}
            </p>
            {aiAnalysis.recommendations.length > 0 && (
              <ul className="list-disc list-inside text-slate-600 space-y-1 pt-1">
                {aiAnalysis.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Category Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-4 font-medium">Category & Item</th>
                <th className="py-2.5 px-4 font-medium text-right">
                  Current Planned
                </th>
                <th className="py-2.5 px-4 font-medium text-right">
                  Scenario Estimate
                </th>
                <th className="py-2.5 px-4 font-medium text-right">
                  Net Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {comparison.simulatedItems.map((si) => (
                <tr key={si.id}>
                  <td className="py-2.5 px-4">
                    <span className="font-medium text-slate-900">
                      {si.category}
                    </span>{' '}
                    <span className="text-slate-500">· {si.title}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(si.plannedAmount, event.currency)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatCurrency(si.simulatedPlanned, event.currency)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                      si.delta <= 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {si.delta === 0
                      ? 'No change'
                      : si.delta > 0
                      ? `+${formatCurrency(si.delta, event.currency)}`
                      : `-${formatCurrency(Math.abs(si.delta), event.currency)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Explicit User Confirmation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {appliedBanner
              ? 'Scenario confirmed and saved to your active event plan.'
              : 'Preview only — your saved event plan will not change until you explicitly confirm.'}
          </span>
          <button
            type="button"
            onClick={handleConfirmApply}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-lg whitespace-nowrap shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm & Apply Scenario to Saved Plan</span>
          </button>
        </div>
      </div>
    </section>
  );
});
