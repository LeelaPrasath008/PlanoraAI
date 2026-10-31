import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from 'react';
import { motion } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  Wand2,
  LogOut,
  LogIn,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import {
  BudgetExpenseItem,
  CopilotChatMessage,
  PlanoraEvent,
  PlanoraIdea,
  PlanoraTask,
  PlanoraVendor,
  ProposedCopilotChange,
  formatCurrency,
} from './types/event';
import { DEMO_EVENTS } from './data/initialEvents';
import {
  ensureUserProfile,
  fetchUserEventsFromFirestore,
  fetchSharedEventFromFirestore,
  saveFullEventToFirestore,
  updateEventMetadataInFirestore,
  deleteEventFromFirestore,
  saveBudgetItemToFirestore,
  saveTaskToFirestore,
  saveVendorToFirestore,
  saveIdeaToFirestore,
  saveCopilotMessageToFirestore,
  deleteSubcollectionDoc,
} from './services/firestoreService';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PortfolioSection } from './components/sections/PortfolioSection';
import { OverviewSection } from './components/sections/OverviewSection';
import { BudgetSection } from './components/sections/BudgetSection';
import {
  TimelineSection,
  TaskViewMode,
} from './components/sections/TimelineSection';
import { VendorsSection } from './components/sections/VendorsSection';
import { ExportSection } from './components/sections/ExportSection';
import {
  BudgetOptimizationAdjustment,
  BudgetSummaryMetrics,
  calculateBudgetSummary,
  applyBudgetOptimization,
  applyConfirmedCopilotChange,
} from './utils/budgetCalculations';
import {
  TaskSummaryMetrics,
  calculateTaskSummary,
  recalculateTaskDeadlines,
} from './utils/taskScheduler';

export type WorkspaceSection =
  | 'portfolio'
  | 'overview'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'simulator'
  | 'copilot'
  | 'export';

const BlueprintGeneratorModal = lazy(() =>
  import('./components/BlueprintGeneratorModal').then((m) => ({
    default: m.BlueprintGeneratorModal,
  }))
);

const ScenarioSimulator = lazy(() =>
  import('./components/ScenarioSimulator').then((m) => ({
    default: m.ScenarioSimulator,
  }))
);

const AssistantCoPilot = lazy(() =>
  import('./components/AssistantCoPilot').then((m) => ({
    default: m.AssistantCoPilot,
  }))
);

function cloneInitialEvents(ownerId = 'demo-user'): PlanoraEvent[] {
  return DEMO_EVENTS.map((ev) => ({
    ...ev,
    ownerId,
    budgetItems: ev.budgetItems.map((b) => ({ ...b, ownerId })),
    tasks: ev.tasks.map((t) => ({ ...t, ownerId })),
    vendors: ev.vendors.map((v) => ({ ...v, ownerId })),
    ideas: ev.ideas.map((i) => ({ ...i, ownerId })),
    messages: ev.messages.map((m) => ({ ...m, ownerId })),
  }));
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const [events, setEvents] = useState<PlanoraEvent[]>(() =>
    cloneInitialEvents()
  );
  const [activeEventId, setActiveEventId] = useState<string>(
    DEMO_EVENTS[0]?.id || ''
  );
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('overview');
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('graph');

  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOptimizingBudget, setIsOptimizingBudget] = useState(false);
  const [budgetOptimizationPreview, setBudgetOptimizationPreview] = useState<{
    strategySummary: string;
    adjustments: BudgetOptimizationAdjustment[];
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  // Support read-only shared link URLs (?share=<eventId>&token=<shareToken>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedEventId = params.get('share');
    const sharedToken = params.get('token');
    if (!sharedEventId) return;

    const demoMatch = DEMO_EVENTS.find((e) => e.id === sharedEventId);
    if (demoMatch) {
      setEvents(cloneInitialEvents());
      setActiveEventId(demoMatch.id);
      setIsDemoMode(true);
      setViewMode('workspace');
      return;
    }

    if (sharedToken) {
      fetchSharedEventFromFirestore(sharedEventId, sharedToken)
        .then((sharedEvt) => {
          if (sharedEvt) {
            setEvents([sharedEvt]);
            setActiveEventId(sharedEvt.id);
            setIsDemoMode(false);
            setViewMode('workspace');
            showToast('Viewing shared event blueprint in read-only mode.');
          }
        })
        .catch(() => {
          // Fallback to default landing/demo
        });
    }
  }, [showToast]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        setIsLoadingCloud(true);
        try {
          await ensureUserProfile(
            firebaseUser.uid,
            firebaseUser.displayName || 'Planora Organizer',
            firebaseUser.email || ''
          );
          const cloudEvents = await fetchUserEventsFromFirestore(
            firebaseUser.uid
          );
          if (cloudEvents.length > 0) {
            setEvents(cloudEvents);
            setActiveEventId(cloudEvents[0].id);
            setIsDemoMode(false);
            setViewMode('workspace');
          } else {
            const seeded = cloneInitialEvents(firebaseUser.uid);
            const savedFirst = await saveFullEventToFirestore(
              firebaseUser.uid,
              seeded[0]
            );
            setEvents([savedFirst]);
            setActiveEventId(savedFirst.id);
            setIsDemoMode(false);
            setViewMode('workspace');
          }
        } catch {
          setAuthError(
            'Signed in, but could not load cloud events. Using local workspace.'
          );
        } finally {
          setIsLoadingCloud(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code !== 'auth/popup-closed-by-user') {
        const message =
          err instanceof Error
            ? err.message
            : 'Authentication could not be completed.';
        setAuthError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setEvents(cloneInitialEvents());
    setActiveEventId(DEMO_EVENTS[0].id);
    setIsDemoMode(true);
    setViewMode('landing');
  }, []);

  const activeEvent = useMemo(
    () => events.find((e) => e.id === activeEventId) || events[0] || null,
    [events, activeEventId]
  );

  const isReadOnly = useMemo(() => {
    if (!activeEvent) return true;
    if (isDemoMode) return false;
    if (user && activeEvent.ownerId === user.uid) {
      return activeEvent.status === 'completed';
    }
    return true;
  }, [activeEvent, isDemoMode, user]);

  // Derived Financial & Task Summaries via pure deterministic utilities
  const budgetSummary: BudgetSummaryMetrics = useMemo(() => {
    if (!activeEvent) {
      return {
        plannedTotal: 0,
        quotedTotal: 0,
        actualTotal: 0,
        lowRangeTotal: 0,
        highRangeTotal: 0,
        paidTotal: 0,
        pendingTotal: 0,
        contingencyAmount: 0,
        usableBudget: 0,
        remainingBudget: 0,
        utilizationPct: 0,
        perGuestPlanned: 0,
        perGuestTotalBudget: 0,
        isOverspent: false,
      };
    }
    return calculateBudgetSummary(activeEvent);
  }, [activeEvent]);

  const taskSummary: TaskSummaryMetrics = useMemo(() => {
    if (!activeEvent) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        daysUntilEvent: 0,
        progressPct: 0,
      };
    }
    return calculateTaskSummary(activeEvent.tasks, activeEvent.eventDate);
  }, [activeEvent]);

  // Persistence helpers
  const updateLocalEvent = useCallback((updated: PlanoraEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const handleSaveNewBlueprint = useCallback(
    async (newEvent: PlanoraEvent) => {
      const ownerId = user ? user.uid : 'demo-user';
      const eventWithOwner: PlanoraEvent = {
        ...newEvent,
        ownerId,
      };
      setEvents((prev) => [eventWithOwner, ...prev]);
      setActiveEventId(eventWithOwner.id);
      setActiveSection('overview');
      setViewMode('workspace');

      if (user && !isDemoMode) {
        try {
          await saveFullEventToFirestore(user.uid, eventWithOwner);
          showToast('Saved new AI event blueprint to private Cloud Firestore.');
        } catch {
          showToast('Saved blueprint locally in workspace.');
        }
      } else {
        showToast('Generated new AI event blueprint in workspace.');
      }
    },
    [user, isDemoMode, showToast]
  );

  const handleUpdateEventMeta = useCallback(
    async (patch: Partial<PlanoraEvent>) => {
      if (!activeEvent || isReadOnly) return;
      const updated: PlanoraEvent = {
        ...activeEvent,
        ...patch,
      };
      updateLocalEvent(updated);
      if (user && !isDemoMode) {
        try {
          await updateEventMetadataInFirestore(user.uid, updated);
        } catch {
          // Handled local optimistic state
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  // Portfolio Actions
  const handleDuplicateEvent = useCallback(
    async (evt: PlanoraEvent) => {
      const now = Date.now();
      const ownerId = user ? user.uid : 'demo-user';
      const newEventId = `evt_dup_${now}`;
      const duplicated: PlanoraEvent = {
        ...evt,
        id: newEventId,
        ownerId,
        title: `${evt.title} (Copy)`,
        status: 'active',
        isShared: false,
        shareToken: `shr_${now}`,
        budgetItems: evt.budgetItems.map((b, i) => ({
          ...b,
          id: `b_${now}_${i}`,
          eventId: newEventId,
          ownerId,
        })),
        tasks: evt.tasks.map((t, i) => ({
          ...t,
          id: `t_${now}_${i}`,
          eventId: newEventId,
          ownerId,
          dependsOnTaskId: '',
        })),
        vendors: evt.vendors.map((v, i) => ({
          ...v,
          id: `v_${now}_${i}`,
          eventId: newEventId,
          ownerId,
        })),
        ideas: evt.ideas.map((idea, i) => ({
          ...idea,
          id: `i_${now}_${i}`,
          eventId: newEventId,
          ownerId,
        })),
        messages: [],
      };
      setEvents((prev) => [duplicated, ...prev]);
      setActiveEventId(duplicated.id);
      if (user && !isDemoMode) {
        try {
          await saveFullEventToFirestore(user.uid, duplicated);
        } catch {
          // Local state updated
        }
      }
      showToast(`Duplicated "${evt.title}".`);
    },
    [user, isDemoMode, showToast]
  );

  const handleToggleArchiveEvent = useCallback(
    async (evt: PlanoraEvent) => {
      const nextStatus: PlanoraEvent['status'] =
        evt.status === 'archived' ? 'active' : 'archived';
      const updated: PlanoraEvent = { ...evt, status: nextStatus };
      updateLocalEvent(updated);
      if (user && !isDemoMode) {
        try {
          await updateEventMetadataInFirestore(user.uid, updated);
        } catch {
          // Local state updated
        }
      }
      showToast(
        nextStatus === 'archived'
          ? `Archived "${evt.title}".`
          : `Restored "${evt.title}" to active.`
      );
    },
    [updateLocalEvent, user, isDemoMode, showToast]
  );

  const handleDeleteEvent = useCallback(
    async (evt: PlanoraEvent) => {
      if (events.length <= 1) {
        showToast('At least one event must remain in your workspace.');
        return;
      }
      const remaining = events.filter((e) => e.id !== evt.id);
      setEvents(remaining);
      if (activeEventId === evt.id) {
        setActiveEventId(remaining[0].id);
      }
      if (user && !isDemoMode) {
        try {
          await deleteEventFromFirestore(user.uid, evt);
        } catch {
          // Local state updated
        }
      }
      showToast(`Deleted "${evt.title}".`);
    },
    [events, activeEventId, user, isDemoMode, showToast]
  );

  // Budget Item CRUD
  const handleAddBudgetItem = useCallback(
    async (item: BudgetExpenseItem) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        budgetItems: [...activeEvent.budgetItems, item],
      });
      if (user && !isDemoMode) {
        try {
          await saveBudgetItemToFirestore(user.uid, activeEvent.id, item, false);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleUpdateBudgetItem = useCallback(
    async (updated: BudgetExpenseItem) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        budgetItems: activeEvent.budgetItems.map((b) =>
          b.id === updated.id ? updated : b
        ),
      });
      if (user && !isDemoMode) {
        try {
          await saveBudgetItemToFirestore(
            user.uid,
            activeEvent.id,
            updated,
            true
          );
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleDeleteBudgetItem = useCallback(
    async (itemId: string) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        budgetItems: activeEvent.budgetItems.filter((b) => b.id !== itemId),
      });
      if (user && !isDemoMode) {
        try {
          await deleteSubcollectionDoc(activeEvent.id, 'budgetItems', itemId);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  // AI Budget Optimizer
  const handleRunBudgetOptimizer = useCallback(async () => {
    if (!activeEvent || isReadOnly) return;
    setIsOptimizingBudget(true);
    try {
      const res = await fetch('/api/ai/optimize-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: activeEvent }),
      });
      if (res.ok) {
        const data = await res.json();
        setBudgetOptimizationPreview({
          strategySummary: String(
            data.strategySummary ||
              'Optimized non-priority categories to preserve contingency buffer.'
          ),
          adjustments: Array.isArray(data.adjustments) ? data.adjustments : [],
        });
      }
    } catch {
      showToast('Could not generate budget optimization preview.');
    } finally {
      setIsOptimizingBudget(false);
    }
  }, [activeEvent, isReadOnly, showToast]);

  const handleConfirmBudgetOptimization = useCallback(async () => {
    if (!activeEvent || !budgetOptimizationPreview || isReadOnly) return;
    const updatedItems = applyBudgetOptimization(
      activeEvent.budgetItems,
      budgetOptimizationPreview.adjustments
    );
    updateLocalEvent({ ...activeEvent, budgetItems: updatedItems });
    setBudgetOptimizationPreview(null);

    if (user && !isDemoMode) {
      try {
        await Promise.all(
          updatedItems.map((b) =>
            saveBudgetItemToFirestore(user.uid, activeEvent.id, b, true)
          )
        );
      } catch {
        // Local state updated
      }
    }
    showToast('Applied AI budget optimization to your event plan.');
  }, [
    activeEvent,
    budgetOptimizationPreview,
    isReadOnly,
    updateLocalEvent,
    user,
    isDemoMode,
    showToast,
  ]);

  // Task CRUD (with parallel Promise.all batch updates)
  const handleAddTask = useCallback(
    async (task: PlanoraTask) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        tasks: [...activeEvent.tasks, task],
      });
      if (user && !isDemoMode) {
        try {
          await saveTaskToFirestore(user.uid, activeEvent.id, task, false);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleUpdateTask = useCallback(
    async (task: PlanoraTask) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        tasks: activeEvent.tasks.map((t) => (t.id === task.id ? task : t)),
      });
      if (user && !isDemoMode) {
        try {
          await saveTaskToFirestore(user.uid, activeEvent.id, task, true);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleBatchUpdateTasks = useCallback(
    async (updatedTasksList: PlanoraTask[]) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({ ...activeEvent, tasks: updatedTasksList });
      if (user && !isDemoMode) {
        try {
          await Promise.all(
            updatedTasksList.map((t) =>
              saveTaskToFirestore(user.uid, activeEvent.id, t, true)
            )
          );
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!activeEvent || isReadOnly) return;
      const cleanedTasks = activeEvent.tasks
        .filter((t) => t.id !== taskId)
        .map((t) =>
          t.dependsOnTaskId === taskId ? { ...t, dependsOnTaskId: '' } : t
        );
      updateLocalEvent({ ...activeEvent, tasks: cleanedTasks });
      if (user && !isDemoMode) {
        try {
          await deleteSubcollectionDoc(activeEvent.id, 'tasks', taskId);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleRecalculateDeadlines = useCallback(
    async (newEventDate: string) => {
      if (!activeEvent || isReadOnly || !newEventDate) return;
      const recalced = recalculateTaskDeadlines(
        activeEvent.tasks,
        activeEvent.eventDate,
        newEventDate
      );
      const updatedEvent: PlanoraEvent = {
        ...activeEvent,
        eventDate: newEventDate,
        tasks: recalced,
      };
      updateLocalEvent(updatedEvent);
      if (user && !isDemoMode) {
        try {
          await Promise.all([
            updateEventMetadataInFirestore(user.uid, updatedEvent),
            ...recalced.map((t) =>
              saveTaskToFirestore(user.uid, activeEvent.id, t, true)
            ),
          ]);
        } catch {
          // Local state updated
        }
      }
      showToast('Recalculated all task deadlines for the new event date.');
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode, showToast]
  );

  // Vendor CRUD
  const handleAddVendor = useCallback(
    async (vendor: PlanoraVendor) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        vendors: [...activeEvent.vendors, vendor],
      });
      if (user && !isDemoMode) {
        try {
          await saveVendorToFirestore(user.uid, activeEvent.id, vendor, false);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleUpdateVendor = useCallback(
    async (vendor: PlanoraVendor) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        vendors: activeEvent.vendors.map((v) =>
          v.id === vendor.id ? vendor : v
        ),
      });
      if (user && !isDemoMode) {
        try {
          await saveVendorToFirestore(user.uid, activeEvent.id, vendor, true);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  const handleDeleteVendor = useCallback(
    async (vendorId: string) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        vendors: activeEvent.vendors.filter((v) => v.id !== vendorId),
      });
      if (user && !isDemoMode) {
        try {
          await deleteSubcollectionDoc(activeEvent.id, 'vendors', vendorId);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  // Creative Idea CRUD
  const handleAddIdea = useCallback(
    async (idea: PlanoraIdea) => {
      if (!activeEvent || isReadOnly) return;
      updateLocalEvent({
        ...activeEvent,
        ideas: [idea, ...activeEvent.ideas],
      });
      if (user && !isDemoMode) {
        try {
          await saveIdeaToFirestore(user.uid, activeEvent.id, idea, false);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, isReadOnly, updateLocalEvent, user, isDemoMode]
  );

  // Copilot Message & Confirmed Action Handlers
  const handleSendMessage = useCallback(
    async (userMsg: CopilotChatMessage, assistantMsg: CopilotChatMessage) => {
      if (!activeEvent) return;
      updateLocalEvent({
        ...activeEvent,
        messages: [...activeEvent.messages, userMsg, assistantMsg],
      });
      if (user && !isDemoMode) {
        try {
          await Promise.all([
            saveCopilotMessageToFirestore(user.uid, activeEvent.id, userMsg),
            saveCopilotMessageToFirestore(
              user.uid,
              activeEvent.id,
              assistantMsg
            ),
          ]);
        } catch {
          // Local state updated
        }
      }
    },
    [activeEvent, updateLocalEvent, user, isDemoMode]
  );

  const handleConfirmProposedChange = useCallback(
    async (messageId: string, change: ProposedCopilotChange) => {
      if (!activeEvent || isReadOnly) return;
      const ownerId = user ? user.uid : 'demo-user';
      const result = applyConfirmedCopilotChange(activeEvent, change, ownerId);

      const updatedMessages = result.updatedEvent.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              applied: true,
            }
          : m
      );

      const finalEvent: PlanoraEvent = {
        ...result.updatedEvent,
        messages: updatedMessages,
      };
      updateLocalEvent(finalEvent);

      if (user && !isDemoMode) {
        try {
          const ops: Promise<unknown>[] = [];
          if (result.syncMetadata) {
            ops.push(updateEventMetadataInFirestore(user.uid, finalEvent));
          }
          if (result.addedBudgetItem) {
            ops.push(
              saveBudgetItemToFirestore(
                user.uid,
                finalEvent.id,
                result.addedBudgetItem,
                false
              )
            );
          }
          if (result.addedTask) {
            ops.push(
              saveTaskToFirestore(
                user.uid,
                finalEvent.id,
                result.addedTask,
                false
              )
            );
          }
          if (result.addedVendor) {
            ops.push(
              saveVendorToFirestore(
                user.uid,
                finalEvent.id,
                result.addedVendor,
                false
              )
            );
          }
          if (result.addedIdea) {
            ops.push(
              saveIdeaToFirestore(
                user.uid,
                finalEvent.id,
                result.addedIdea,
                false
              )
            );
          }
          await Promise.all(ops);
        } catch {
          // Local state updated
        }
      }
      showToast(`Confirmed & applied: ${change.summaryLabel}`);
    },
    [activeEvent, isReadOnly, user, isDemoMode, updateLocalEvent, showToast]
  );

  // Share Token Toggle & Copy
  const handleToggleShareAccess = useCallback(async () => {
    if (!activeEvent || isReadOnly) return;
    if (activeEvent.isShared) {
      await handleUpdateEventMeta({ isShared: false });
      showToast('Revoked shared read-only link.');
    } else {
      const token =
        activeEvent.shareToken ||
        `shr_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      await handleUpdateEventMeta({ isShared: true, shareToken: token });
      showToast('Enabled shareable read-only link.');
    }
  }, [activeEvent, isReadOnly, handleUpdateEventMeta, showToast]);

  const handleCopyShareLink = useCallback(() => {
    if (!activeEvent) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${activeEvent.id}&token=${activeEvent.shareToken}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast('Copied read-only share link to clipboard.');
  }, [activeEvent, showToast]);

  if (viewMode === 'landing') {
    return (
      <ErrorBoundary>
        <LandingPage
          onEnterDemoWorkspace={(demoId) => {
            const list = cloneInitialEvents();
            setEvents(list);
            setActiveEventId(demoId || list[0].id);
            setIsDemoMode(true);
            setViewMode('workspace');
          }}
          onStartWizard={() => {
            setViewMode('workspace');
            setIsWizardOpen(true);
          }}
          onGoogleSignIn={handleGoogleSignIn}
          isSigningIn={isSigningIn}
        />
        <Suspense fallback={null}>
          {isWizardOpen && (
            <BlueprintGeneratorModal
              isOpen={isWizardOpen}
              ownerId={user ? user.uid : 'demo-user'}
              onClose={() => setIsWizardOpen(false)}
              onCreated={handleSaveNewBlueprint}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
        {/* Skip to Main Content Accessibility Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1E1B4B] focus:text-white focus:rounded-lg focus:text-xs focus:font-semibold"
        >
          Skip to main content
        </a>

        {/* TOP BAR CONTRACT: 3 distinct zones separated by gap-8 */}
        <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 no-print">
          {/* Zone 1: Brand & Event Switcher */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('landing')}
              className="text-base font-bold tracking-tight text-[#1E1B4B] font-display whitespace-nowrap shrink-0"
            >
              Planora AI
            </button>

            <span className="text-slate-300" aria-hidden="true">
              /
            </span>

            {activeEvent && (
              <select
                value={activeEvent.id}
                onChange={(e) => setActiveEventId(e.target.value)}
                aria-label="Select Active Event"
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 max-w-[230px] truncate"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.guestCount} guests)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Zone 2: Primary Section Navigation */}
          <nav
            aria-label="Workspace Sections"
            className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-600"
          >
            {(
              [
                { id: 'portfolio', label: 'Portfolio' },
                { id: 'overview', label: 'Overview & Concept' },
                { id: 'budget', label: 'Budget & Costs' },
                { id: 'timeline', label: 'Timeline & Dependencies' },
                { id: 'vendors', label: 'Vendors & Quotes' },
                { id: 'simulator', label: 'Scenario Simulator' },
                { id: 'copilot', label: 'AI Copilot' },
                { id: 'export', label: 'Share & Export' },
              ] as Array<{ id: WorkspaceSection; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === tab.id
                    ? 'text-[#1E1B4B] font-bold border-b-2 border-[#1E1B4B]'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action & Auth Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg whitespace-nowrap shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>New Event Blueprint</span>
            </motion.button>

            {isAuthReady &&
              (user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  title={`Signed in as ${user.email || user.displayName}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#059669] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isSigningIn ? 'Signing In...' : 'Cloud Sign In'}
                  </span>
                </button>
              ))}
          </div>
        </header>

        {/* Mobile Section Switcher */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-print">
          {(
            [
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'overview', label: 'Overview' },
              { id: 'budget', label: 'Budget' },
              { id: 'timeline', label: 'Dependencies' },
              { id: 'vendors', label: 'Vendors' },
              { id: 'simulator', label: 'Simulator' },
              { id: 'copilot', label: 'Copilot' },
              { id: 'export', label: 'Export' },
            ] as Array<{ id: WorkspaceSection; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeSection === tab.id
                  ? 'bg-[#1E1B4B] text-white'
                  : 'text-slate-600 bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Demo / Cloud Context Banner */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-[#1E1B4B]">
              {isDemoMode
                ? 'Interactive Demo Workspace (Sample Event Data)'
                : user
                ? `Private Cloud Workspace (${user.email || user.displayName})`
                : 'Shared Event View'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isDemoMode
                ? 'Changes apply immediately in this session. Sign in with Google to save privately to Cloud Firestore.'
                : 'All changes sync to your private Cloud Firestore collection.'}
            </span>
          </div>

          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#059669]"
            >
              {toastMessage}
            </div>
          )}
        </div>

        {authError && (
          <div
            role="alert"
            className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 flex items-center justify-between"
          >
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MAIN WORKSPACE CONTENT */}
        <main
          id="main-content"
          className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6"
        >
          {isLoadingCloud ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
              Loading your private event blueprints...
            </div>
          ) : !activeEvent ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <p className="text-sm text-slate-600">No active event selected.</p>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] rounded-lg"
              >
                Create First Event Blueprint
              </button>
            </div>
          ) : (
            <>
              {/* EVENT SUMMARY HEADER & 4 METRIC CARDS */}
              <section className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="text-xs text-slate-500 font-mono tabular-nums flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#059669]">
                        {activeEvent.eventType}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEvent.city}</span>
                      <span aria-hidden="true">·</span>
                      <span>Date: {activeEvent.eventDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEvent.guestCount} Guests</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEvent.venuePreference} Venue</span>
                      <span aria-hidden="true">·</span>
                      <span>Status: {activeEvent.status}</span>
                    </div>

                    <h1 className="text-2xl font-bold text-[#1E1B4B] font-display tracking-tight">
                      {activeEvent.title}
                    </h1>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeEvent.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
                    {!isReadOnly && (
                      <select
                        value={activeEvent.status}
                        aria-label="Event Status"
                        onChange={(e) =>
                          handleUpdateEventMeta({
                            status: e.target.value as PlanoraEvent['status'],
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-[#FAF8F5] border border-slate-300 rounded-lg"
                      >
                        <option value="active">Status: Active</option>
                        <option value="archived">Status: Archived</option>
                        <option value="completed">
                          Status: Completed (Locked)
                        </option>
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveSection('simulator')}
                      className="px-3 py-1.5 text-xs font-medium text-[#1E1B4B] bg-[#FAF8F5] border border-slate-300 rounded-lg hover:bg-slate-100"
                    >
                      Run “What If?” Simulator
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('export')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Export / Share</span>
                    </button>
                  </div>
                </div>

                {/* 4 Financial & Execution Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">
                      Total Event Budget
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(
                        activeEvent.totalBudget,
                        activeEvent.currency
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                      {formatCurrency(
                        budgetSummary.perGuestPlanned,
                        activeEvent.currency
                      )}{' '}
                      planned / guest
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">
                      Planned + {activeEvent.contingencyPercent}% Contingency
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#1E1B4B] font-mono tabular-nums">
                      {formatCurrency(
                        budgetSummary.plannedTotal +
                          budgetSummary.contingencyAmount,
                        activeEvent.currency
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                      {budgetSummary.utilizationPct}% utilized · Paid:{' '}
                      {formatCurrency(
                        budgetSummary.paidTotal,
                        activeEvent.currency
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">
                      Remaining Unallocated Buffer
                    </div>
                    <div
                      className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                        budgetSummary.isOverspent
                          ? 'text-red-600'
                          : 'text-[#059669]'
                      }`}
                    >
                      {formatCurrency(
                        budgetSummary.remainingBudget,
                        activeEvent.currency
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {budgetSummary.isOverspent
                        ? 'Over budget — use AI Budget Optimizer'
                        : 'Healthy reserve buffer available'}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">
                      Milestone & Dependency Readiness
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                      {taskSummary.completed}/{taskSummary.total} (
                      {taskSummary.progressPct}%)
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                      {taskSummary.pending} pending · {taskSummary.overdue}{' '}
                      overdue
                    </div>
                  </div>
                </div>

                {/* Budget Overrun Alert Banner */}
                {budgetSummary.isOverspent && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-red-900">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Planned allocations plus contingency exceed your target
                        budget by{' '}
                        <strong className="font-mono tabular-nums">
                          {formatCurrency(
                            Math.abs(budgetSummary.remainingBudget),
                            activeEvent.currency
                          )}
                        </strong>
                        .
                      </span>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        disabled={isOptimizingBudget}
                        onClick={() => {
                          setActiveSection('budget');
                          handleRunBudgetOptimizer();
                        }}
                        className="px-3 py-1.5 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shrink-0"
                      >
                        {isOptimizingBudget
                          ? 'Analyzing...'
                          : 'Preview AI Budget Optimization'}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* SECTION 1: PORTFOLIO */}
              {activeSection === 'portfolio' && (
                <PortfolioSection
                  allEvents={events}
                  onOpenWizard={() => setIsWizardOpen(true)}
                  onSelectEvent={(id) => {
                    setActiveEventId(id);
                    setActiveSection('overview');
                  }}
                  onDuplicateEvent={handleDuplicateEvent}
                  onToggleArchiveEvent={handleToggleArchiveEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}

              {/* SECTION 2: OVERVIEW & CONCEPT */}
              {activeSection === 'overview' && (
                <OverviewSection
                  activeEvent={activeEvent}
                  isReadOnly={isReadOnly}
                  ownerId={user ? user.uid : 'demo-user'}
                  onAddIdea={handleAddIdea}
                  onSendMessage={handleSendMessage}
                  onConfirmProposedChange={handleConfirmProposedChange}
                />
              )}

              {/* SECTION 3: BUDGET & FINANCIALS */}
              {activeSection === 'budget' && (
                <BudgetSection
                  activeEvent={activeEvent}
                  budgetSummary={budgetSummary}
                  isReadOnly={isReadOnly}
                  ownerId={user ? user.uid : 'demo-user'}
                  isOptimizingBudget={isOptimizingBudget}
                  budgetOptimizationPreview={budgetOptimizationPreview}
                  onRunBudgetOptimizer={handleRunBudgetOptimizer}
                  onConfirmBudgetOptimization={handleConfirmBudgetOptimization}
                  onDismissBudgetOptimization={() =>
                    setBudgetOptimizationPreview(null)
                  }
                  onUpdateBudgetItem={handleUpdateBudgetItem}
                  onDeleteBudgetItem={handleDeleteBudgetItem}
                  onAddBudgetItem={handleAddBudgetItem}
                />
              )}

              {/* SECTION 4: TIMELINE & VISUAL TASK DEPENDENCY GRAPH */}
              {activeSection === 'timeline' && (
                <TimelineSection
                  activeEvent={activeEvent}
                  isReadOnly={isReadOnly}
                  ownerId={user ? user.uid : 'demo-user'}
                  taskViewMode={taskViewMode}
                  onChangeTaskViewMode={setTaskViewMode}
                  onRecalculateDeadlines={handleRecalculateDeadlines}
                  onUpdateTask={handleUpdateTask}
                  onBatchUpdateTasks={handleBatchUpdateTasks}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={handleAddTask}
                />
              )}

              {/* SECTION 5: VENDORS & QUOTES */}
              {activeSection === 'vendors' && (
                <VendorsSection
                  activeEvent={activeEvent}
                  isReadOnly={isReadOnly}
                  ownerId={user ? user.uid : 'demo-user'}
                  onUpdateVendor={handleUpdateVendor}
                  onDeleteVendor={handleDeleteVendor}
                  onAddVendor={handleAddVendor}
                />
              )}

              {/* SECTION 6: INTERACTIVE SCENARIO SIMULATOR */}
              {activeSection === 'simulator' && (
                <Suspense
                  fallback={
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                      Loading Interactive Scenario Simulator...
                    </div>
                  }
                >
                  <ScenarioSimulator
                    event={activeEvent}
                    onApplyScenario={async (updatedEvent) => {
                      updateLocalEvent(updatedEvent);
                      if (user && !isDemoMode) {
                        try {
                          await saveFullEventToFirestore(
                            user.uid,
                            updatedEvent
                          );
                        } catch {
                          // Local state updated
                        }
                      }
                      showToast(
                        'Applied simulated scenario to your saved event plan.'
                      );
                    }}
                  />
                </Suspense>
              )}

              {/* SECTION 7: CONVERSATIONAL AI COPILOT */}
              {activeSection === 'copilot' && (
                <Suspense
                  fallback={
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                      Loading AI Event Copilot...
                    </div>
                  }
                >
                  <AssistantCoPilot
                    event={activeEvent}
                    onSendMessage={handleSendMessage}
                    onConfirmProposedChange={handleConfirmProposedChange}
                  />
                </Suspense>
              )}

              {/* SECTION 8: SHARE & EXPORT */}
              {activeSection === 'export' && (
                <ExportSection
                  activeEvent={activeEvent}
                  budgetSummary={budgetSummary}
                  onToggleShareAccess={handleToggleShareAccess}
                  onCopyShareLink={handleCopyShareLink}
                />
              )}
            </>
          )}
        </main>

        {/* 5-Step Blueprint Generator Modal */}
        <Suspense fallback={null}>
          {isWizardOpen && (
            <BlueprintGeneratorModal
              isOpen={isWizardOpen}
              ownerId={user ? user.uid : 'demo-user'}
              onClose={() => setIsWizardOpen(false)}
              onCreated={handleSaveNewBlueprint}
            />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
export default App;
