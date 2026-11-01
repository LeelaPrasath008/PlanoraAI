import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  generateEventCsv,
  formatPlanSummaryText,
} from '../utils/csvExport';
import {
  sanitizeText,
  clampNumber,
  buildDeterministicFallbackPlan,
} from '../../server';
import {
  mapDocToEvent,
  mapDocToBudgetItem,
  mapDocToTask,
  mapDocToVendor,
  mapDocToScenario,
  isValidEmail,
} from '../services/firestoreMappers';
import { SAMPLE_PLANS } from '../data/samplePlans';

describe('Security Sanitization, CSV Export & Firestore Mappers Suite', () => {
  it('neutralizes CSV spreadsheet formula injection and handles quotes, newlines, and unicode', () => {
    assert.equal(escapeCsvCell('=SUM(A1:A10)'), `"'=SUM(A1:A10)"`);
    assert.equal(escapeCsvCell('+cmd|"/c calc"!A0'), `"'+cmd|""/c calc""!A0"`);
    assert.equal(escapeCsvCell('-2+3'), `"'-2+3"`);
    assert.equal(escapeCsvCell('@IMPORTXML()'), `"'@IMPORTXML()"`);
    assert.equal(escapeCsvCell('Normal "Quoted" Text'), `"Normal ""Quoted"" Text"`);
    assert.equal(escapeCsvCell('Line 1\nLine 2 — Café ✨'), `"Line 1\nLine 2 — Café ✨"`);
    assert.equal(escapeCsvCell(null), `""`);
    assert.equal(escapeCsvCell(undefined), `""`);
  });

  it('generates valid CSV output and plain-text brief for sample plans', () => {
    const sample = SAMPLE_PLANS[0];
    const csv = generateEventCsv(sample);
    assert.ok(csv.includes('"Event Title","Type","Date"'));
    assert.ok(csv.includes(`"${sample.title}"`));

    const summary = formatPlanSummaryText(sample);
    assert.ok(summary.includes('PLANORA AI — EVENT EXECUTIVE BRIEF'));
    assert.ok(summary.includes(sample.title));
  });

  it('sanitizes text and clamps numbers on the backend', () => {
    const dirty = '  Hello\u0000\u0007 World  ';
    assert.equal(sanitizeText(dirty, 50), 'Hello World');
    assert.equal(sanitizeText(null, 50, 'Fallback'), 'Fallback');
    assert.equal(sanitizeText('abcdef', 3), 'abc');

    assert.equal(clampNumber('250', 10, 100, 50), 100);
    assert.equal(clampNumber('-5', 10, 100, 50), 10);
    assert.equal(clampNumber('not-a-number', 10, 100, 50), 50);
  });

  it('builds a deterministic fallback event plan whose budget items sum to the usable budget', () => {
    const plan = buildDeterministicFallbackPlan({
      title: 'Test Fallback Conference',
      type: 'Corporate Conference',
      date: '2026-11-15',
      location: 'Chicago, IL',
      guestCount: 200,
      totalBudget: 60000,
      contingencyPercent: 10,
      priorities: ['Keynote Stage & AV Production'],
    });

    const usableBudget = 60000 - 6000;
    const sumPlanned = plan.budgetItems.reduce(
      (s, item) => s + item.plannedAmount,
      0
    );

    assert.equal(sumPlanned, usableBudget);
    assert.ok(plan.tasks.length >= 6);
    assert.ok(plan.vendors.length >= 4);
    assert.ok(plan.ideas.length >= 4);
  });

  it('maps and sanitizes untrusted Firestore document payloads via firestoreMappers', () => {
    assert.equal(isValidEmail('planner@planora.app'), true);
    assert.equal(isValidEmail('not-an-email'), false);

    const ev = mapDocToEvent('evt_1', {
      title: '  Cosmic Launch  ',
      guestCount: -999,
      totalBudget: 50000,
      contingencyPercent: 250,
      priorities: ['AV', 123, ''],
    });
    assert.equal(ev.title, 'Cosmic Launch');
    assert.equal(ev.guestCount, 1);
    assert.equal(ev.contingencyPercent, 100);
    assert.deepEqual(ev.priorities, ['AV']);

    const bItem = mapDocToBudgetItem('b_1', {
      category: 'Venue',
      title: 'Hall',
      plannedAmount: -50,
      paymentStatus: 'InvalidStatus',
    });
    assert.equal(bItem.plannedAmount, 0);
    assert.equal(bItem.paymentStatus, 'Unpaid');

    const tItem = mapDocToTask('t_1', {
      title: 'Setup Stage',
      priority: 'InvalidPriority',
      status: 'InvalidStatus',
      durationDays: 999,
    });
    assert.equal(tItem.priority, 'Medium');
    assert.equal(tItem.status, 'Todo');
    assert.equal(tItem.durationDays, 365);

    const vItem = mapDocToVendor('v_1', {
      vendorName: 'Nova Audio',
      bookingStatus: 'UnknownStatus',
      estimatedPrice: 4500,
    });
    assert.equal(vItem.bookingStatus, 'Shortlisted');
    assert.equal(vItem.estimatedPrice, 4500);

    const sItem = mapDocToScenario('s_1', {
      name: 'High Capacity',
      venueTier: 'UnknownTier',
      cateringStyle: 'Buffet',
      decorLevel: 'Luxury',
    });
    assert.equal(sItem.venueTier, 'Standard');
    assert.equal(sItem.cateringStyle, 'Buffet');
    assert.equal(sItem.decorLevel, 'Luxury');
  });
});
