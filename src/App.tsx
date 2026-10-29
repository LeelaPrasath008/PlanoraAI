/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wand2,
  Loader2,
  Download,
  Copy,
  Archive,
  Share2,
  Printer,
  LogOut,
  LogIn,
  Calendar as CalendarIcon,
  List as ListIcon,
  GitBranch,
  Network,
  SlidersHorizontal,
  Check,
  Sparkles,
  CloudUpload,
} from 'lucide-react';
import { auth, db, googleProvider } from './lib/firebase';
import {
  ensureUserProfile,
  fetchUserEventsFromFirestore,
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
import {
  BudgetExpenseItem,
  CopilotChatMessage,
  formatCurrency,
  PlanoraEvent,
  PlanoraIdea,
  PlanoraTask,
  PlanoraVendor,
  ProposedCopilotChange,
  WorkspaceSection,
} from './types/event';
import { DEMO_EVENTS } from './data/initialEvents';
import { EventArtwork } from './components/EventArtwork';
import { BudgetDonutChart } from './components/BudgetDonutChart';
import { BlueprintGeneratorModal } from './components/BlueprintGeneratorModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { AssistantCoPilot } from './components/AssistantCoPilot';
import { LandingPage } from './components/LandingPage';
import { TaskDependencyGraph } from './components/TaskDependencyGraph';
import { DraggableGanttChart } from './components/DraggableGanttChart';

const DEMO_STORAGE_KEY = 'planora_ai_demo_events_v4';

const VENDOR_INQUIRY_QUESTIONS: Record<string, string[]> = {
  Venue: [
    'Is generator fuel and backup power included in the rental fee?',
    'What is the exact load-in time for decorators and sound cutoff time at night?',
    'Are outside caterers and decorators permitted without a royalty fee?',
  ],
  Catering: [
    'Does the per-plate rate include service staff, chafing fuel, and drinking water stations?',
    'What is the guaranteed headcount lock deadline before the event?',
    'How are Jain, vegan, or allergy-safe counters physically separated?',
  ],
  Decoration: [
    'Are floral arrangements using fresh seasonal blooms or reusable fabric/brass elements?',
    'Does the quote include entrance lighting, mandap/stage seating, and teardown labor?',
  ],
  Photography: [
    'How many photographers/cinematographers will be on-site and when are raw/edited galleries delivered?',
    'Are drone permissions or album prints included in the package?',
  ],
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [aiConfigured, setAiConfigured] = useState<boolean>(true);

  // Demo events isolated in local state/storage
  const [demoEvents, setDemoEvents] = useState<PlanoraEvent[]>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEMO_EVENTS;
  });

  // Cloud events owned by authenticated user
  const [cloudEvents, setCloudEvents] = useState<PlanoraEvent[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Read-only shared event state (if URL has ?share=...)
  const [sharedReadOnlyEvent, setSharedReadOnlyEvent] =
    useState<PlanoraEvent | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    DEMO_EVENTS[0].id
  );
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Filters & Sub-views
  const [searchQuery, setSearchQuery] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<string>('All');
  const [taskViewMode, setTaskViewMode] = useState<
    'gantt' | 'graph' | 'tree' | 'list' | 'calendar' | 'timeline'
  >('gantt');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [vendorViewMode, setVendorViewMode] = useState<
    'list' | 'compare' | 'checklist'
  >('list');

  // AI Optimize Budget Modal / Preview State
  const [isOptimizingBudget, setIsOptimizingBudget] = useState(false);
  const [budgetOptimizationPreview, setBudgetOptimizationPreview] = useState<{
    strategySummary: string;
    adjustments: Array<{
      id: string;
      category: string;
      title: string;
      currentPlanned: number;
      recommendedPlanned: number;
      rationale: string;
    }>;
  } | null>(null);

  // Quick-add form states
  const [newExpense, setNewExpense] = useState({
    category: 'Catering',
    title: '',
    plannedAmount: '',
    quotedAmount: '',
    actualAmount: '',
    paymentStatus: 'Unpaid' as BudgetExpenseItem['paymentStatus'],
    notes: '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '2027-01-15',
    durationDays: '7',
    priority: 'High' as PlanoraTask['priority'],
    category: 'Venue',
    dependsOnTaskId: '',
    assignee: '',
  });

  const [newVendor, setNewVendor] = useState({
    category: 'Catering',
    vendorName: '',
    contactInfo: '',
    estimatedPrice: '',
    quotedAmount: '',
    bookingStatus: 'Quoted' as PlanoraVendor['bookingStatus'],
    followUpDate: '2027-01-20',
    notes: '',
  });

  const [newIdea, setNewIdea] = useState({
    category: 'Decor' as PlanoraIdea['category'],
    title: '',
    description: '',
    estimatedCostImpact: '',
    executionTip: '',
  });

  const [copyBanner, setCopyBanner] = useState<string | null>(null);

  // Check AI configuration status
  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  // Persist Demo Events locally (isolated from private user data)
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoEvents));
    } catch {
      // ignore
    }
  }, [demoEvents]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      setIsAuthReady(true);
      if (currUser) {
        setShowLanding(false);
        setIsLoadingCloud(true);
        setCloudError(null);
        try {
          await ensureUserProfile(
            currUser.uid,
            currUser.displayName || 'Planora Organizer',
            currUser.email || ''
          );
          const loaded = await fetchUserEventsFromFirestore(currUser.uid);
          setCloudEvents(loaded);
          if (loaded.length > 0) {
            setSelectedEventId(loaded[0].id);
          }
        } catch (err: any) {
          setCloudError(
            'Loaded workspace with isolated demo plans. Cloud sync status: ' +
              (err?.message ? 'check permissions' : 'offline')
          );
        } finally {
          setIsLoadingCloud(false);
        }
      } else {
        setCloudEvents([]);
      }
    });
    return () => unsub();
  }, []);

  // Check if URL has ?share=<eventId>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('share');
    if (sharedId && isAuthReady && user) {
      getDoc(doc(db, 'events', sharedId))
        .then((snap) => {
          if (snap.exists() && snap.data().isShared) {
            setShowLanding(false);
          }
        })
        .catch(() => {
          // ignore if not accessible
        });
    }
  }, [isAuthReady, user]);

  // Combined list of accessible events (User's private cloud events + clearly labeled Demo events)
  const allEvents = useMemo(() => {
    if (sharedReadOnlyEvent) return [sharedReadOnlyEvent];
    return [...cloudEvents, ...demoEvents];
  }, [cloudEvents, demoEvents, sharedReadOnlyEvent]);

  const activeEvent = useMemo(() => {
    return (
      allEvents.find((e) => e.id === selectedEventId) ||
      allEvents[0] ||
      DEMO_EVENTS[0]
    );
  }, [allEvents, selectedEventId]);

  const isReadOnly = Boolean(
    sharedReadOnlyEvent || activeEvent.status === 'completed'
  );

  // Helper to update activeEvent in local state and sync to Firestore if it's a private cloud event
  const mutateActiveEvent = async (
    updater: (curr: PlanoraEvent) => PlanoraEvent,
    syncMetadata = false
  ) => {
    const updated = updater(activeEvent);
    if (activeEvent.isDemo) {
      setDemoEvents((prev) =>
        prev.map((e) => (e.id === activeEvent.id ? updated : e))
      );
    } else if (user) {
      setCloudEvents((prev) =>
        prev.map((e) => (e.id === activeEvent.id ? updated : e))
      );
      if (syncMetadata) {
        try {
          await updateEventMetadataInFirestore(user.uid, updated);
        } catch (err: any) {
          setCloudError('Failed to sync event metadata to Cloud Firestore.');
        }
      }
    }
  };

  //Deterministic Budget Calculations in Application Code (Section 7)
  const budgetSummary = useMemo(() => {
    const plannedTotal = activeEvent.budgetItems.reduce(
      (sum, i) => sum + (Number(i.plannedAmount) || 0),
      0
    );
    const quotedTotal = activeEvent.budgetItems.reduce(
      (sum, i) => sum + (Number(i.quotedAmount) || 0),
      0
    );
    const actualTotal = activeEvent.budgetItems.reduce(
      (sum, i) => sum + (Number(i.actualAmount) || 0),
      0
    );
    const lowRangeTotal = activeEvent.budgetItems.reduce(
      (sum, i) => sum + (Number(i.lowEstimate) || Number(i.plannedAmount) || 0),
      0
    );
    const highRangeTotal = activeEvent.budgetItems.reduce(
      (sum, i) =>
        sum + (Number(i.highEstimate) || Number(i.plannedAmount) || 0),
      0
    );
    const paidTotal = activeEvent.budgetItems
      .filter((i) => i.paymentStatus === 'Paid')
      .reduce((sum, i) => sum + (Number(i.actualAmount) || 0), 0);
    const pendingTotal = activeEvent.budgetItems
      .filter((i) => i.paymentStatus === 'Pending')
      .reduce(
        (sum, i) =>
          sum +
          Math.max(
            0,
            (Number(i.quotedAmount) || Number(i.plannedAmount) || 0) -
              (Number(i.actualAmount) || 0)
          ),
        0
      );

    const contingencyAmount = Math.round(
      activeEvent.totalBudget *
        (Math.max(0, activeEvent.contingencyPercent) / 100)
    );
    const usableBudget = activeEvent.totalBudget - contingencyAmount;
    const remainingBudget =
      activeEvent.totalBudget - plannedTotal - contingencyAmount;
    const utilizationPct = Math.round(
      ((plannedTotal + contingencyAmount) /
        Math.max(1, activeEvent.totalBudget)) *
        100
    );
    const isOverspent = remainingBudget < 0 || quotedTotal > usableBudget;

    return {
      plannedTotal,
      quotedTotal,
      actualTotal,
      lowRangeTotal,
      highRangeTotal,
      paidTotal,
      pendingTotal,
      contingencyAmount,
      usableBudget,
      remainingBudget,
      utilizationPct,
      isOverspent,
    };
  }, [activeEvent]);

  // Task & Countdown Metrics
  const taskSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const completed = activeEvent.tasks.filter(
      (t) => t.status === 'Completed'
    ).length;
    const overdue = activeEvent.tasks.filter(
      (t) => t.status !== 'Completed' && t.dueDate < today
    ).length;
    const daysUntilEvent = Math.ceil(
      (new Date(activeEvent.eventDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    return {
      total: activeEvent.tasks.length,
      completed,
      pending: activeEvent.tasks.length - completed,
      overdue,
      daysUntilEvent,
      progressPct: Math.round(
        (completed / Math.max(1, activeEvent.tasks.length)) * 100
      ),
    };
  }, [activeEvent.tasks, activeEvent.eventDate]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setCloudError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLanding(false);
    } catch (err: any) {
      setCloudError(
        err?.message || 'Google Sign-In was cancelled or blocked by popup settings.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSelectedEventId(DEMO_EVENTS[0].id);
  };

  // Save a Demo Event into Authenticated User's Cloud Firestore
  const handleSaveDemoToCloud = async (demoEvt: PlanoraEvent) => {
    if (!user) {
      await handleGoogleSignIn();
      return;
    }
    setIsLoadingCloud(true);
    try {
      const now = Date.now();
      const newEvtId = `evt_${now}`;
      const cloned: PlanoraEvent = {
        ...demoEvt,
        id: newEvtId,
        ownerId: user.uid,
        isDemo: false,
        title: demoEvt.title.replace(/\s*\(Illustrative Demo\)|\s*\(Demo\)/gi, ''),
        budgetItems: demoEvt.budgetItems.map((b, i) => ({
          ...b,
          id: `b_${now}_${i}`,
          eventId: newEvtId,
          ownerId: user.uid,
        })),
        tasks: demoEvt.tasks.map((t, i) => ({
          ...t,
          id: `t_${now}_${i}`,
          eventId: newEvtId,
          ownerId: user.uid,
          dependsOnTaskId: '',
        })),
        vendors: demoEvt.vendors.map((v, i) => ({
          ...v,
          id: `v_${now}_${i}`,
          eventId: newEvtId,
          ownerId: user.uid,
        })),
        ideas: demoEvt.ideas.map((idea, i) => ({
          ...idea,
          id: `i_${now}_${i}`,
          eventId: newEvtId,
          ownerId: user.uid,
        })),
        messages: [],
      };
      const saved = await saveFullEventToFirestore(user.uid, cloned);
      setCloudEvents((prev) => [saved, ...prev]);
      setSelectedEventId(saved.id);
      setCopyBanner('Saved event to your private Cloud Firestore workspace.');
      setTimeout(() => setCopyBanner(null), 4000);
    } catch (err: any) {
      setCloudError('Could not save event to Cloud Firestore.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Duplicate Event
  const handleDuplicateEvent = async (evt: PlanoraEvent) => {
    const now = Date.now();
    const newId = `evt_${now}`;
    const owner = user ? user.uid : 'demo-user';
    const dup: PlanoraEvent = {
      ...evt,
      id: newId,
      ownerId: owner,
      isDemo: !user,
      title: `${evt.title} (Copy)`,
      status: 'active',
      budgetItems: evt.budgetItems.map((b, i) => ({
        ...b,
        id: `b_${now}_${i}`,
        eventId: newId,
        ownerId: owner,
      })),
      tasks: evt.tasks.map((t, i) => ({
        ...t,
        id: `t_${now}_${i}`,
        eventId: newId,
        ownerId: owner,
        dependsOnTaskId: '',
      })),
      vendors: evt.vendors.map((v, i) => ({
        ...v,
        id: `v_${now}_${i}`,
        eventId: newId,
        ownerId: owner,
      })),
      ideas: evt.ideas.map((idea, i) => ({
        ...idea,
        id: `i_${now}_${i}`,
        eventId: newId,
        ownerId: owner,
      })),
      messages: [],
    };

    if (user) {
      const saved = await saveFullEventToFirestore(user.uid, dup);
      setCloudEvents((prev) => [saved, ...prev]);
      setSelectedEventId(saved.id);
    } else {
      setDemoEvents((prev) => [dup, ...prev]);
      setSelectedEventId(dup.id);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (evt: PlanoraEvent) => {
    if (evt.isDemo) {
      const remaining = demoEvents.filter((e) => e.id !== evt.id);
      const nextList = remaining.length > 0 ? remaining : DEMO_EVENTS;
      setDemoEvents(nextList);
      if (selectedEventId === evt.id) {
        setSelectedEventId(nextList[0].id);
      }
    } else if (user) {
      await deleteEventFromFirestore(user.uid, evt);
      const remaining = cloudEvents.filter((e) => e.id !== evt.id);
      setCloudEvents(remaining);
      if (selectedEventId === evt.id) {
        setSelectedEventId(remaining[0]?.id || demoEvents[0].id);
      }
    }
  };

  // Recalculate task deadlines relative to new event date
  const handleRecalculateDeadlines = async (newDateStr: string) => {
    const oldMs = new Date(activeEvent.eventDate).getTime();
    const newMs = new Date(newDateStr).getTime();
    const diffDays =
      Number.isFinite(oldMs) && Number.isFinite(newMs)
        ? Math.round((newMs - oldMs) / 86400000)
        : 0;

    const updatedTasks = activeEvent.tasks.map((t) => {
      const tMs = new Date(t.dueDate).getTime();
      if (!Number.isFinite(tMs)) return { ...t, dueDate: newDateStr };
      const shifted = new Date(tMs + diffDays * 86400000)
        .toISOString()
        .slice(0, 10);
      // Prevent due date after eventDate
      const clamped = shifted > newDateStr ? newDateStr : shifted;
      return { ...t, dueDate: clamped };
    });

    await mutateActiveEvent(
      (curr) => ({
        ...curr,
        eventDate: newDateStr,
        tasks: updatedTasks,
      }),
      true
    );

    if (!activeEvent.isDemo && user) {
      for (const t of updatedTasks) {
        await saveTaskToFirestore(user.uid, activeEvent.id, t, true);
      }
    }
  };

  // AI Optimize Budget Action
  const handleRunBudgetOptimizer = async () => {
    setIsOptimizingBudget(true);
    setBudgetOptimizationPreview(null);
    try {
      const res = await fetch('/api/ai/optimize-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: activeEvent,
          targetReductionPercent: 12,
        }),
      });
      const data = await res.json();
      if (data.adjustments) {
        setBudgetOptimizationPreview({
          strategySummary: data.strategySummary,
          adjustments: data.adjustments,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsOptimizingBudget(false);
    }
  };

  const handleConfirmBudgetOptimization = async () => {
    if (!budgetOptimizationPreview) return;
    const map = new Map(
      budgetOptimizationPreview.adjustments.map((a) => [
        a.id,
        a.recommendedPlanned,
      ])
    );
    const nextItems = activeEvent.budgetItems.map((b) => {
      const rec = map.get(b.id);
      if (typeof rec === 'number' && rec >= 0) {
        return { ...b, plannedAmount: Math.round(rec) };
      }
      return b;
    });

    await mutateActiveEvent((curr) => ({
      ...curr,
      budgetItems: nextItems,
    }));

    if (!activeEvent.isDemo && user) {
      for (const item of nextItems) {
        await saveBudgetItemToFirestore(user.uid, activeEvent.id, item, true);
      }
    }
    setBudgetOptimizationPreview(null);
  };

  // Apply confirmed Copilot change
  const handleConfirmCopilotChange = async (
    _msgId: string,
    change: ProposedCopilotChange
  ) => {
    const now = Date.now();
    const p = change.payload || {};
    const owner = user ? user.uid : 'demo-user';

    if (change.type === 'update_budget_total' && p.newTotalBudget) {
      await mutateActiveEvent(
        (curr) => ({
          ...curr,
          totalBudget: Number(p.newTotalBudget),
        }),
        true
      );
    } else if (change.type === 'update_guest_count' && p.newGuestCount) {
      const ratio =
        Number(p.newGuestCount) / Math.max(1, activeEvent.guestCount);
      const nextBudgetItems = activeEvent.budgetItems.map((b) =>
        b.category.toLowerCase().includes('catering')
          ? { ...b, plannedAmount: Math.round(b.plannedAmount * ratio) }
          : b
      );
      await mutateActiveEvent(
        (curr) => ({
          ...curr,
          guestCount: Number(p.newGuestCount),
          budgetItems: nextBudgetItems,
        }),
        true
      );
    } else if (change.type === 'scale_budget_items') {
      const factor = Number(p.scaleFactor) || 0.85;
      const excl = String(p.excludeCategory || 'catering').toLowerCase();
      const nextBudgetItems = activeEvent.budgetItems.map((b) =>
        b.category.toLowerCase().includes(excl)
          ? b
          : { ...b, plannedAmount: Math.round(b.plannedAmount * factor) }
      );
      await mutateActiveEvent((curr) => ({
        ...curr,
        budgetItems: nextBudgetItems,
      }));
    } else if (change.type === 'add_budget_item') {
      const item: BudgetExpenseItem = {
        id: `b_cp_${now}`,
        eventId: activeEvent.id,
        ownerId: owner,
        category: p.category || 'Operations',
        title: p.title || change.summaryLabel,
        plannedAmount: Number(p.plannedAmount) || 5000,
        quotedAmount: 0,
        actualAmount: 0,
        lowEstimate: Math.round((Number(p.plannedAmount) || 5000) * 0.9),
        highEstimate: Math.round((Number(p.plannedAmount) || 5000) * 1.15),
        paymentStatus: 'Unpaid',
        notes: p.notes || 'Added via confirmed AI Copilot action',
      };
      await mutateActiveEvent((curr) => ({
        ...curr,
        budgetItems: [item, ...curr.budgetItems],
      }));
      if (!activeEvent.isDemo && user) {
        await saveBudgetItemToFirestore(user.uid, activeEvent.id, item, false);
      }
    } else if (change.type === 'add_task') {
      const t: PlanoraTask = {
        id: `t_cp_${now}`,
        eventId: activeEvent.id,
        ownerId: owner,
        title: p.title || change.summaryLabel,
        description: p.description || '',
        dueDate: p.dueDate || activeEvent.eventDate,
        priority: ['High', 'Medium', 'Low'].includes(p.priority)
          ? p.priority
          : 'High',
        category: p.category || 'General',
        status: 'Todo',
        dependsOnTaskId: '',
        assignee: 'Organizer',
      };
      await mutateActiveEvent((curr) => ({
        ...curr,
        tasks: [t, ...curr.tasks],
      }));
      if (!activeEvent.isDemo && user) {
        await saveTaskToFirestore(user.uid, activeEvent.id, t, false);
      }
    } else if (change.type === 'add_vendor') {
      const v: PlanoraVendor = {
        id: `v_cp_${now}`,
        eventId: activeEvent.id,
        ownerId: owner,
        category: p.category || 'Vendor',
        vendorName: p.vendorName || change.summaryLabel,
        contactInfo: 'Unverified AI Suggestion',
        estimatedPrice: Number(p.estimatedPrice) || 10000,
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: activeEvent.eventDate,
        notes: p.notes || '',
        isAiSuggestion: true,
      };
      await mutateActiveEvent((curr) => ({
        ...curr,
        vendors: [v, ...curr.vendors],
      }));
      if (!activeEvent.isDemo && user) {
        await saveVendorToFirestore(user.uid, activeEvent.id, v, false);
      }
    } else if (change.type === 'add_idea') {
      const idea: PlanoraIdea = {
        id: `i_cp_${now}`,
        eventId: activeEvent.id,
        ownerId: owner,
        category: 'Decor',
        title: p.title || change.summaryLabel,
        description: p.description || '',
        estimatedCostImpact: p.estimatedCostImpact || 'Within budget',
        executionTip: p.executionTip || '',
      };
      await mutateActiveEvent((curr) => ({
        ...curr,
        ideas: [idea, ...curr.ideas],
      }));
      if (!activeEvent.isDemo && user) {
        await saveIdeaToFirestore(user.uid, activeEvent.id, idea, false);
      }
    }
  };

  // CSV Exports (Actual Saved Data)
  const downloadTasksCSV = () => {
    const rows = [
      [
        'Task Title',
        'Category',
        'Priority',
        'Due Date',
        'Status',
        'Assignee',
        'Prerequisite Task ID',
        'Description',
      ],
      ...activeEvent.tasks.map((t) => [
        t.title,
        t.category,
        t.priority,
        t.dueDate,
        t.status,
        t.assignee,
        t.dependsOnTaskId,
        t.description,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBudgetAndVendorsCSV = () => {
    const rows = [
      [
        'Record Type',
        'Category',
        'Title / Vendor',
        'Planned / Estimate',
        'Quoted',
        'Actual Paid',
        'Status',
        'Notes',
      ],
      ...activeEvent.budgetItems.map((b) => [
        'Budget Expense',
        b.category,
        b.title,
        String(b.plannedAmount),
        String(b.quotedAmount),
        String(b.actualAmount),
        b.paymentStatus,
        b.notes,
      ]),
      ...activeEvent.vendors.map((v) => [
        'Vendor Quote',
        v.category,
        v.vendorName,
        String(v.estimatedPrice),
        String(v.quotedAmount),
        '0',
        v.bookingStatus,
        v.notes,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-budget-vendors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showLanding) {
    return (
      <>
        <LandingPage
          onEnterDemoWorkspace={(demoId) => {
            if (demoId) setSelectedEventId(demoId);
            setShowLanding(false);
            setActiveSection('overview');
          }}
          onStartWizard={() => {
            setShowLanding(false);
            setIsWizardOpen(true);
          }}
          onGoogleSignIn={handleGoogleSignIn}
          isSigningIn={isSigningIn}
        />
        <BlueprintGeneratorModal
          isOpen={isWizardOpen}
          ownerId={user ? user.uid : 'demo-user'}
          onClose={() => setIsWizardOpen(false)}
          onCreated={async (newPlan) => {
            if (user) {
              const saved = await saveFullEventToFirestore(user.uid, newPlan);
              setCloudEvents((prev) => [saved, ...prev]);
              setSelectedEventId(saved.id);
            } else {
              setDemoEvents((prev) => [{ ...newPlan, isDemo: true }, ...prev]);
              setSelectedEventId(newPlan.id);
            }
            setShowLanding(false);
            setActiveSection('overview');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            setShowLanding(true);
          }}
          className="text-lg font-bold tracking-tight text-[#1E1B4B] font-display whitespace-nowrap shrink-0"
        >
          Planora AI
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Workspace Sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {(
            [
              { id: 'dashboard', label: 'All Events' },
              { id: 'overview', label: 'Blueprint' },
              { id: 'budget', label: 'Budget' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'vendors', label: 'Vendors' },
              { id: 'simulator', label: 'Simulator' },
              { id: 'copilot', label: 'AI Copilot' },
              { id: 'export', label: 'Export & Share' },
            ] as Array<{ id: WorkspaceSection; label: string }>
          ).map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveSection(nav.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeSection === nav.id
                  ? 'border-[#1E1B4B] text-[#1E1B4B] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan My Event</span>
          </button>
        </div>
      </header>

      {/* Workspace Layout: Sidebar + Main Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            {/* Account / Demo Mode Switcher */}
            <div className="p-3.5 bg-[#FAF8F5] border border-slate-200 rounded-xl space-y-2">
              {user ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#1E1B4B] truncate">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-xs text-emerald-800">
                    Cloud Firestore Authenticated
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-900">
                    Interactive Demo Mode
                  </div>
                  <p className="text-xs text-slate-500">
                    Sign in with Google to persist private events in Cloud Firestore.
                  </p>
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={handleGoogleSignIn}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-lg"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>
                      {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Private User Events */}
            {user && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 font-display">
                    My Private Events
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {cloudEvents.length}
                  </span>
                </div>
                {isLoadingCloud ? (
                  <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading private events...</span>
                  </div>
                ) : cloudEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No private events yet. Click “Plan My Event” or save a demo below.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {cloudEvents.map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id);
                          if (activeSection === 'dashboard') {
                            setActiveSection('overview');
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                          activeEvent.id === evt.id
                            ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-semibold truncate">{evt.title}</div>
                        <div
                          className={`mt-0.5 font-mono tabular-nums ${
                            activeEvent.id === evt.id
                              ? 'text-slate-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {evt.eventType} · {evt.guestCount} guests ·{' '}
                          {formatCurrency(evt.totalBudget, evt.currency)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clearly Labeled Illustrative Demo Events */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 font-display">
                  Illustrative Demo Plans
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {demoEvents.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {demoEvents.map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      if (activeSection === 'dashboard') {
                        setActiveSection('overview');
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      activeEvent.id === evt.id
                        ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold truncate">{evt.title}</div>
                    <div
                      className={`mt-0.5 font-mono tabular-nums ${
                        activeEvent.id === evt.id
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      Demo · {evt.guestCount} guests ·{' '}
                      {formatCurrency(evt.totalBudget, evt.currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Section Switcher */}
            <div className="flex md:hidden items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(
                [
                  { id: 'dashboard', label: 'Events' },
                  { id: 'overview', label: 'Overview' },
                  { id: 'budget', label: 'Budget' },
                  { id: 'timeline', label: 'Tasks' },
                  { id: 'vendors', label: 'Vendors' },
                  { id: 'simulator', label: 'Simulator' },
                  { id: 'copilot', label: 'Copilot' },
                  { id: 'export', label: 'Export' },
                ] as Array<{ id: WorkspaceSection; label: string }>
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                    activeSection === s.id
                      ? 'bg-white text-[#1E1B4B] shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-500">
            <div>
              AI Engine:{' '}
              <span className="font-medium text-slate-800">
                {aiConfigured ? 'Live Gemini API' : 'Deterministic Demo Mode'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLanding(true)}
              className="text-[#1E1B4B] hover:underline font-medium"
            >
              ← Return to Public Landing Page
            </button>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-8">
          {copyBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              {copyBanner}
            </div>
          )}
          {cloudError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              {cloudError}
            </div>
          )}

          {/* Demo Banner when viewing an illustrative demo plan */}
          {activeEvent.isDemo && (
            <div className="no-print p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div>
                <strong>Illustrative Demo Plan:</strong> Sample prices, vendor names, and availability in this demo are illustrative estimates and isolated from private user records.
              </div>
              <button
                type="button"
                onClick={() => handleSaveDemoToCloud(activeEvent)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg whitespace-nowrap shrink-0"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Save Copy to My Cloud Account</span>
              </button>
            </div>
          )}

          {/* SECTION 0: ALL EVENTS PORTFOLIO DASHBOARD */}
          {activeSection === 'dashboard' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E1B4B] font-display">
                    Event Portfolio Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage upcoming events, planning progress, remaining budgets, and pending tasks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-lg self-start"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Event Plan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {allEvents.map((evt) => {
                  const planned = evt.budgetItems.reduce(
                    (s, b) => s + (Number(b.plannedAmount) || 0),
                    0
                  );
                  const contingency = Math.round(
                    evt.totalBudget * (evt.contingencyPercent / 100)
                  );
                  const rem = evt.totalBudget - planned - contingency;
                  const doneTasks = evt.tasks.filter(
                    (t) => t.status === 'Completed'
                  ).length;
                  const pct = Math.round(
                    (doneTasks / Math.max(1, evt.tasks.length)) * 100
                  );

                  return (
                    <div
                      key={evt.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono tabular-nums">
                          <span>{evt.eventType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{evt.eventDate}</span>
                          <span aria-hidden="true">·</span>
                          <span>{evt.status}</span>
                        </div>
                        <h2 className="text-base font-bold text-[#1E1B4B] font-display">
                          {evt.title}
                        </h2>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {evt.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-200 text-xs font-mono tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Budget</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(evt.totalBudget, evt.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Remaining Balance
                          </span>
                          <span
                            className={
                              rem >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }
                          >
                            {formatCurrency(rem, evt.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Task Progress</span>
                          <span>
                            {doneTasks}/{evt.tasks.length} ({pct}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            setActiveSection('overview');
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg"
                        >
                          Open Workspace
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateEvent(evt)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                            title="Duplicate Event"
                            aria-label="Duplicate Event"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(evt.id);
                              mutateActiveEvent(
                                (c) => ({
                                  ...c,
                                  status:
                                    c.status === 'archived'
                                      ? 'active'
                                      : 'archived',
                                }),
                                true
                              );
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                            title="Archive / Unarchive Event"
                            aria-label="Archive Event"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Delete Event"
                            aria-label="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Persistent Active Event Header + 4-Column KPI Strip (Shown on all active workspace tabs) */}
          {activeSection !== 'dashboard' && (
            <>
              <motion.section
                key={`header-${activeEvent.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#1E1B4B]">
                        {activeEvent.eventType}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeEvent.eventDate} (
                        {taskSummary.daysUntilEvent >= 0
                          ? `${taskSummary.daysUntilEvent} days away`
                          : 'Past date'}
                        )
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEvent.city}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEvent.venuePreference}</span>
                    </div>

                    <h1
                      className="text-2xl lg:text-3xl font-bold text-[#1E1B4B] font-display tracking-tight"
                      style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                      {activeEvent.title}
                    </h1>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeEvent.aiConceptSummary || activeEvent.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500">
                      <strong className="text-slate-800">Priorities:</strong>{' '}
                      {activeEvent.priorities} ·{' '}
                      <strong className="text-slate-800">Theme:</strong>{' '}
                      {activeEvent.themeStyle}
                    </div>
                    <div className="no-print flex flex-wrap items-center gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setTaskViewMode('graph');
                          setActiveSection('timeline');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-[#1E1B4B] bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Dependency Graph</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveSection('simulator')}
                        className="px-3 py-1.5 font-medium text-[#1E1B4B] bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        “What If?” Simulator
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveSection('export')}
                        className="px-3 py-1.5 font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-lg"
                      >
                        Export & Share
                      </motion.button>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.06 }}
                  className="lg:col-span-5 flex"
                >
                  <EventArtwork
                    category={activeEvent.eventType}
                    title={activeEvent.title}
                    location={activeEvent.city}
                    className="w-full min-h-[220px] lg:h-full rounded-xl border border-slate-200"
                  />
                </motion.div>
              </motion.section>

              {/* 4-Column Financial & Progress Strip */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 }}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 transition-shadow hover:shadow-xs"
                >
                  <div className="text-xs text-slate-500">
                    Total Event Budget ({activeEvent.currency})
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-[#1E1B4B] font-mono tabular-nums">
                      {formatCurrency(
                        activeEvent.totalBudget,
                        activeEvent.currency
                      )}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {formatCurrency(
                        activeEvent.totalBudget /
                          Math.max(1, activeEvent.guestCount),
                        activeEvent.currency
                      )}
                      /guest
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    {activeEvent.guestCount} guests · {activeEvent.contingencyPercent}% contingency
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.08 }}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 transition-shadow hover:shadow-xs"
                >
                  <div className="text-xs text-slate-500">
                    Planned Spend & Remaining Buffer
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(
                        budgetSummary.plannedTotal,
                        activeEvent.currency
                      )}
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        budgetSummary.remainingBudget >= 0
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      }`}
                    >
                      {budgetSummary.remainingBudget >= 0
                        ? `${formatCurrency(
                            budgetSummary.remainingBudget,
                            activeEvent.currency
                          )} left`
                        : `${formatCurrency(
                            Math.abs(budgetSummary.remainingBudget),
                            activeEvent.currency
                          )} over`}
                    </span>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, budgetSummary.utilizationPct)}%`,
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        budgetSummary.remainingBudget >= 0
                          ? 'bg-[#1E1B4B]'
                          : 'bg-red-600'
                      }`}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.12 }}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 transition-shadow hover:shadow-xs"
                >
                  <div className="text-xs text-slate-500">
                    Actual Paid vs. Pending
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-emerald-800 font-mono tabular-nums">
                      {formatCurrency(
                        budgetSummary.actualTotal,
                        activeEvent.currency
                      )}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      Quoted:{' '}
                      {formatCurrency(
                        budgetSummary.quotedTotal,
                        activeEvent.currency
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    Est. Range:{' '}
                    {formatCurrency(
                      budgetSummary.lowRangeTotal,
                      activeEvent.currency
                    )}{' '}
                    –{' '}
                    {formatCurrency(
                      budgetSummary.highRangeTotal,
                      activeEvent.currency
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.16 }}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    setTaskViewMode('graph');
                    setActiveSection('timeline');
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer transition-shadow hover:shadow-xs"
                >
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Timeline Tasks & Dependencies</span>
                    <Network className="w-3.5 h-3.5 text-[#1E1B4B]" />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                      {taskSummary.completed} / {taskSummary.total}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                      {taskSummary.progressPct}% done
                    </span>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${taskSummary.progressPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-[#059669] rounded-full"
                    />
                  </div>
                </motion.div>
              </section>
            </>
          )}

          {/* SECTION 1: OVERVIEW BLUEPRINT */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-6">
                <BudgetDonutChart
                  items={activeEvent.budgetItems}
                  totalBudget={activeEvent.totalBudget}
                  contingencyPercent={activeEvent.contingencyPercent}
                  currency={activeEvent.currency}
                />

                {/* Risks, Overlooked Costs & Contingency Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                    Potential Risks, Overlooked Costs & Contingency Plan
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {activeEvent.aiRisksAndContingencies}
                  </p>
                </div>

                {/* Creative Ideas Preview */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                        Personalized Decor, Food, Entertainment & Activity Ideas
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tailored to {activeEvent.city} and {activeEvent.foodPreference}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeEvent.ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="p-3.5 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-1.5"
                      >
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-[#059669]">
                            {idea.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {idea.estimatedCostImpact}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900">
                          {idea.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {idea.description}
                        </p>
                        <div className="text-xs text-slate-500 pt-1">
                          <strong>Tip:</strong> {idea.executionTip}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick-Add Idea Form */}
                  {!isReadOnly && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newIdea.title.trim()) return;
                        const item: PlanoraIdea = {
                          id: `i_man_${Date.now()}`,
                          eventId: activeEvent.id,
                          ownerId: user ? user.uid : 'demo-user',
                          category: newIdea.category,
                          title: newIdea.title.trim(),
                          description: newIdea.description.trim(),
                          estimatedCostImpact:
                            newIdea.estimatedCostImpact.trim() ||
                            'Included in budget',
                          executionTip: newIdea.executionTip.trim(),
                        };
                        await mutateActiveEvent((curr) => ({
                          ...curr,
                          ideas: [...curr.ideas, item],
                        }));
                        if (!activeEvent.isDemo && user) {
                          await saveIdeaToFirestore(
                            user.uid,
                            activeEvent.id,
                            item,
                            false
                          );
                        }
                        setNewIdea({
                          category: 'Decor',
                          title: '',
                          description: '',
                          estimatedCostImpact: '',
                          executionTip: '',
                        });
                      }}
                      className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2"
                    >
                      <select
                        value={newIdea.category}
                        onChange={(e) =>
                          setNewIdea((p) => ({
                            ...p,
                            category: e.target.value as PlanoraIdea['category'],
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        <option value="Decor">Decor</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Invitations">Invitations</option>
                        <option value="Activities">Activities</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newIdea.title}
                        onChange={(e) =>
                          setNewIdea((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder="Idea title..."
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="text"
                        value={newIdea.description}
                        onChange={(e) =>
                          setNewIdea((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description..."
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] rounded-md"
                      >
                        + Add Idea
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5">
                <AssistantCoPilot
                  event={activeEvent}
                  onSendMessage={async (uMsg, aMsg) => {
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      messages: [...curr.messages, uMsg, aMsg],
                    }));
                    if (!activeEvent.isDemo && user) {
                      await saveCopilotMessageToFirestore(
                        user.uid,
                        activeEvent.id,
                        uMsg
                      );
                      await saveCopilotMessageToFirestore(
                        user.uid,
                        activeEvent.id,
                        aMsg
                      );
                    }
                  }}
                  onConfirmProposedChange={handleConfirmCopilotChange}
                />
              </div>
            </div>
          )}

          {/* SECTION 2: INTELLIGENT BUDGET MANAGEMENT */}
          {activeSection === 'budget' && (
            <section className="space-y-6">
              {budgetSummary.isOverspent && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>Overspending Alert:</strong> Your planned expenses plus {activeEvent.contingencyPercent}% contingency reserve exceed your {formatCurrency(activeEvent.totalBudget, activeEvent.currency)} budget by{' '}
                      <strong>
                        {formatCurrency(
                          Math.abs(budgetSummary.remainingBudget),
                          activeEvent.currency
                        )}
                      </strong>
                      . Use “Optimize My Budget” to generate cost-saving adjustments.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isOptimizingBudget}
                    onClick={handleRunBudgetOptimizer}
                    className="px-3.5 py-1.5 font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    Optimize Now
                  </button>
                </div>
              )}

              <BudgetDonutChart
                items={activeEvent.budgetItems}
                totalBudget={activeEvent.totalBudget}
                contingencyPercent={activeEvent.contingencyPercent}
                currency={activeEvent.currency}
              />

              {/* AI Optimize My Budget Action & Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                      AI Budget Optimizer
                    </h2>
                    <p className="text-xs text-slate-500">
                      Preserves your stated priorities ({activeEvent.priorities}) while suggesting realistic category adjustments.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isOptimizingBudget}
                    onClick={handleRunBudgetOptimizer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg self-start"
                  >
                    {isOptimizingBudget ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>Optimize My Budget</span>
                  </button>
                </div>

                {budgetOptimizationPreview && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-3 text-xs">
                    <div className="font-semibold text-[#1E1B4B]">
                      Proposed Optimization Strategy (Preview):
                    </div>
                    <p className="text-slate-700">
                      {budgetOptimizationPreview.strategySummary}
                    </p>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3 text-right">Current</th>
                            <th className="py-2 px-3 text-right">
                              Recommended
                            </th>
                            <th className="py-2 px-3">Rationale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {budgetOptimizationPreview.adjustments.map((adj) => (
                            <tr key={adj.id}>
                              <td className="py-2 px-3 font-medium">
                                {adj.category} · {adj.title}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatCurrency(
                                  adj.currentPlanned,
                                  activeEvent.currency
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                                {formatCurrency(
                                  adj.recommendedPlanned,
                                  activeEvent.currency
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {adj.rationale}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setBudgetOptimizationPreview(null)}
                        className="px-3 py-1.5 text-slate-600 bg-white border border-slate-300 rounded-md"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBudgetOptimization}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Apply Optimizations</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                  {(['All', 'Paid', 'Pending', 'Unpaid'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBudgetFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                        budgetFilter === st
                          ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter expenses..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Editable Budget Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="py-3 px-4 font-medium">
                          Category & Expense Item
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Planned ({activeEvent.currency})
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Quoted ({activeEvent.currency})
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Actual Paid ({activeEvent.currency})
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Est. Low–High Range
                        </th>
                        <th className="py-3 px-4 font-medium">Payment</th>
                        <th className="py-3 px-4 font-medium text-right">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeEvent.budgetItems
                        .filter(
                          (b) =>
                            (budgetFilter === 'All' ||
                              b.paymentStatus === budgetFilter) &&
                            (!searchQuery.trim() ||
                              b.title
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              b.category
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()))
                        )
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {item.title}
                              </div>
                              <div className="text-slate-500">
                                {item.category}{' '}
                                {item.notes ? `· ${item.notes}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={item.plannedAmount}
                                onChange={async (e) => {
                                  const val = Number(e.target.value) || 0;
                                  const updated = {
                                    ...item,
                                    plannedAmount: val,
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    budgetItems: curr.budgetItems.map((x) =>
                                      x.id === item.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveBudgetItemToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={item.quotedAmount}
                                onChange={async (e) => {
                                  const val = Number(e.target.value) || 0;
                                  const updated = {
                                    ...item,
                                    quotedAmount: val,
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    budgetItems: curr.budgetItems.map((x) =>
                                      x.id === item.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveBudgetItemToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={item.actualAmount}
                                onChange={async (e) => {
                                  const val = Number(e.target.value) || 0;
                                  const updated = {
                                    ...item,
                                    actualAmount: val,
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    budgetItems: curr.budgetItems.map((x) =>
                                      x.id === item.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveBudgetItemToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                              {formatCurrency(
                                item.lowEstimate,
                                activeEvent.currency
                              )}{' '}
                              –{' '}
                              {formatCurrency(
                                item.highEstimate,
                                activeEvent.currency
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                disabled={isReadOnly}
                                value={item.paymentStatus}
                                onChange={async (e) => {
                                  const updated = {
                                    ...item,
                                    paymentStatus: e.target
                                      .value as BudgetExpenseItem['paymentStatus'],
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    budgetItems: curr.budgetItems.map((x) =>
                                      x.id === item.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveBudgetItemToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded"
                              >
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                                <option value="Unpaid">Unpaid</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={async () => {
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    budgetItems: curr.budgetItems.filter(
                                      (x) => x.id !== item.id
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await deleteSubcollectionDoc(
                                      activeEvent.id,
                                      'budgetItems',
                                      item.id
                                    );
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Expense Item */}
                {!isReadOnly && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newExpense.title.trim()) return;
                      const planned = Number(newExpense.plannedAmount) || 0;
                      const item: BudgetExpenseItem = {
                        id: `b_man_${Date.now()}`,
                        eventId: activeEvent.id,
                        ownerId: user ? user.uid : 'demo-user',
                        category: newExpense.category,
                        title: newExpense.title.trim(),
                        plannedAmount: planned,
                        quotedAmount:
                          Number(newExpense.quotedAmount) || planned,
                        actualAmount: Number(newExpense.actualAmount) || 0,
                        lowEstimate: Math.round(planned * 0.9),
                        highEstimate: Math.round(planned * 1.15),
                        paymentStatus: newExpense.paymentStatus,
                        notes: newExpense.notes.trim(),
                      };
                      await mutateActiveEvent((curr) => ({
                        ...curr,
                        budgetItems: [...curr.budgetItems, item],
                      }));
                      if (!activeEvent.isDemo && user) {
                        await saveBudgetItemToFirestore(
                          user.uid,
                          activeEvent.id,
                          item,
                          false
                        );
                      }
                      setNewExpense({
                        category: 'Catering',
                        title: '',
                        plannedAmount: '',
                        quotedAmount: '',
                        actualAmount: '',
                        paymentStatus: 'Unpaid',
                        notes: '',
                      });
                    }}
                    className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
                  >
                    <input
                      type="text"
                      value={newExpense.category}
                      onChange={(e) =>
                        setNewExpense((p) => ({
                          ...p,
                          category: e.target.value,
                        }))
                      }
                      placeholder="Category"
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      required
                      value={newExpense.title}
                      onChange={(e) =>
                        setNewExpense((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="New expense title..."
                      className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                    <input
                      type="number"
                      required
                      value={newExpense.plannedAmount}
                      onChange={(e) =>
                        setNewExpense((p) => ({
                          ...p,
                          plannedAmount: e.target.value,
                        }))
                      }
                      placeholder="Planned amount"
                      className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={newExpense.actualAmount}
                      onChange={(e) =>
                        setNewExpense((p) => ({
                          ...p,
                          actualAmount: e.target.value,
                        }))
                      }
                      placeholder="Paid amount"
                      className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] rounded-md"
                    >
                      + Add Expense
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* SECTION 3: DYNAMIC TIMELINE & TASK DEPENDENCY MANAGEMENT */}
          {activeSection === 'timeline' && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* View Switcher & Event Date Deadline Recalculator */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                    Preparation Schedule, Draggable Gantt &amp; Dependency Graph
                  </h2>
                  <p className="text-xs text-slate-500">
                    Drag task bars and resize handles on the Gantt timeline to adjust durations and dependencies, or inspect blockers in the Dependency Graph and Blocker Tree.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600">Event Date:</span>
                    <input
                      type="date"
                      value={activeEvent.eventDate}
                      onChange={(e) =>
                        handleRecalculateDeadlines(e.target.value)
                      }
                      className="px-2.5 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-lg gap-0.5">
                    {(
                      [
                        {
                          id: 'gantt',
                          label: 'Draggable Gantt',
                          icon: SlidersHorizontal,
                        },
                        {
                          id: 'graph',
                          label: 'Dependency Graph',
                          icon: Network,
                        },
                        {
                          id: 'tree',
                          label: 'Blocker Tree',
                          icon: GitBranch,
                        },
                        { id: 'list', label: 'List View', icon: ListIcon },
                        {
                          id: 'calendar',
                          label: 'Calendar',
                          icon: CalendarIcon,
                        },
                        {
                          id: 'timeline',
                          label: 'Milestones',
                          icon: Clock,
                        },
                      ] as const
                    ).map((vm) => {
                      const Icon = vm.icon;
                      return (
                        <button
                          key={vm.id}
                          type="button"
                          onClick={() => setTaskViewMode(vm.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            taskViewMode === vm.id
                              ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{vm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* VIEW 0: DRAGGABLE GANTT CHART */}
              {taskViewMode === 'gantt' && (
                <DraggableGanttChart
                  tasks={activeEvent.tasks}
                  eventDate={activeEvent.eventDate}
                  isReadOnly={isReadOnly}
                  onUpdateTask={async (updated) => {
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      tasks: curr.tasks.map((x) =>
                        x.id === updated.id ? updated : x
                      ),
                    }));
                    if (!activeEvent.isDemo && user) {
                      await saveTaskToFirestore(
                        user.uid,
                        activeEvent.id,
                        updated,
                        true
                      );
                    }
                  }}
                  onBatchUpdateTasks={async (updatedList) => {
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      tasks: updatedList,
                    }));
                    if (!activeEvent.isDemo && user) {
                      for (const t of updatedList) {
                        await saveTaskToFirestore(
                          user.uid,
                          activeEvent.id,
                          t,
                          true
                        );
                      }
                    }
                  }}
                />
              )}

              {/* VIEW 1 & 2: VISUAL DEPENDENCY GRAPH & HIERARCHICAL BLOCKER TREE */}
              {(taskViewMode === 'graph' || taskViewMode === 'tree') && (
                <TaskDependencyGraph
                  tasks={activeEvent.tasks}
                  eventDate={activeEvent.eventDate}
                  isReadOnly={isReadOnly}
                  initialSubMode={taskViewMode === 'tree' ? 'tree' : 'graph'}
                  onUpdateTask={async (updated) => {
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      tasks: curr.tasks.map((x) =>
                        x.id === updated.id ? updated : x
                      ),
                    }));
                    if (!activeEvent.isDemo && user) {
                      await saveTaskToFirestore(
                        user.uid,
                        activeEvent.id,
                        updated,
                        true
                      );
                    }
                  }}
                  onDeleteTask={async (taskId) => {
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      tasks: curr.tasks
                        .filter((x) => x.id !== taskId)
                        .map((x) =>
                          x.dependsOnTaskId === taskId
                            ? { ...x, dependsOnTaskId: '' }
                            : x
                        ),
                    }));
                    if (!activeEvent.isDemo && user) {
                      await deleteSubcollectionDoc(
                        activeEvent.id,
                        'tasks',
                        taskId
                      );
                    }
                  }}
                />
              )}

              {/* Status Filter for List / Calendar / Timeline */}
              {taskViewMode !== 'gantt' &&
                taskViewMode !== 'graph' &&
                taskViewMode !== 'tree' && (
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
                    {(['All', 'Todo', 'In Progress', 'Completed'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setTaskStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            taskStatusFilter === st
                              ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                )}

              {/* VIEW 3: LIST VIEW */}
              {taskViewMode === 'list' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="divide-y divide-slate-200">
                    {activeEvent.tasks
                      .filter(
                        (t) =>
                          taskStatusFilter === 'All' ||
                          t.status === taskStatusFilter
                      )
                      .map((task, idx) => {
                        const prereq = activeEvent.tasks.find(
                          (x) => x.id === task.dependsOnTaskId
                        );
                        const isBlocked =
                          prereq && prereq.status !== 'Completed';
                        const isOverdue =
                          task.status !== 'Completed' &&
                          task.dueDate < new Date().toISOString().slice(0, 10);

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono tabular-nums font-semibold text-slate-900">
                                  Due: {task.dueDate}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {task.durationDays || 7}d duration
                                </span>
                                {isOverdue && (
                                  <span className="text-red-600 font-semibold">
                                    · Overdue
                                  </span>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>{task.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>{task.priority} Priority</span>
                                {task.assignee && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Assigned: {task.assignee}</span>
                                  </>
                                )}
                              </div>

                              <div className="text-sm font-semibold text-slate-900">
                                {task.title}
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-600">
                                  {task.description}
                                </p>
                              )}
                              {prereq && (
                                <div
                                  className={`text-xs font-medium ${
                                    isBlocked
                                      ? 'text-amber-800'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {isBlocked ? 'Blocked by' : 'Unlocked by'}: “
                                  {prereq.title}” ({prereq.status})
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="date"
                                value={task.dueDate}
                                max={activeEvent.eventDate}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  if (val > activeEvent.eventDate) return;
                                  const updated = { ...task, dueDate: val };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    tasks: curr.tasks.map((x) =>
                                      x.id === task.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveTaskToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="px-2 py-1 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                              />
                              <select
                                value={task.status}
                                onChange={async (e) => {
                                  const updated = {
                                    ...task,
                                    status: e.target
                                      .value as PlanoraTask['status'],
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    tasks: curr.tasks.map((x) =>
                                      x.id === task.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveTaskToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
                              >
                                <option value="Todo">Todo</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                              <button
                                type="button"
                                onClick={async () => {
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    tasks: curr.tasks.filter(
                                      (x) => x.id !== task.id
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await deleteSubcollectionDoc(
                                      activeEvent.id,
                                      'tasks',
                                      task.id
                                    );
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600"
                                aria-label="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </motion.div>
              )}

              {/* VIEW 4: CALENDAR VIEW */}
              {taskViewMode === 'calendar' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
                    Monthly Preparation Calendar Schedule
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...activeEvent.tasks]
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map((task, idx) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.22, delay: idx * 0.03 }}
                          whileHover={{ y: -2 }}
                          className="p-3.5 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="font-bold text-[#1E1B4B]">
                              {task.dueDate} ({task.durationDays || 7}d)
                            </span>
                            <span className="text-slate-500">
                              {task.status}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900">
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {task.category} · {task.assignee || 'Unassigned'}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}

              {/* VIEW 5: CHRONOLOGICAL TIMELINE VIEW */}
              {taskViewMode === 'timeline' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
                >
                  <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
                    Chronological Dependency &amp; Milestone Timeline
                  </h3>
                  <div className="space-y-4">
                    {[...activeEvent.tasks]
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map((task, idx) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22, delay: idx * 0.04 }}
                          className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="w-32 shrink-0 font-mono tabular-nums text-xs font-bold text-[#1E1B4B]">
                            0{idx + 1} · {task.dueDate}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="text-sm font-semibold text-slate-900">
                              {task.title}
                            </div>
                            <p className="text-xs text-slate-600">
                              {task.description}
                            </p>
                            <div className="text-xs text-slate-500">
                              Duration: {task.durationDays || 7} days · Owner:{' '}
                              {task.assignee} · Status: {task.status}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}

              {/* Persistent Quick-Add Task & Dependency Creator */}
              {!isReadOnly && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTask.title.trim()) return;
                    const clampedDate =
                      newTask.dueDate > activeEvent.eventDate
                        ? activeEvent.eventDate
                        : newTask.dueDate;
                    const durDays = Math.max(
                      1,
                      Math.min(180, Number(newTask.durationDays) || 7)
                    );
                    const created: PlanoraTask = {
                      id: `t_man_${Date.now()}`,
                      eventId: activeEvent.id,
                      ownerId: user ? user.uid : 'demo-user',
                      title: newTask.title.trim(),
                      description: newTask.description.trim(),
                      dueDate: clampedDate,
                      durationDays: durDays,
                      priority: newTask.priority,
                      category: newTask.category,
                      status: 'Todo',
                      dependsOnTaskId: newTask.dependsOnTaskId,
                      assignee: newTask.assignee.trim() || 'Organizer',
                    };
                    await mutateActiveEvent((curr) => ({
                      ...curr,
                      tasks: [...curr.tasks, created],
                    }));
                    if (!activeEvent.isDemo && user) {
                      await saveTaskToFirestore(
                        user.uid,
                        activeEvent.id,
                        created,
                        false
                      );
                    }
                    setNewTask({
                      title: '',
                      description: '',
                      dueDate: activeEvent.eventDate,
                      durationDays: '7',
                      priority: 'High',
                      category: 'Venue',
                      dependsOnTaskId: '',
                      assignee: '',
                    });
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-7 gap-2.5 items-center"
                >
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Add new task milestone..."
                    className="sm:col-span-2 px-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
                  />
                  <input
                    type="date"
                    max={activeEvent.eventDate}
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask((p) => ({ ...p, dueDate: e.target.value }))
                    }
                    title="Task Due Date"
                    className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#FAF8F5] border border-slate-300 rounded-md"
                  />
                  <div className="flex items-center gap-1 bg-[#FAF8F5] border border-slate-300 rounded-md px-2 py-1">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={newTask.durationDays}
                      onChange={(e) =>
                        setNewTask((p) => ({
                          ...p,
                          durationDays: e.target.value,
                        }))
                      }
                      title="Task Duration in Days"
                      className="w-full text-xs font-mono tabular-nums bg-transparent focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 shrink-0">
                      days
                    </span>
                  </div>
                  <select
                    value={newTask.dependsOnTaskId}
                    onChange={(e) =>
                      setNewTask((p) => ({
                        ...p,
                        dependsOnTaskId: e.target.value,
                      }))
                    }
                    className="px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
                  >
                    <option value="">No Prerequisite (Root)</option>
                    {activeEvent.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        Blocked by: {t.title.slice(0, 26)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newTask.assignee}
                    onChange={(e) =>
                      setNewTask((p) => ({
                        ...p,
                        assignee: e.target.value,
                      }))
                    }
                    placeholder="Assignee"
                    className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-md"
                  >
                    + Add Task Bar
                  </motion.button>
                </form>
              )}
            </motion.section>
          )}

          {/* SECTION 4: VENDOR & QUOTATION MANAGEMENT */}
          {activeSection === 'vendors' && (
            <section className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                    Vendor Directory, Quotation Comparison & Inquiry Checklist
                  </h2>
                  <p className="text-xs text-slate-500">
                    AI suggestions are clearly labeled as unverified search strategies—never fabricated reviews or fake bookings.
                  </p>
                </div>

                <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'list', label: 'Vendor Tracker' },
                      { id: 'compare', label: 'Compare Quotes' },
                      { id: 'checklist', label: 'Questions to Ask' },
                    ] as const
                  ).map((vm) => (
                    <button
                      key={vm.id}
                      type="button"
                      onClick={() => setVendorViewMode(vm.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                        vendorViewMode === vm.id
                          ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {vm.label}
                    </button>
                  ))}
                </div>
              </div>

              {vendorViewMode === 'list' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <th className="py-3 px-4 font-medium">
                            Category & Vendor / Strategy
                          </th>
                          <th className="py-3 px-4 font-medium">Contact</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Est. Price
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Quoted Amount
                          </th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeEvent.vendors.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {v.vendorName}
                              </div>
                              <div className="text-slate-500">
                                {v.category} ·{' '}
                                {v.isAiSuggestion
                                  ? 'Unverified AI Archetype Suggestion'
                                  : 'User Quotation Entry'}{' '}
                                {v.notes ? `· ${v.notes}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {v.contactInfo}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {formatCurrency(
                                v.estimatedPrice,
                                activeEvent.currency
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                value={v.quotedAmount}
                                onChange={async (e) => {
                                  const updated = {
                                    ...v,
                                    quotedAmount: Number(e.target.value) || 0,
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    vendors: curr.vendors.map((x) =>
                                      x.id === v.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveVendorToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={v.bookingStatus}
                                onChange={async (e) => {
                                  const updated = {
                                    ...v,
                                    bookingStatus: e.target
                                      .value as PlanoraVendor['bookingStatus'],
                                  };
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    vendors: curr.vendors.map((x) =>
                                      x.id === v.id ? updated : x
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await saveVendorToFirestore(
                                      user.uid,
                                      activeEvent.id,
                                      updated,
                                      true
                                    );
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded"
                              >
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Inquiry Sent">
                                  Inquiry Sent
                                </option>
                                <option value="Quoted">Quoted</option>
                                <option value="Booked">Booked</option>
                                <option value="Declined">Declined</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  await mutateActiveEvent((curr) => ({
                                    ...curr,
                                    vendors: curr.vendors.filter(
                                      (x) => x.id !== v.id
                                    ),
                                  }));
                                  if (!activeEvent.isDemo && user) {
                                    await deleteSubcollectionDoc(
                                      activeEvent.id,
                                      'vendors',
                                      v.id
                                    );
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600"
                                aria-label="Delete vendor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick-Add Vendor Form */}
                  {!isReadOnly && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newVendor.vendorName.trim()) return;
                        const created: PlanoraVendor = {
                          id: `v_man_${Date.now()}`,
                          eventId: activeEvent.id,
                          ownerId: user ? user.uid : 'demo-user',
                          category: newVendor.category,
                          vendorName: newVendor.vendorName.trim(),
                          contactInfo:
                            newVendor.contactInfo.trim() || 'Direct Contact',
                          estimatedPrice:
                            Number(newVendor.estimatedPrice) || 0,
                          quotedAmount: Number(newVendor.quotedAmount) || 0,
                          bookingStatus: newVendor.bookingStatus,
                          followUpDate: newVendor.followUpDate,
                          notes: newVendor.notes.trim(),
                          isAiSuggestion: false,
                        };
                        await mutateActiveEvent((curr) => ({
                          ...curr,
                          vendors: [...curr.vendors, created],
                        }));
                        if (!activeEvent.isDemo && user) {
                          await saveVendorToFirestore(
                            user.uid,
                            activeEvent.id,
                            created,
                            false
                          );
                        }
                        setNewVendor({
                          category: 'Catering',
                          vendorName: '',
                          contactInfo: '',
                          estimatedPrice: '',
                          quotedAmount: '',
                          bookingStatus: 'Quoted',
                          followUpDate: activeEvent.eventDate,
                          notes: '',
                        });
                      }}
                      className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
                    >
                      <select
                        value={newVendor.category}
                        onChange={(e) =>
                          setNewVendor((p) => ({
                            ...p,
                            category: e.target.value,
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        <option value="Venue">Venue</option>
                        <option value="Catering">Catering</option>
                        <option value="Decoration">Decoration</option>
                        <option value="Photography">Photography</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Invitations">Invitations</option>
                        <option value="Transport">Transport</option>
                        <option value="Equipment & Rentals">
                          Equipment & Rentals
                        </option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newVendor.vendorName}
                        onChange={(e) =>
                          setNewVendor((p) => ({
                            ...p,
                            vendorName: e.target.value,
                          }))
                        }
                        placeholder="Vendor name or quote option..."
                        className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="number"
                        value={newVendor.estimatedPrice}
                        onChange={(e) =>
                          setNewVendor((p) => ({
                            ...p,
                            estimatedPrice: e.target.value,
                          }))
                        }
                        placeholder="Budget est."
                        className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="number"
                        value={newVendor.quotedAmount}
                        onChange={(e) =>
                          setNewVendor((p) => ({
                            ...p,
                            quotedAmount: e.target.value,
                          }))
                        }
                        placeholder="Quoted amount"
                        className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] rounded-md"
                      >
                        + Add Quote
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* VIEW 2: QUOTATION COMPARISON MATRIX */}
              {vendorViewMode === 'compare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEvent.vendors.map((v) => {
                    const diff = v.quotedAmount - v.estimatedPrice;
                    return (
                      <div
                        key={v.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-[#1E1B4B]">
                            {v.category}
                          </span>
                          <span>{v.bookingStatus}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {v.vendorName}
                        </h3>
                        <div className="grid grid-cols-3 gap-2 pt-2 font-mono tabular-nums">
                          <div>
                            <div className="text-slate-500">Target Est.</div>
                            <div className="font-semibold">
                              {formatCurrency(
                                v.estimatedPrice,
                                activeEvent.currency
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">Quoted</div>
                            <div className="font-semibold">
                              {formatCurrency(
                                v.quotedAmount,
                                activeEvent.currency
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500">Variance</div>
                            <div
                              className={
                                diff <= 0
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-amber-700 font-semibold'
                              }
                            >
                              {diff <= 0
                                ? `Saves ${formatCurrency(
                                    Math.abs(diff),
                                    activeEvent.currency
                                  )}`
                                : `+${formatCurrency(
                                    diff,
                                    activeEvent.currency
                                  )} over est.`}
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-600 pt-1">{v.notes}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: VENDOR INQUIRY CHECKLIST */}
              {vendorViewMode === 'checklist' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(VENDOR_INQUIRY_QUESTIONS).map(
                    ([cat, questions]) => (
                      <div
                        key={cat}
                        className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
                      >
                        <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
                          {cat} — Contract & Vetting Questions
                        </h3>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5">
                          {questions.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {/* SECTION 5: SCENARIO SIMULATOR */}
          {activeSection === 'simulator' && (
            <ScenarioSimulator
              event={activeEvent}
              onApplyScenario={async (updatedEvent) => {
                await mutateActiveEvent(() => updatedEvent, true);
                if (!activeEvent.isDemo && user) {
                  for (const b of updatedEvent.budgetItems) {
                    await saveBudgetItemToFirestore(
                      user.uid,
                      activeEvent.id,
                      b,
                      true
                    );
                  }
                  for (const t of updatedEvent.tasks) {
                    await saveTaskToFirestore(
                      user.uid,
                      activeEvent.id,
                      t,
                      true
                    );
                  }
                }
              }}
            />
          )}

          {/* SECTION 6: FULL-SCREEN AI COPILOT */}
          {activeSection === 'copilot' && (
            <AssistantCoPilot
              event={activeEvent}
              onSendMessage={async (uMsg, aMsg) => {
                await mutateActiveEvent((curr) => ({
                  ...curr,
                  messages: [...curr.messages, uMsg, aMsg],
                }));
                if (!activeEvent.isDemo && user) {
                  await saveCopilotMessageToFirestore(
                    user.uid,
                    activeEvent.id,
                    uMsg
                  );
                  await saveCopilotMessageToFirestore(
                    user.uid,
                    activeEvent.id,
                    aMsg
                  );
                }
              }}
              onConfirmProposedChange={handleConfirmCopilotChange}
            />
          )}

          {/* SECTION 7: EXPORT, COMMITTEE PRESENTATION & SHARING */}
          {activeSection === 'export' && (
            <section className="space-y-6">
              <div className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B] font-display">
                    Export, Print PDF & Shareable Read-Only Access
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All exports contain your actual saved event numbers, tasks, and vendor quotations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save Event Summary as PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadTasksCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Task Checklist (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadBudgetAndVendorsCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Budget & Vendor Ledger (CSV)</span>
                  </button>
                </div>

                {/* Shareable Read-Only Link Access Control */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5 text-[#059669]" />
                      <span>
                        Shareable Read-Only Event Link (Status:{' '}
                        {activeEvent.isShared
                          ? 'Active & Accessible'
                          : 'Private / Revoked'}
                        )
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Enable read-only sharing to present this plan to family members or organizing committees. Revoke anytime.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const nextShared = !activeEvent.isShared;
                        await mutateActiveEvent(
                          (curr) => ({
                            ...curr,
                            isShared: nextShared,
                          }),
                          true
                        );
                        setCopyBanner(
                          nextShared
                            ? 'Read-only sharing enabled for this event.'
                            : 'Read-only sharing link revoked.'
                        );
                      }}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg ${
                        activeEvent.isShared
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-[#059669] text-white'
                      }`}
                    >
                      {activeEvent.isShared
                        ? 'Revoke Share Access'
                        : 'Enable Shareable Link'}
                    </button>

                    {activeEvent.isShared && (
                      <button
                        type="button"
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/?share=${activeEvent.id}&token=${activeEvent.shareToken}`;
                          navigator.clipboard?.writeText(shareUrl);
                          setCopyBanner(`Copied share link: ${shareUrl}`);
                        }}
                        className="px-3.5 py-1.5 text-xs font-medium text-[#1E1B4B] bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        Copy Link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clean Printable Family / Committee Executive Summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
                <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#059669]">
                      PLANORA AI — EXECUTIVE EVENT SUMMARY DOSSIER
                    </div>
                    <h2 className="text-xl font-bold text-[#1E1B4B] font-display mt-1">
                      {activeEvent.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeEvent.eventType} · {activeEvent.eventDate} ·{' '}
                      {activeEvent.city} · {activeEvent.guestCount} Guests
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums text-xs">
                    <div>
                      Total Budget:{' '}
                      <strong>
                        {formatCurrency(
                          activeEvent.totalBudget,
                          activeEvent.currency
                        )}
                      </strong>
                    </div>
                    <div>
                      Planned Spend:{' '}
                      <strong>
                        {formatCurrency(
                          budgetSummary.plannedTotal,
                          activeEvent.currency
                        )}
                      </strong>
                    </div>
                    <div>
                      Remaining Buffer:{' '}
                      <strong>
                        {formatCurrency(
                          budgetSummary.remainingBudget,
                          activeEvent.currency
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    1. Concept & Hospitality Direction
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeEvent.aiConceptSummary}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    2. Budget Allocation Summary
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5">Line Item</th>
                        <th className="py-1.5 text-right">Planned</th>
                        <th className="py-1.5 text-right">Actual Paid</th>
                        <th className="py-1.5 pl-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeEvent.budgetItems.map((b) => (
                        <tr key={b.id}>
                          <td className="py-1.5 font-medium">{b.category}</td>
                          <td className="py-1.5">{b.title}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">
                            {formatCurrency(
                              b.plannedAmount,
                              activeEvent.currency
                            )}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums">
                            {formatCurrency(
                              b.actualAmount,
                              activeEvent.currency
                            )}
                          </td>
                          <td className="py-1.5 pl-4">{b.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    3. Preparation Schedule & Milestones
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1.5">Due Date</th>
                        <th className="py-1.5">Task</th>
                        <th className="py-1.5">Assignee</th>
                        <th className="py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeEvent.tasks.map((t) => (
                        <tr key={t.id}>
                          <td className="py-1.5 font-mono tabular-nums">
                            {t.dueDate}
                          </td>
                          <td className="py-1.5 font-medium">{t.title}</td>
                          <td className="py-1.5">{t.assignee}</td>
                          <td className="py-1.5">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* 5-Step Event Creation Wizard Modal */}
      <BlueprintGeneratorModal
        isOpen={isWizardOpen}
        ownerId={user ? user.uid : 'demo-user'}
        onClose={() => setIsWizardOpen(false)}
        onCreated={async (newPlan) => {
          if (user) {
            const saved = await saveFullEventToFirestore(user.uid, newPlan);
            setCloudEvents((prev) => [saved, ...prev]);
            setSelectedEventId(saved.id);
          } else {
            setDemoEvents((prev) => [{ ...newPlan, isDemo: true }, ...prev]);
            setSelectedEventId(newPlan.id);
          }
          setActiveSection('overview');
        }}
      />
    </div>
  );
}
