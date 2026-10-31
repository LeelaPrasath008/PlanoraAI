import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  buildTasksCsvContent,
  buildBudgetAndVendorsCsvContent,
} from '../utils/csvExport';
import { sanitizeText, clampNumber } from '../../server';
import { DEMO_EVENTS } from '../data/initialEvents';

describe('Security Sanitization & CSV Formula Injection Protection', () => {
  it('neutralizes OWASP CSV formula injection payloads (=, +, -, @)', () => {
    assert.equal(escapeCsvCell('=CMD("calc")'), '"\'=CMD(""calc"")"');
    assert.equal(escapeCsvCell('+SUM(A1:A10)'), '"\'+SUM(A1:A10)"');
    assert.equal(escapeCsvCell('@IMPORTXML()'), '"\'@IMPORTXML()"');
    assert.equal(escapeCsvCell('-2+3+cmd'), '"\'-2+3+cmd"');
    assert.equal(escapeCsvCell('Safe Venue Name'), '"Safe Venue Name"');
  });

  it('builds valid RFC-4180 CSV content for tasks and budget ledgers', () => {
    const sample = DEMO_EVENTS[0];
    const tasksCsv = buildTasksCsvContent(sample);
    assert.ok(tasksCsv.startsWith('"Task Title","Category","Priority"'));
    assert.equal(tasksCsv.split('\n').length, sample.tasks.length + 1);

    const budgetCsv = buildBudgetAndVendorsCsvContent(sample);
    assert.ok(budgetCsv.includes('"Record Type","Category","Title / Vendor"'));
  });

  it('sanitizes untrusted text and clamps numeric ranges on the server', () => {
    assert.equal(sanitizeText('  Clean Title \u0000 ', 50), 'Clean Title');
    assert.equal(sanitizeText('A'.repeat(200), 40).length, 40);
    assert.equal(clampNumber('99999999999', 0, 1000, 50), 1000);
    assert.equal(clampNumber('not-a-number', 0, 1000, 50), 50);
  });
});
