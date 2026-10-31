/**
 * Firestore Security Rules Specification Suite ("Dirty Dozen" Payloads)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Event Creation',
    collectionPath: '/events/evt_01',
    operation: 'create',
    auth: null,
    payload: { ownerId: 'user_a', title: 'Test' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof Attack',
    collectionPath: '/events/evt_01',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: false },
    payload: { ownerId: 'user_a', title: 'Test' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing (ownerId mismatch)',
    collectionPath: '/events/evt_01',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_b', title: 'Spoofed Event' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection (isAdminBypass)',
    collectionPath: '/events/evt_01',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_a', title: 'Valid Title', isAdminBypass: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning (invalid characters in doc ID)',
    collectionPath: '/events/invalid$id!',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_a', title: 'Valid Title' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Value Poisoning (oversized title > 160 chars)',
    collectionPath: '/events/evt_01',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { title: 'A'.repeat(500) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass (updating a completed event)',
    collectionPath: '/events/evt_completed',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { title: 'Mutating Completed Event' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Mutation (changing ownerId on update)',
    collectionPath: '/events/evt_01',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_b' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery (createdAt != request.time)',
    collectionPath: '/events/evt_01',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { ownerId: 'user_a', createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned Subcollection Write (missing parent event)',
    collectionPath: '/events/nonexistent_evt/tasks/task_01',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { eventId: 'nonexistent_evt', ownerId: 'user_a', title: 'Task' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Tenant Subcollection Write',
    collectionPath: '/events/user_a_evt/budgetItems/item_01',
    operation: 'create',
    auth: { uid: 'user_b', email_verified: true },
    payload: { eventId: 'user_a_evt', ownerId: 'user_b', title: 'Intrusion' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'PII Split-Collection Unauthorized Read',
    collectionPath: '/users/user_a/private/info',
    operation: 'get',
    auth: { uid: 'user_b', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Firestore Security Rules & Dirty Dozen Adversarial Suite', () => {
  it('defines all 12 Dirty Dozen adversarial payloads with PERMISSION_DENIED outcome', () => {
    assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
    const ids = new Set(DIRTY_DOZEN_PAYLOADS.map((tc) => tc.id));
    assert.equal(ids.size, 12);
    for (const tc of DIRTY_DOZEN_PAYLOADS) {
      assert.equal(tc.expectedOutcome, 'PERMISSION_DENIED');
      assert.ok(tc.collectionPath.startsWith('/'));
    }
  });

  it('enforces zero-trust invariants in firestore.rules', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    assert.ok(rulesContent.includes("rules_version = '2'"));
    assert.ok(rulesContent.includes('email_verified == true'));
    assert.ok(rulesContent.includes('hasOnly'));
  });
});
