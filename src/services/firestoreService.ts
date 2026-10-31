import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  BudgetExpenseItem,
  CopilotChatMessage,
  PlanoraEvent,
  PlanoraIdea,
  PlanoraTask,
  PlanoraVendor,
} from '../types/event';

const clampStr = (val: unknown, max: number, fallback = ''): string => {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return (s || fallback).slice(0, max);
};

export async function ensureUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  const pubPath = `users/${uid}/public/profile`;
  try {
    const pubRef = doc(db, 'users', uid, 'public', 'profile');
    const pubSnap = await getDoc(pubRef);
    if (!pubSnap.exists()) {
      await setDoc(pubRef, {
        uid,
        displayName: clampStr(displayName, 100, 'Planora Organizer'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, pubPath);
  }

  if (email) {
    const privPath = `users/${uid}/private/info`;
    try {
      const privRef = doc(db, 'users', uid, 'private', 'info');
      const privSnap = await getDoc(privRef);
      if (!privSnap.exists()) {
        await setDoc(privRef, {
          uid,
          email: clampStr(email, 254, 'user@example.com'),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privPath);
    }
  }
}

export async function fetchUserEventsFromFirestore(
  uid: string
): Promise<PlanoraEvent[]> {
  const path = 'events';
  try {
    const q = query(collection(db, 'events'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const events: PlanoraEvent[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const eventId = d.id;

      const [budgetSnap, taskSnap, vendorSnap, ideaSnap, msgSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, 'events', eventId, 'budgetItems'),
              where('ownerId', '==', uid)
            )
          ),
          getDocs(
            query(
              collection(db, 'events', eventId, 'tasks'),
              where('ownerId', '==', uid)
            )
          ),
          getDocs(
            query(
              collection(db, 'events', eventId, 'vendors'),
              where('ownerId', '==', uid)
            )
          ),
          getDocs(
            query(
              collection(db, 'events', eventId, 'ideas'),
              where('ownerId', '==', uid)
            )
          ),
          getDocs(
            query(
              collection(db, 'events', eventId, 'messages'),
              where('ownerId', '==', uid)
            )
          ),
        ]);

      events.push({
        id: eventId,
        ownerId: data.ownerId,
        isDemo: false,
        title: data.title,
        description: data.description || '',
        eventType: data.eventType || 'Wedding',
        eventDate: data.eventDate || '2027-03-15',
        durationHours: Number(data.durationHours) || 6,
        city: data.city || 'Mumbai',
        guestCount: Number(data.guestCount) || 100,
        totalBudget: Number(data.totalBudget) || 100000,
        currency: data.currency || 'INR',
        themeStyle: data.themeStyle || '',
        venuePreference: data.venuePreference || 'Hybrid',
        foodPreference: data.foodPreference || '',
        culturalNotes: data.culturalNotes || '',
        mustHaves: data.mustHaves || '',
        avoidItems: data.avoidItems || '',
        priorities: data.priorities || 'Guest Experience, Affordability',
        contingencyPercent: Number(data.contingencyPercent) || 8,
        status: data.status || 'active',
        isShared: Boolean(data.isShared),
        shareToken: data.shareToken || '',
        aiConceptSummary: data.aiConceptSummary || '',
        aiRisksAndContingencies: data.aiRisksAndContingencies || '',
        budgetItems: budgetSnap.docs.map(
          (b) => ({ id: b.id, ...b.data() } as BudgetExpenseItem)
        ),
        tasks: taskSnap.docs.map(
          (t) => ({ id: t.id, ...t.data() } as PlanoraTask)
        ),
        vendors: vendorSnap.docs.map(
          (v) => ({ id: v.id, ...v.data() } as PlanoraVendor)
        ),
        ideas: ideaSnap.docs.map(
          (i) => ({ id: i.id, ...i.data() } as PlanoraIdea)
        ),
        messages: msgSnap.docs.map((m) => {
          const md = m.data();
          return {
            id: m.id,
            eventId,
            ownerId: md.ownerId,
            role: md.role,
            content: md.content,
            suggestedActionLabel: md.suggestedActionLabel || '',
            createdAt:
              md.createdAt?.toDate?.()?.toISOString?.() ||
              new Date().toISOString(),
          } as CopilotChatMessage;
        }),
      });
    }

    return events;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveFullEventToFirestore(
  uid: string,
  event: PlanoraEvent
): Promise<PlanoraEvent> {
  const cleanId = event.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || `evt_${Date.now()}`;
  const eventPath = `events/${cleanId}`;

  try {
    const eventRef = doc(db, 'events', cleanId);
    await setDoc(eventRef, {
      ownerId: uid,
      title: clampStr(event.title, 160, 'Untitled Event'),
      description: clampStr(event.description, 1200, ''),
      eventType: ['Wedding', 'Birthday', 'Anniversary', 'College Event', 'Festival', 'Community'].includes(
        event.eventType
      )
        ? event.eventType
        : 'Wedding',
      eventDate: clampStr(event.eventDate, 32, '2027-03-15'),
      durationHours: Math.min(240, Math.max(1, Number(event.durationHours) || 6)),
      city: clampStr(event.city, 120, 'City'),
      guestCount: Math.min(100000, Math.max(1, Number(event.guestCount) || 50)),
      totalBudget: Math.min(1000000000, Math.max(0, Number(event.totalBudget) || 0)),
      currency: ['INR', 'USD', 'EUR', 'GBP'].includes(event.currency)
        ? event.currency
        : 'INR',
      themeStyle: clampStr(event.themeStyle, 300, ''),
      venuePreference: ['Indoor', 'Outdoor', 'Hybrid'].includes(event.venuePreference)
        ? event.venuePreference
        : 'Hybrid',
      foodPreference: clampStr(event.foodPreference, 400, ''),
      culturalNotes: clampStr(event.culturalNotes, 500, ''),
      mustHaves: clampStr(event.mustHaves, 500, ''),
      avoidItems: clampStr(event.avoidItems, 500, ''),
      priorities: clampStr(event.priorities, 300, 'Guest Experience'),
      contingencyPercent: Math.min(50, Math.max(0, Number(event.contingencyPercent) || 8)),
      status: ['active', 'archived', 'completed'].includes(event.status)
        ? event.status
        : 'active',
      isShared: Boolean(event.isShared),
      shareToken: clampStr(event.shareToken, 64, `shr_${Date.now()}`),
      aiConceptSummary: clampStr(event.aiConceptSummary, 2000, ''),
      aiRisksAndContingencies: clampStr(event.aiRisksAndContingencies, 2000, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Save subcollections concurrently via Promise.all for high efficiency
    await Promise.all([
      ...event.budgetItems.map((b) => saveBudgetItemToFirestore(uid, cleanId, b)),
      ...event.tasks.map((t) => saveTaskToFirestore(uid, cleanId, t)),
      ...event.vendors.map((v) => saveVendorToFirestore(uid, cleanId, v)),
      ...event.ideas.map((idea) => saveIdeaToFirestore(uid, cleanId, idea)),
    ]);

    return {
      ...event,
      id: cleanId,
      ownerId: uid,
      isDemo: false,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, eventPath);
  }
}

export async function fetchSharedEventFromFirestore(
  eventId: string,
  shareToken: string
): Promise<PlanoraEvent | null> {
  const cleanId = eventId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  if (!cleanId) return null;
  try {
    const snap = await getDoc(doc(db, 'events', cleanId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.isShared) return null;
    if (shareToken && data.shareToken && data.shareToken !== shareToken) {
      return null;
    }
    return {
      id: cleanId,
      ownerId: String(data.ownerId || ''),
      isDemo: false,
      title: String(data.title || 'Shared Event'),
      description: String(data.description || ''),
      eventType: data.eventType || 'Wedding',
      eventDate: String(data.eventDate || '2027-03-15'),
      durationHours: Number(data.durationHours) || 6,
      city: String(data.city || 'Mumbai'),
      guestCount: Number(data.guestCount) || 100,
      totalBudget: Number(data.totalBudget) || 100000,
      currency: data.currency || 'INR',
      themeStyle: String(data.themeStyle || ''),
      venuePreference: data.venuePreference || 'Hybrid',
      foodPreference: String(data.foodPreference || ''),
      culturalNotes: String(data.culturalNotes || ''),
      mustHaves: String(data.mustHaves || ''),
      avoidItems: String(data.avoidItems || ''),
      priorities: String(data.priorities || 'Guest Experience'),
      contingencyPercent: Number(data.contingencyPercent) || 8,
      status: data.status || 'active',
      isShared: true,
      shareToken: String(data.shareToken || ''),
      aiConceptSummary: String(data.aiConceptSummary || ''),
      aiRisksAndContingencies: String(data.aiRisksAndContingencies || ''),
      budgetItems: [],
      tasks: [],
      vendors: [],
      ideas: [],
      messages: [],
    };
  } catch {
    return null;
  }
}

export async function updateEventMetadataInFirestore(
  uid: string,
  event: PlanoraEvent
): Promise<void> {
  const path = `events/${event.id}`;
  try {
    const ref = doc(db, 'events', event.id);
    await updateDoc(ref, {
      title: clampStr(event.title, 160, 'Untitled Event'),
      description: clampStr(event.description, 1200, ''),
      eventType: event.eventType,
      eventDate: clampStr(event.eventDate, 32, '2027-03-15'),
      durationHours: Math.min(240, Math.max(1, Number(event.durationHours) || 6)),
      city: clampStr(event.city, 120, 'City'),
      guestCount: Math.min(100000, Math.max(1, Number(event.guestCount) || 50)),
      totalBudget: Math.min(1000000000, Math.max(0, Number(event.totalBudget) || 0)),
      currency: event.currency,
      themeStyle: clampStr(event.themeStyle, 300, ''),
      venuePreference: event.venuePreference,
      foodPreference: clampStr(event.foodPreference, 400, ''),
      culturalNotes: clampStr(event.culturalNotes, 500, ''),
      mustHaves: clampStr(event.mustHaves, 500, ''),
      avoidItems: clampStr(event.avoidItems, 500, ''),
      priorities: clampStr(event.priorities, 300, 'Guest Experience'),
      contingencyPercent: Math.min(50, Math.max(0, Number(event.contingencyPercent) || 8)),
      status: event.status,
      isShared: Boolean(event.isShared),
      shareToken: clampStr(event.shareToken, 64, ''),
      aiConceptSummary: clampStr(event.aiConceptSummary, 2000, ''),
      aiRisksAndContingencies: clampStr(event.aiRisksAndContingencies, 2000, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteEventFromFirestore(
  _uid: string,
  event: PlanoraEvent
): Promise<void> {
  const path = `events/${event.id}`;
  try {
    await Promise.all([
      ...event.budgetItems.map((b) =>
        deleteDoc(doc(db, 'events', event.id, 'budgetItems', b.id))
      ),
      ...event.tasks.map((t) =>
        deleteDoc(doc(db, 'events', event.id, 'tasks', t.id))
      ),
      ...event.vendors.map((v) =>
        deleteDoc(doc(db, 'events', event.id, 'vendors', v.id))
      ),
      ...event.ideas.map((i) =>
        deleteDoc(doc(db, 'events', event.id, 'ideas', i.id))
      ),
      ...event.messages.map((m) =>
        deleteDoc(doc(db, 'events', event.id, 'messages', m.id))
      ),
    ]);
    await deleteDoc(doc(db, 'events', event.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveBudgetItemToFirestore(
  uid: string,
  eventId: string,
  item: BudgetExpenseItem,
  isUpdate = false
): Promise<void> {
  const cleanId = item.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const path = `events/${eventId}/budgetItems/${cleanId}`;
  try {
    const ref = doc(db, 'events', eventId, 'budgetItems', cleanId);
    const payload = {
      category: clampStr(item.category, 80, 'General'),
      title: clampStr(item.title, 160, 'Expense Item'),
      plannedAmount: Math.max(0, Number(item.plannedAmount) || 0),
      quotedAmount: Math.max(0, Number(item.quotedAmount) || 0),
      actualAmount: Math.max(0, Number(item.actualAmount) || 0),
      lowEstimate: Math.max(0, Number(item.lowEstimate) || 0),
      highEstimate: Math.max(0, Number(item.highEstimate) || 0),
      paymentStatus: ['Paid', 'Pending', 'Unpaid'].includes(item.paymentStatus)
        ? item.paymentStatus
        : 'Unpaid',
      notes: clampStr(item.notes, 600, ''),
      updatedAt: serverTimestamp(),
    };
    if (isUpdate) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        eventId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteSubcollectionDoc(
  eventId: string,
  subcollection: 'budgetItems' | 'tasks' | 'vendors' | 'ideas' | 'messages',
  docId: string
): Promise<void> {
  const path = `events/${eventId}/${subcollection}/${docId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId, subcollection, docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveTaskToFirestore(
  uid: string,
  eventId: string,
  task: PlanoraTask,
  isUpdate = false
): Promise<void> {
  const cleanId = task.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const path = `events/${eventId}/tasks/${cleanId}`;
  try {
    const ref = doc(db, 'events', eventId, 'tasks', cleanId);
    const payload = {
      title: clampStr(task.title, 160, 'Task'),
      description: clampStr(task.description, 600, ''),
      dueDate: clampStr(task.dueDate, 32, '2027-01-01'),
      durationDays: Math.min(
        365,
        Math.max(1, Math.round(Number(task.durationDays) || 7))
      ),
      priority: ['High', 'Medium', 'Low'].includes(task.priority)
        ? task.priority
        : 'Medium',
      category: clampStr(task.category, 80, 'General'),
      status: ['Todo', 'In Progress', 'Completed'].includes(task.status)
        ? task.status
        : 'Todo',
      dependsOnTaskId: clampStr(task.dependsOnTaskId, 128, ''),
      assignee: clampStr(task.assignee, 100, ''),
      updatedAt: serverTimestamp(),
    };
    if (isUpdate) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        eventId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveVendorToFirestore(
  uid: string,
  eventId: string,
  vendor: PlanoraVendor,
  isUpdate = false
): Promise<void> {
  const cleanId = vendor.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const path = `events/${eventId}/vendors/${cleanId}`;
  try {
    const ref = doc(db, 'events', eventId, 'vendors', cleanId);
    const payload = {
      category: clampStr(vendor.category, 80, 'Venue'),
      vendorName: clampStr(vendor.vendorName, 140, 'Vendor'),
      contactInfo: clampStr(vendor.contactInfo, 200, ''),
      estimatedPrice: Math.max(0, Number(vendor.estimatedPrice) || 0),
      quotedAmount: Math.max(0, Number(vendor.quotedAmount) || 0),
      bookingStatus: [
        'Shortlisted',
        'Inquiry Sent',
        'Quoted',
        'Booked',
        'Declined',
      ].includes(vendor.bookingStatus)
        ? vendor.bookingStatus
        : 'Shortlisted',
      followUpDate: clampStr(vendor.followUpDate, 32, ''),
      notes: clampStr(vendor.notes, 800, ''),
      isAiSuggestion: Boolean(vendor.isAiSuggestion),
      updatedAt: serverTimestamp(),
    };
    if (isUpdate) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        eventId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveIdeaToFirestore(
  uid: string,
  eventId: string,
  idea: PlanoraIdea,
  isUpdate = false
): Promise<void> {
  const cleanId = idea.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const path = `events/${eventId}/ideas/${cleanId}`;
  try {
    const ref = doc(db, 'events', eventId, 'ideas', cleanId);
    const payload = {
      category: [
        'Decor',
        'Food & Beverage',
        'Entertainment',
        'Invitations',
        'Activities',
      ].includes(idea.category)
        ? idea.category
        : 'Decor',
      title: clampStr(idea.title, 160, 'Creative Idea'),
      description: clampStr(idea.description, 800, ''),
      estimatedCostImpact: clampStr(idea.estimatedCostImpact, 120, ''),
      executionTip: clampStr(idea.executionTip, 500, ''),
      updatedAt: serverTimestamp(),
    };
    if (isUpdate) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        eventId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveCopilotMessageToFirestore(
  uid: string,
  eventId: string,
  msg: CopilotChatMessage
): Promise<void> {
  const cleanId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  const path = `events/${eventId}/messages/${cleanId}`;
  try {
    const ref = doc(db, 'events', eventId, 'messages', cleanId);
    await setDoc(ref, {
      eventId,
      ownerId: uid,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: clampStr(msg.content, 4000, 'Message'),
      suggestedActionLabel: clampStr(msg.suggestedActionLabel || '', 200, ''),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
