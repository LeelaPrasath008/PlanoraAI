import { useState, useCallback } from 'react';
import { PlanoraEvent } from '../types/event';
import {
  BudgetMetrics,
  rebalanceBudgetToTarget,
  formatCurrency,
} from '../utils/budgetCalculations';
import { OptimizerProposalItem } from '../components/sections/BudgetSection';
import { logClientWarning } from '../utils/clientLogger';

/**
 * Custom hook managing AI and deterministic budget optimization workflows.
 */
export function useBudgetOptimizer(
  activeEvent: PlanoraEvent,
  metrics: BudgetMetrics,
  updateActiveEvent: (updater: (prev: PlanoraEvent) => PlanoraEvent) => void,
  notify: (message: string, tone?: 'info' | 'warning') => void
) {
  const [lockedCategories, setLockedCategories] = useState<string[]>([]);
  const [isOptimizingBudget, setIsOptimizingBudget] = useState(false);
  const [optimizerProposal, setOptimizerProposal] = useState<{
    strategySummary: string;
    adjustments: OptimizerProposalItem[];
  } | null>(null);

  const toggleLockedCategory = useCallback((cat: string) => {
    setLockedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleInstantRebalanceBudget = useCallback(() => {
    updateActiveEvent((prev) => {
      const contingency = Math.round(
        prev.totalBudget * (prev.contingencyPercent / 100)
      );
      const targetUsable = Math.max(0, prev.totalBudget - contingency);
      const rebalanced = rebalanceBudgetToTarget(
        prev.budgetItems,
        targetUsable,
        lockedCategories
      );
      return {
        ...prev,
        budgetItems: rebalanced,
      };
    });
    notify(
      `Rebalanced non-locked categories to fit ${formatCurrency(metrics.usableBudget)} usable budget.`
    );
  }, [updateActiveEvent, lockedCategories, notify, metrics.usableBudget]);

  const handleAiOptimizeBudget = useCallback(async () => {
    setIsOptimizingBudget(true);
    setOptimizerProposal(null);
    try {
      const response = await fetch('/api/ai/optimize-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: activeEvent,
          targetBudget: activeEvent.totalBudget,
          lockedCategories,
        }),
      });

      if (!response.ok) throw new Error('Optimizer request failed');
      const data = await response.json();

      if (Array.isArray(data.adjustments) && data.adjustments.length > 0) {
        setOptimizerProposal({
          strategySummary:
            data.strategySummary ||
            'AI-recommended budget rebalancing to stay within your target cap.',
          adjustments: data.adjustments,
        });
        if (data.usedFallback) {
          notify(
            'Generated proportional optimization preview.',
            'warning'
          );
        } else {
          notify('AI Budget Optimization proposal ready for review below.');
        }
      } else {
        handleInstantRebalanceBudget();
      }
    } catch (error) {
      logClientWarning({
        context: 'useBudgetOptimizer /api/ai/optimize-budget fallback',
        error,
      });
      handleInstantRebalanceBudget();
    } finally {
      setIsOptimizingBudget(false);
    }
  }, [activeEvent, lockedCategories, notify, handleInstantRebalanceBudget]);

  const applyOptimizerProposal = useCallback(() => {
    if (!optimizerProposal) return;
    const adjMap = new Map<string, OptimizerProposalItem>(
      optimizerProposal.adjustments.map((a) => [a.id, a])
    );

    updateActiveEvent((prev) => ({
      ...prev,
      budgetItems: prev.budgetItems.map((item) => {
        const match = adjMap.get(item.id);
        if (!match) return item;
        const nextPlanned = Math.max(0, Math.round(match.recommendedPlanned));
        return {
          ...item,
          plannedAmount: nextPlanned,
          lowEstimate: Math.round(nextPlanned * 0.85),
          highEstimate: Math.round(nextPlanned * 1.15),
        };
      }),
    }));
    setOptimizerProposal(null);
    notify('Applied AI budget optimization adjustments.');
  }, [optimizerProposal, updateActiveEvent, notify]);

  const dismissOptimizerProposal = useCallback(() => {
    setOptimizerProposal(null);
  }, []);

  return {
    lockedCategories,
    isOptimizingBudget,
    optimizerProposal,
    toggleLockedCategory,
    handleInstantRebalanceBudget,
    handleAiOptimizeBudget,
    applyOptimizerProposal,
    dismissOptimizerProposal,
  };
}
