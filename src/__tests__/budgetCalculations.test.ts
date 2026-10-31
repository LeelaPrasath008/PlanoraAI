import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetSummary,
  simulateEventScenario,
  applyBudgetOptimization,
  applyConfirmedCopilotChange,
} from '../utils/budgetCalculations';
import { DEMO_EVENTS } from '../data/initialEvents';

describe('Budget Calculations & Scenario Simulation Engine', () => {
  it('computes accurate budget summary, contingency, per-guest cost, and remaining buffer', () => {
    const sample = DEMO_EVENTS[0];
    const summary = calculateBudgetSummary(sample);

    const expectedPlanned = sample.budgetItems.reduce(
      (sum: number, item) => sum + item.plannedAmount,
      0
    );
    const expectedContingency = Math.round(
      sample.totalBudget * (sample.contingencyPercent / 100)
    );

    assert.equal(summary.plannedTotal, expectedPlanned);
    assert.equal(summary.contingencyAmount, expectedContingency);
    assert.equal(
      summary.remainingBudget,
      sample.totalBudget - expectedPlanned - expectedContingency
    );
    assert.equal(
      summary.perGuestPlanned,
      Math.round(expectedPlanned / sample.guestCount)
    );
  });

  it('scales Catering and Venue proportionally in simulateEventScenario', () => {
    const sample = DEMO_EVENTS[0];
    const doubledGuests = sample.guestCount * 2;
    const sim = simulateEventScenario(sample, {
      simGuests: doubledGuests,
      simBudget: sample.totalBudget * 2,
      simDate: '2027-03-01',
      simVenue: 'Outdoor',
      cateringTier: 'Luxury (+25%)',
    });

    assert.ok(sim.projectedTotalSpend > sim.currentTotalPlanned);
    assert.notEqual(sim.dayShift, 0);
    assert.equal(sim.simulatedItems.length, sample.budgetItems.length);
  });

  it('applies confirmed budget optimization adjustments accurately', () => {
    const sample = DEMO_EVENTS[0];
    const firstItem = sample.budgetItems[0];
    const newPlanned = Math.round(firstItem.plannedAmount * 0.85);

    const optimizedItems = applyBudgetOptimization(sample.budgetItems, [
      {
        id: firstItem.id,
        category: firstItem.category,
        title: firstItem.title,
        currentPlanned: firstItem.plannedAmount,
        recommendedPlanned: newPlanned,
        rationale: 'Negotiate early-bird package discount',
      },
    ]);

    assert.equal(optimizedItems[0].plannedAmount, newPlanned);
  });

  it('applies confirmed Copilot actions deterministically across budget, tasks, and vendors', () => {
    const sample = DEMO_EVENTS[0];

    const addTaskResult = applyConfirmedCopilotChange(
      sample,
      {
        type: 'add_task',
        summaryLabel: 'Add Valet Coordination Milestone',
        payload: {
          title: 'Confirm Valet Parking Marshals',
          category: 'Logistics',
          priority: 'High',
          dueDate: '2027-02-01',
        },
      },
      'user_test'
    );
    assert.equal(
      addTaskResult.updatedEvent.tasks.length,
      sample.tasks.length + 1
    );
    assert.ok(addTaskResult.addedTask);

    const addVendorResult = applyConfirmedCopilotChange(
      sample,
      {
        type: 'add_vendor',
        summaryLabel: 'Shortlist Acoustic Trio',
        payload: {
          vendorName: 'Aria Strings Collective',
          category: 'Music & Entertainment',
          estimatedPrice: 35000,
        },
      },
      'user_test'
    );
    assert.equal(
      addVendorResult.updatedEvent.vendors.length,
      sample.vendors.length + 1
    );
    assert.ok(addVendorResult.addedVendor);
  });
});
