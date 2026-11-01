import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetMetrics,
  rebalanceBudgetToTarget,
  formatCurrency,
} from '../utils/budgetCalculations';
import { PlanoraEvent, BudgetItem } from '../types/event';

function createMockEvent(overrides: Partial<PlanoraEvent> = {}): PlanoraEvent {
  return {
    id: 'evt_test_1',
    title: 'Test Gala',
    type: 'Charity Gala',
    date: '2026-10-15',
    location: 'San Francisco, CA',
    venuePreference: 'Indoor Luxury Venue',
    guestCount: 100,
    totalBudget: 50000,
    contingencyPercent: 10,
    notes: '',
    priorities: ['Catering'],
    aiConceptSummary: 'Summary',
    aiRisksAndContingencies: 'Risks',
    budgetItems: [
      {
        id: 'b1',
        category: 'Venue & Rentals',
        title: 'Ballroom Rental',
        plannedAmount: 15000,
        quotedAmount: 15500,
        actualAmount: 15000,
        lowEstimate: 13000,
        highEstimate: 17000,
        paymentStatus: 'Paid',
        notes: '',
      },
      {
        id: 'b2',
        category: 'Catering & Bar',
        title: 'Plated Dinner',
        plannedAmount: 20000,
        quotedAmount: 21000,
        actualAmount: 10000,
        lowEstimate: 17000,
        highEstimate: 23000,
        paymentStatus: 'Partial',
        notes: '',
      },
    ],
    tasks: [],
    vendors: [],
    ideas: [],
    savedScenarios: [],
    updatedAt: '2026-03-01',
    ...overrides,
  };
}

describe('Budget Calculations & Rebalancer Unit Tests', () => {
  it('computes contingency, usable budget, and category breakdowns accurately', () => {
    const event = createMockEvent();
    const metrics = calculateBudgetMetrics(event);

    assert.equal(metrics.totalBudget, 50000);
    assert.equal(metrics.contingencyAmount, 5000);
    assert.equal(metrics.usableBudget, 45000);
    assert.equal(metrics.totalPlanned, 35000);
    assert.equal(metrics.totalQuoted, 36500);
    assert.equal(metrics.totalActual, 25000);
    assert.equal(metrics.remainingUsable, 10000);
    assert.equal(metrics.costPerGuestPlanned, 350);
    assert.equal(metrics.isOverAllocated, false);
    assert.equal(metrics.healthStatus, 'Healthy');
    assert.equal(metrics.paidTotal, 15000);
    assert.equal(metrics.unpaidTotal, 20000);
    assert.equal(metrics.categoryBreakdown.length, 2);
  });

  it('flags Over Allocated status when planned exceeds usable budget or actual exceeds total budget', () => {
    const event = createMockEvent({
      totalBudget: 30000,
      contingencyPercent: 10,
    });
    const metrics = calculateBudgetMetrics(event);

    assert.equal(metrics.usableBudget, 27000);
    assert.equal(metrics.totalPlanned, 35000);
    assert.equal(metrics.isOverAllocated, true);
    assert.equal(metrics.overAllocatedAmount, 8000);
    assert.equal(metrics.healthStatus, 'Over Allocated');
  });

  it('flags Tight status when planned allocation is >= 92% of usable budget without exceeding', () => {
    const event = createMockEvent({
      totalBudget: 40000,
      contingencyPercent: 10, // usable = 36000; planned = 35000 (97.2%)
    });
    const metrics = calculateBudgetMetrics(event);
    assert.equal(metrics.isOverAllocated, false);
    assert.equal(metrics.healthStatus, 'Tight');
  });

  it('handles edge cases: zero budget, negative guest count, empty budgetItems, and 100% contingency', () => {
    const emptyEvent = createMockEvent({
      totalBudget: 0,
      guestCount: 0,
      contingencyPercent: 150,
      budgetItems: [],
    });
    const metrics = calculateBudgetMetrics(emptyEvent);
    assert.equal(metrics.totalBudget, 0);
    assert.equal(metrics.contingencyPercent, 100);
    assert.equal(metrics.usableBudget, 0);
    assert.equal(metrics.costPerGuestPlanned, 0);
    assert.equal(metrics.categoryBreakdown.length, 0);
  });

  it('rebalances unlocked categories while preserving locked categories and handles all-locked edge case', () => {
    const items: BudgetItem[] = [
      {
        id: 'b1',
        category: 'Venue & Rentals',
        title: 'Venue',
        plannedAmount: 20000,
        quotedAmount: 0,
        actualAmount: 0,
        lowEstimate: 17000,
        highEstimate: 23000,
        paymentStatus: 'Unpaid',
        notes: '',
      },
      {
        id: 'b2',
        category: 'Catering & Bar',
        title: 'Catering',
        plannedAmount: 20000,
        quotedAmount: 0,
        actualAmount: 0,
        lowEstimate: 17000,
        highEstimate: 23000,
        paymentStatus: 'Unpaid',
        notes: '',
      },
    ];

    const rebalanced = rebalanceBudgetToTarget(items, 30000, ['Venue & Rentals']);
    const venue = rebalanced.find((i) => i.id === 'b1')!;
    const catering = rebalanced.find((i) => i.id === 'b2')!;

    assert.equal(venue.plannedAmount, 20000);
    assert.equal(catering.plannedAmount, 10000);

    // Edge case: all categories locked -> returns items unchanged
    const allLocked = rebalanceBudgetToTarget(items, 25000, [
      'Venue & Rentals',
      'Catering & Bar',
    ]);
    assert.equal(allLocked[0].plannedAmount, 20000);
    assert.equal(allLocked[1].plannedAmount, 20000);
  });

  it('formats USD currency cleanly including zero, negative, and NaN inputs', () => {
    assert.equal(formatCurrency(25000), '$25,000');
    assert.equal(formatCurrency(0), '$0');
    assert.equal(formatCurrency(Number.NaN), '$0');
  });
});
