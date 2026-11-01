import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

const VALID_OWNER_UID = 'user_owner_123';
const OTHER_ATTACKER_UID = 'user_attacker_999';

function buildValidEventPayload(overrides: Record<string, unknown> = {}) {
  const ts = serverTimestamp();
  return {
    ownerId: VALID_OWNER_UID,
    title: 'Aria & Julian Botanical Estate Wedding',
    description: 'Outdoor garden celebration',
    eventType: 'Wedding',
    eventDate: '2026-09-19',
    durationHours: 6,
    city: 'Napa Valley, CA',
    guestCount: 160,
    totalBudget: 75000,
    currency: 'USD',
    themeStyle: 'Botanical Elegance',
    venuePreference: 'Outdoor',
    foodPreference: 'Seasonal Tasting Menu',
    culturalNotes: 'Standard',
    mustHaves: 'Live acoustic quartet',
    avoidItems: 'Plastic single-use items',
    priorities: 'Catering, Decor',
    contingencyPercent: 12,
    status: 'active',
    isShared: false,
    shareToken: 'tok_123',
    aiConceptSummary: 'Warm botanical celebration.',
    aiRisksAndContingencies: 'Weather backup tent reserved.',
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

describe('Firestore Security Rules — Dirty Dozen & Positive Owner Verification', () => {
  it('1. Enforces deny-by-default fallback rule and strict schema/timestamp guards in firestore.rules', () => {
    assert.match(
      rulesContent,
      /match \/\{document=\*\*\} \{\s*allow read, write: if false;/
    );
    assert.match(rulesContent, /function isSignedIn\(\)/);
    assert.match(rulesContent, /function isVerified\(\)/);
    assert.match(rulesContent, /function isParentEventOwner\(eventId\)/);
    assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
    assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
    assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  });

  it('2. Executes all 12 Dirty Dozen attack payloads and positive owner create/update cases against Firestore Emulator', async (t) => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      t.skip(
        'FIRESTORE_EMULATOR_HOST is not set; skipping live Firestore Emulator execution (run `npm run test:rules` to execute with emulator).'
      );
      return;
    }

    const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    const testEnv = await initializeTestEnvironment({
      projectId: 'planora-ai-rules-test',
      firestore: {
        host: host || '127.0.0.1',
        port: Number(portStr) || 8080,
        rules: rulesContent,
      },
    });

    try {
      await testEnv.clearFirestore();

      const ownerCtx = testEnv.authenticatedContext(VALID_OWNER_UID, {
        email: 'owner@planora.app',
        email_verified: true,
      });
      const attackerCtx = testEnv.authenticatedContext(OTHER_ATTACKER_UID, {
        email: 'attacker@planora.app',
        email_verified: true,
      });
      const unauthCtx = testEnv.unauthenticatedContext();

      const ownerDb = ownerCtx.firestore();
      const attackerDb = attackerCtx.firestore();
      const unauthDb = unauthCtx.firestore();

      // Positive Case A: Valid owner public profile creation
      await assertSucceeds(
        setDoc(doc(ownerDb, 'users', VALID_OWNER_UID, 'public', 'profile'), {
          uid: VALID_OWNER_UID,
          displayName: 'Lead Planner',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // Positive Case B: Valid owner event creation and update
      const eventRefOwner = doc(ownerDb, 'events', 'evt_valid_1');
      await assertSucceeds(setDoc(eventRefOwner, buildValidEventPayload()));
      await assertSucceeds(
        updateDoc(eventRefOwner, {
          title: 'Updated Botanical Wedding Title',
          updatedAt: serverTimestamp(),
        })
      );

      // Dirty Dozen #1: Unauthenticated read/write must fail
      await assertFails(getDoc(doc(unauthDb, 'events', 'evt_valid_1')));
      await assertFails(
        setDoc(doc(unauthDb, 'events', 'evt_unauth'), buildValidEventPayload())
      );

      // Dirty Dozen #2: Cross-owner read/update/delete must fail
      await assertFails(getDoc(doc(attackerDb, 'events', 'evt_valid_1')));
      await assertFails(
        updateDoc(doc(attackerDb, 'events', 'evt_valid_1'), {
          title: 'Hijacked Event',
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(deleteDoc(doc(attackerDb, 'events', 'evt_valid_1')));

      // Dirty Dozen #3: Privilege escalation / spoofing another user's public profile must fail
      await assertFails(
        setDoc(doc(attackerDb, 'users', VALID_OWNER_UID, 'public', 'profile'), {
          uid: VALID_OWNER_UID,
          displayName: 'Attacker Spoof',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // Dirty Dozen #4: Undeclared extra field injection (`isAdmin: true`) must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_extra_field'),
          buildValidEventPayload({ isAdmin: true })
        )
      );

      // Dirty Dozen #5: Oversized title string (> 160 chars) must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_huge_title'),
          buildValidEventPayload({ title: 'X'.repeat(250) })
        )
      );

      // Dirty Dozen #6: Negative totalBudget must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_neg_budget'),
          buildValidEventPayload({ totalBudget: -5000 })
        )
      );

      // Dirty Dozen #7: Out-of-bounds guestCount (> 100000 or 0) must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_zero_guests'),
          buildValidEventPayload({ guestCount: 0 })
        )
      );

      // Dirty Dozen #8: Out-of-bounds contingencyPercent (> 50) must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_bad_contingency'),
          buildValidEventPayload({ contingencyPercent: 150 })
        )
      );

      // Dirty Dozen #9: Mutating immutable `ownerId` on update must fail
      await assertFails(
        updateDoc(eventRefOwner, {
          ownerId: OTHER_ATTACKER_UID,
          updatedAt: serverTimestamp(),
        })
      );

      // Dirty Dozen #10: Mutating immutable `createdAt` on update must fail
      await assertFails(
        updateDoc(eventRefOwner, {
          createdAt: Timestamp.fromMillis(1000),
          updatedAt: serverTimestamp(),
        })
      );

      // Dirty Dozen #11: Subcollection `eventId` path mismatch must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_valid_1', 'tasks', 'task_bad_path'),
          {
            ownerId: VALID_OWNER_UID,
            eventId: 'different_event_id',
            title: 'Task',
            description: '',
            dueDate: '2026-08-01',
            priority: 'High',
            category: 'Venue',
            status: 'Todo',
            dependsOnTaskId: '',
            assignee: 'Planner',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        )
      );

      // Dirty Dozen #12: Invalid enum value in subcollection (`priority: 'SuperUrgent'`) must fail
      await assertFails(
        setDoc(
          doc(ownerDb, 'events', 'evt_valid_1', 'tasks', 'task_bad_enum'),
          {
            ownerId: VALID_OWNER_UID,
            eventId: 'evt_valid_1',
            title: 'Task',
            description: '',
            dueDate: '2026-08-01',
            priority: 'SuperUrgent',
            category: 'Venue',
            status: 'Todo',
            dependsOnTaskId: '',
            assignee: 'Planner',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        )
      );
    } finally {
      await testEnv.cleanup();
    }
  });
});
