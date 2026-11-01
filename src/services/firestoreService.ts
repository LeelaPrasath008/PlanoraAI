import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  PlanoraEvent,
  BudgetItem,
  TimelineTask,
  VendorItem,
  CreativeIdea,
  SavedScenario,
  BookingStatus,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
} from '../types/event';
import {
  sanitizeString,
  clampNumber,
  isValidEmail,
  mapDocToEvent,
  mapDocToBudgetItem,
  mapDocToTask,
  mapDocToVendor,
  mapDocToIdea,
  mapDocToScenario,
} from './firestoreMappers';
import { logClientError } from '../utils/clientLogger';

export {
  sanitizeString,
  clampNumber,
  isValidEmail,
  mapDocToEvent,
  mapDocToBudgetItem,
  mapDocToTask,
  mapDocToVendor,
  mapDocToIdea,
  mapDocToScenario,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

/**
 * Formats and throws a structured JSON error payload for Firestore security or runtime failures.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  logClientError({ context: `Firestore ${operationType} at ${path}`, error });
  throw new Error(JSON.stringify(errInfo));
}

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];
const VALID_TASK_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const VALID_TASK_STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Done'];
const VALID_BOOKING_STATUSES: BookingStatus[] = [
  'Shortlisted',
  'Contacted',
  'Negotiating',
  'Booked',
  'Declined',
];

/**
 * Creates the user's profile document upon first sign-in if it does not already exist.
 */
export async function bootstrapUserProfile(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const safeEmail = sanitizeString(user.email, 254, 'planner@planora.app');
      await setDoc(userRef, {
        uid: user.uid,
        displayName: sanitizeString(user.displayName, 100, 'Event Planner'),
        email: isValidEmail(safeEmail) ? safeEmail : 'planner@planora.app',
        photoURL: sanitizeString(user.photoURL, 500, ''),
        role: 'planner',
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

async function fetchEventSubcollections(
  eventId: string,
  baseEvent: PlanoraEvent
): Promise<PlanoraEvent> {
  const [budgetSnap, tasksSnap, vendorsSnap, ideasSnap, scenariosSnap] =
    await Promise.all([
      getDocs(collection(db, 'events', eventId, 'budgetItems')),
      getDocs(collection(db, 'events', eventId, 'tasks')),
      getDocs(collection(db, 'events', eventId, 'vendors')),
      getDocs(collection(db, 'events', eventId, 'ideas')),
      getDocs(collection(db, 'events', eventId, 'scenarios')),
    ]);

  return {
    ...baseEvent,
    budgetItems: budgetSnap.docs.map((d) => mapDocToBudgetItem(d.id, d.data())),
    tasks: tasksSnap.docs.map((d) => mapDocToTask(d.id, d.data())),
    vendors: vendorsSnap.docs.map((d) => mapDocToVendor(d.id, d.data())),
    ideas: ideasSnap.docs.map((d) => mapDocToIdea(d.id, d.data())),
    savedScenarios: scenariosSnap.docs.map((d) =>
      mapDocToScenario(d.id, d.data())
    ),
  };
}

/**
 * Subscribes to all events owned by `ownerId` and loads their subcollections.
 */
export function subscribeUserEvents(
  ownerId: string,
  onEventsLoaded: (events: PlanoraEvent[]) => void,
  onError?: (err: Error) => void
): () => void {
  const eventsQuery = query(
    collection(db, 'events'),
    where('ownerId', '==', ownerId)
  );
  return onSnapshot(
    eventsQuery,
    async (snapshot) => {
      try {
        const baseEvents = snapshot.docs.map((docSnap) =>
          mapDocToEvent(docSnap.id, docSnap.data())
        );
        const fullEvents = await Promise.all(
          baseEvents.map((ev) => fetchEventSubcollections(ev.id, ev))
        );
        fullEvents.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        onEventsLoaded(fullEvents);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

async function syncSubcollection<T extends { id: string }>(
  eventId: string,
  subcollectionName: string,
  items: T[],
  ownerId: string,
  serializeItem: (item: T) => Record<string, unknown>
): Promise<void> {
  const colRef = collection(db, 'events', eventId, subcollectionName);
  const existingSnap = await getDocs(colRef);
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  const incomingIds = new Set(items.map((i) => i.id));
  const batch = writeBatch(db);

  for (const existingDoc of existingSnap.docs) {
    if (!incomingIds.has(existingDoc.id)) {
      batch.delete(existingDoc.ref);
    }
  }

  for (const item of items) {
    const itemRef = doc(db, 'events', eventId, subcollectionName, item.id);
    const existingDoc = existingSnap.docs.find((d) => d.id === item.id);
    const existingCreatedAt = existingDoc?.data()?.createdAt;
    batch.set(itemRef, {
      ...serializeItem(item),
      ownerId,
      eventId,
      createdAt:
        existingIds.has(item.id) && existingCreatedAt instanceof Timestamp
          ? existingCreatedAt
          : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Persists a complete `PlanoraEvent` and all 5 subcollections in parallel.
 */
export async function saveFullEventSubcollections(
  ownerId: string,
  event: PlanoraEvent,
  isNew = false
): Promise<void> {
  const eventPath = `events/${event.id}`;
  try {
    const eventRef = doc(db, 'events', event.id);
    let existingCreatedAt: Timestamp | null = null;
    if (!isNew) {
      const snap = await getDoc(eventRef);
      if (snap.exists() && snap.data()?.createdAt instanceof Timestamp) {
        existingCreatedAt = snap.data().createdAt;
      }
    }

    await setDoc(eventRef, {
      ownerId,
      title: sanitizeString(event.title, 200, 'Untitled Event'),
      type: sanitizeString(event.type, 100, 'Event'),
      date: sanitizeString(event.date, 40, new Date().toISOString().split('T')[0]),
      location: sanitizeString(event.location, 200, 'TBD'),
      venuePreference: sanitizeString(event.venuePreference, 100, 'Indoor'),
      guestCount: clampNumber(event.guestCount, 1, 100000, 50),
      totalBudget: clampNumber(event.totalBudget, 0, 1000000000, 10000),
      contingencyPercent: clampNumber(event.contingencyPercent, 0, 100, 10),
      notes: sanitizeString(event.notes, 2000, ''),
      priorities: Array.isArray(event.priorities)
        ? event.priorities.slice(0, 20).map((p) => sanitizeString(p, 100))
        : [],
      aiConceptSummary: sanitizeString(event.aiConceptSummary, 5000, ''),
      aiRisksAndContingencies: sanitizeString(event.aiRisksAndContingencies, 5000, ''),
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await Promise.all([
      syncSubcollection<BudgetItem>(event.id, 'budgetItems', event.budgetItems, ownerId, (b) => ({
        category: sanitizeString(b.category, 100, 'General'),
        title: sanitizeString(b.title, 200, 'Expense Item'),
        plannedAmount: clampNumber(b.plannedAmount, 0, 1000000000, 0),
        quotedAmount: clampNumber(b.quotedAmount, 0, 1000000000, 0),
        actualAmount: clampNumber(b.actualAmount, 0, 1000000000, 0),
        lowEstimate: clampNumber(b.lowEstimate, 0, 1000000000, 0),
        highEstimate: clampNumber(b.highEstimate, 0, 1000000000, 0),
        paymentStatus: VALID_PAYMENT_STATUSES.includes(b.paymentStatus) ? b.paymentStatus : 'Unpaid',
        ...(b.dueDate ? { dueDate: sanitizeString(b.dueDate, 40) } : {}),
        notes: sanitizeString(b.notes, 1000, ''),
      })),
      syncSubcollection<TimelineTask>(event.id, 'tasks', event.tasks, ownerId, (t) => ({
        title: sanitizeString(t.title, 200, 'Task'),
        description: sanitizeString(t.description, 1000, ''),
        dueDate: sanitizeString(t.dueDate, 40, ''),
        ...(t.durationDays !== undefined ? { durationDays: clampNumber(t.durationDays, 1, 365, 5) } : {}),
        priority: VALID_TASK_PRIORITIES.includes(t.priority) ? t.priority : 'Medium',
        category: sanitizeString(t.category, 100, 'General'),
        status: VALID_TASK_STATUSES.includes(t.status) ? t.status : 'Todo',
        assignee: sanitizeString(t.assignee, 100, ''),
        ...(t.dependsOnTaskId ? { dependsOnTaskId: sanitizeString(t.dependsOnTaskId, 100) } : {}),
      })),
      syncSubcollection<VendorItem>(event.id, 'vendors', event.vendors, ownerId, (v) => ({
        category: sanitizeString(v.category, 100, 'General'),
        vendorName: sanitizeString(v.vendorName, 200, 'Vendor'),
        contactInfo: sanitizeString(v.contactInfo, 300, ''),
        estimatedPrice: clampNumber(v.estimatedPrice, 0, 1000000000, 0),
        quotedAmount: clampNumber(v.quotedAmount, 0, 1000000000, 0),
        bookingStatus: VALID_BOOKING_STATUSES.includes(v.bookingStatus) ? v.bookingStatus : 'Shortlisted',
        followUpDate: sanitizeString(v.followUpDate, 40, ''),
        notes: sanitizeString(v.notes, 1000, ''),
      })),
      syncSubcollection<CreativeIdea>(event.id, 'ideas', event.ideas, ownerId, (i) => ({
        category: sanitizeString(i.category, 100, 'General'),
        title: sanitizeString(i.title, 200, 'Idea'),
        description: sanitizeString(i.description, 1000, ''),
        estimatedCostImpact: sanitizeString(i.estimatedCostImpact, 200, ''),
        executionTip: sanitizeString(i.executionTip, 1000, ''),
      })),
      syncSubcollection<SavedScenario>(event.id, 'scenarios', event.savedScenarios, ownerId, (s) => ({
        name: sanitizeString(s.name, 200, 'Scenario'),
        guestCount: clampNumber(s.guestCount, 1, 100000, 50),
        totalBudget: clampNumber(s.totalBudget, 0, 1000000000, 10000),
        venueTier: ['Budget', 'Standard', 'Premium'].includes(s.venueTier) ? s.venueTier : 'Standard',
        cateringStyle: ['Buffet', 'Plated', 'Cocktail'].includes(s.cateringStyle) ? s.cateringStyle : 'Plated',
        decorLevel: ['Minimal', 'Curated', 'Luxury'].includes(s.decorLevel) ? s.decorLevel : 'Curated',
        estimatedTotalCost: clampNumber(s.estimatedTotalCost, 0, 1000000000, 0),
        summaryNotes: sanitizeString(s.summaryNotes, 1000, ''),
      })),
    ]);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, eventPath);
  }
}

/**
 * Deletes an event and all of its subcollection documents.
 */
export async function deleteFullEvent(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const subcollections = ['budgetItems', 'tasks', 'vendors', 'ideas', 'scenarios'];
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, 'events', eventId, sub));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(doc(db, 'events', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Seeds sample initial plans into Firestore if the authenticated user has no saved events yet.
 */
export async function seedInitialPlansForUser(
  ownerId: string,
  samplePlans: PlanoraEvent[]
): Promise<void> {
  const q = query(collection(db, 'events'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  if (!snap.empty) return;
  for (const plan of samplePlans) {
    const clonedPlan: PlanoraEvent = {
      ...plan,
      id: `${plan.id}_${ownerId.slice(0, 6)}`,
    };
    await saveFullEventSubcollections(ownerId, clonedPlan, true);
  }
}
