import React, { useState, useMemo, useCallback, useEffect, useDeferredValue, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { Loader2 } from 'lucide-react';
import {
  BudgetItem,
  TimelineTask,
  VendorItem,
  CreativeIdea,
  SavedScenario,
  BookingStatus,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
  ProposedCopilotChange,
} from './types/event';
import { calculateBudgetMetrics, formatCurrency } from './utils/budgetCalculations';
import { formatPlanSummaryText } from './utils/csvExport';
import { analyzeTaskSchedule, wouldCreateDependencyCycle } from './utils/taskScheduler';
import { LandingPage } from './components/LandingPage';
import { BlueprintGeneratorModal } from './components/BlueprintGeneratorModal';
import { AssistantCoPilot } from './components/AssistantCoPilot';
import { AppHeader, ActiveSection } from './components/layout/AppHeader';
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { WorkspaceSummaryHeader } from './components/layout/WorkspaceSummaryHeader';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useEvents } from './hooks/useEvents';
import { useBudgetOptimizer } from './hooks/useBudgetOptimizer';

const PortfolioSection = React.lazy(() =>
  import('./components/sections/PortfolioSection').then((m) => ({ default: m.PortfolioSection }))
);
const OverviewSection = React.lazy(() =>
  import('./components/sections/OverviewSection').then((m) => ({ default: m.OverviewSection }))
);
const BudgetSection = React.lazy(() =>
  import('./components/sections/BudgetSection').then((m) => ({ default: m.BudgetSection }))
);
const TimelineSection = React.lazy(() =>
  import('./components/sections/TimelineSection').then((m) => ({ default: m.TimelineSection }))
);
const VendorsSection = React.lazy(() =>
  import('./components/sections/VendorsSection').then((m) => ({ default: m.VendorsSection }))
);
const ScenarioSimulator = React.lazy(() =>
  import('./components/ScenarioSimulator').then((m) => ({ default: m.ScenarioSimulator }))
);
const ExportSection = React.lazy(() =>
  import('./components/sections/ExportSection').then((m) => ({ default: m.ExportSection }))
);

const SECTION_TITLES: Record<ActiveSection, string> = {
  portfolio: 'Event Portfolio — Planora AI',
  overview: 'Executive Overview — Planora AI',
  budget: 'Budget Optimizer — Planora AI',
  timeline: 'Timeline & Dependencies — Planora AI',
  vendors: 'Vendors & Creative Ideas — Planora AI',
  scenarios: 'What-If Scenario Simulator — Planora AI',
  export: 'Export & Share — Planora AI',
};

export function App() {
  const { toastNotice, notify, dismissToast } = useToast();
  const { currentUser, isAuthReady, handleSignIn, handleSignOut } = useAuth(notify);
  const {
    events,
    activeEvent,
    setActiveEventId,
    isSyncingCloud,
    updateActiveEvent,
    createNewEvent,
    duplicateEvent,
    deleteEventById,
    resetDemoData,
  } = useEvents(currentUser, isAuthReady, notify);

  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [timelineView, setTimelineView] = useState<
    'gantt' | 'dependencies' | 'list' | 'calendar' | 'milestones'
  >('gantt');
  const [copiedBrief, setCopiedBrief] = useState(false);

  const [newItem, setNewItem] = useState({
    category: 'Venue & Rentals',
    title: '',
    plannedAmount: 1500,
    quotedAmount: 0,
    actualAmount: 0,
    paymentStatus: 'Unpaid' as PaymentStatus,
    notes: '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: activeEvent.date,
    durationDays: 5,
    priority: 'Medium' as TaskPriority,
    category: 'Logistics',
    assignee: 'Lead Planner',
    dependsOnTaskId: '',
  });

  const [newVendor, setNewVendor] = useState({
    category: 'Catering & Bar',
    vendorName: '',
    contactInfo: '',
    estimatedPrice: 4000,
    quotedAmount: 0,
    bookingStatus: 'Shortlisted' as BookingStatus,
    followUpDate: activeEvent.date,
    notes: '',
  });

  const [newIdea, setNewIdea] = useState({
    category: 'Experience',
    title: '',
    description: '',
    estimatedCostImpact: '+$500',
    executionTip: '',
  });

  const metrics = useMemo(() => calculateBudgetMetrics(activeEvent), [activeEvent]);
  const taskDiagnostics = useMemo(() => analyzeTaskSchedule(activeEvent.tasks), [activeEvent.tasks]);

  const {
    lockedCategories,
    isOptimizingBudget,
    optimizerProposal,
    toggleLockedCategory,
    handleInstantRebalanceBudget,
    handleAiOptimizeBudget,
    applyOptimizerProposal,
    dismissOptimizerProposal,
  } = useBudgetOptimizer(activeEvent, metrics, updateActiveEvent, notify);

  // Update document.title and move focus to section <h1> on navigation
  useEffect(() => {
    document.title =
      viewMode === 'landing'
        ? 'Planora AI — Intelligent Event Planning & Budget Optimizer'
        : SECTION_TITLES[activeSection];

    const heading = document.getElementById('section-main-heading');
    if (heading) {
      heading.focus({ preventScroll: true });
    }
  }, [viewMode, activeSection]);

  const handleNavigateSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
  }, []);

  const handleUpdateEventMeta = useCallback(
    (updates: Partial<typeof activeEvent>) => {
      updateActiveEvent((prev) => ({ ...prev, ...updates }));
    },
    [updateActiveEvent]
  );

  const handleAddBudgetItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItem.title.trim()) return;
      const planned = Math.max(0, Number(newItem.plannedAmount) || 0);
      const item: BudgetItem = {
        id: `b_${Date.now()}`,
        category: newItem.category.trim() || 'General',
        title: newItem.title.trim(),
        plannedAmount: planned,
        quotedAmount: Math.max(0, Number(newItem.quotedAmount) || 0),
        actualAmount: Math.max(0, Number(newItem.actualAmount) || 0),
        lowEstimate: Math.round(planned * 0.85),
        highEstimate: Math.round(planned * 1.15),
        paymentStatus: newItem.paymentStatus,
        notes: newItem.notes.trim(),
      };
      updateActiveEvent((prev) => ({ ...prev, budgetItems: [...prev.budgetItems, item] }));
      setNewItem((prev) => ({ ...prev, title: '', notes: '' }));
      notify(`Added budget line item "${item.title}"`);
    },
    [newItem, updateActiveEvent, notify]
  );

  const handleUpdateBudgetItemField = useCallback(
    (itemId: string, field: keyof BudgetItem, value: string | number) => {
      updateActiveEvent((prev) => ({
        ...prev,
        budgetItems: prev.budgetItems.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      }));
    },
    [updateActiveEvent]
  );

  const handleDeleteBudgetItem = useCallback(
    (itemId: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        budgetItems: prev.budgetItems.filter((item) => item.id !== itemId),
      }));
    },
    [updateActiveEvent]
  );

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title.trim()) return;
      const task: TimelineTask = {
        id: `t_${Date.now()}`,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        dueDate: newTask.dueDate || activeEvent.date,
        durationDays: Math.max(1, Math.min(90, Math.round(Number(newTask.durationDays) || 5))),
        priority: newTask.priority,
        category: newTask.category.trim() || 'Operations',
        status: 'Todo',
        assignee: newTask.assignee.trim() || 'Lead Planner',
        ...(newTask.dependsOnTaskId ? { dependsOnTaskId: newTask.dependsOnTaskId } : {}),
      };
      updateActiveEvent((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
      setNewTask((prev) => ({ ...prev, title: '', description: '', dependsOnTaskId: '' }));
      notify(`Added milestone task "${task.title}"`);
    },
    [newTask, activeEvent.date, updateActiveEvent, notify]
  );

  const handleToggleTaskStatus = useCallback(
    (taskId: string) => {
      const nextStatusMap: Record<TaskStatus, TaskStatus> = {
        Todo: 'In Progress',
        'In Progress': 'Done',
        Done: 'Todo',
        Completed: 'Todo',
      };
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: nextStatusMap[t.status] } : t
        ),
      }));
    },
    [updateActiveEvent]
  );

  const handleSetTaskDependency = useCallback(
    (taskId: string, dependsOnTaskId: string | undefined) => {
      updateActiveEvent((prev) => {
        if (dependsOnTaskId && wouldCreateDependencyCycle(prev.tasks, taskId, dependsOnTaskId)) {
          notify('Circular dependency prevented: a task cannot depend on its own downstream task.', 'warning');
          return prev;
        }
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, dependsOnTaskId } : t)),
        };
      });
    },
    [updateActiveEvent, notify]
  );

  const handleBulkUpdateTasks = useCallback(
    (updatedTasks: TimelineTask[]) => {
      updateActiveEvent((prev) => ({ ...prev, tasks: updatedTasks }));
      notify('Updated task dependency schedule.');
    },
    [updateActiveEvent, notify]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      updateActiveEvent((prev) => ({
        ...prev,
        tasks: prev.tasks
          .filter((t) => t.id !== taskId)
          .map((t) => (t.dependsOnTaskId === taskId ? { ...t, dependsOnTaskId: undefined } : t)),
      }));
    },
    [updateActiveEvent]
  );

  const handleAddVendor = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newVendor.vendorName.trim()) return;
      const vendor: VendorItem = {
        id: `v_${Date.now()}`,
        category: newVendor.category.trim() || 'General',
        vendorName: newVendor.vendorName.trim(),
        contactInfo: newVendor.contactInfo.trim() || 'inquiries@vendor.com',
        estimatedPrice: Math.max(0, Number(newVendor.estimatedPrice) || 0),
        quotedAmount: Math.max(0, Number(newVendor.quotedAmount) || 0),
        bookingStatus: newVendor.bookingStatus,
        followUpDate: newVendor.followUpDate || activeEvent.date,
        notes: newVendor.notes.trim(),
      };
      updateActiveEvent((prev) => ({ ...prev, vendors: [...prev.vendors, vendor] }));
      setNewVendor((prev) => ({ ...prev, vendorName: '', contactInfo: '', notes: '' }));
      notify(`Added vendor "${vendor.vendorName}"`);
    },
    [newVendor, activeEvent.date, updateActiveEvent, notify]
  );

  const handleApplyCopilotChange = useCallback(
    (change: ProposedCopilotChange) => {
      const p = change.payload || {};
      updateActiveEvent((prev) => {
        if (change.type === 'update_budget_total' && p.newTotalBudget) {
          return { ...prev, totalBudget: Math.max(500, Math.round(Number(p.newTotalBudget))) };
        }
        if (change.type === 'update_guest_count' && p.newGuestCount) {
          const nextGuests = Math.max(10, Math.round(Number(p.newGuestCount)));
          const ratio = p.scaleCateringFactor || nextGuests / Math.max(1, prev.guestCount);
          return {
            ...prev,
            guestCount: nextGuests,
            budgetItems: prev.budgetItems.map((b) =>
              b.category.toLowerCase().includes('catering')
                ? { ...b, plannedAmount: Math.round((b.plannedAmount * ratio) / 10) * 10 }
                : b
            ),
          };
        }
        if (change.type === 'scale_budget_items' && p.scaleFactor) {
          const factor = Number(p.scaleFactor) || 0.9;
          const exclude = String(p.excludeCategory || '').toLowerCase();
          return {
            ...prev,
            budgetItems: prev.budgetItems.map((b) =>
              exclude && b.category.toLowerCase().includes(exclude)
                ? b
                : { ...b, plannedAmount: Math.max(50, Math.round((b.plannedAmount * factor) / 10) * 10) }
            ),
          };
        }
        if (change.type === 'add_budget_item') {
          const amt = Math.max(0, Number(p.plannedAmount) || 1500);
          return {
            ...prev,
            budgetItems: [
              ...prev.budgetItems,
              {
                id: `b_ai_${Date.now()}`,
                category: p.category || 'Additional',
                title: p.title || change.summaryLabel,
                plannedAmount: amt,
                quotedAmount: 0,
                actualAmount: 0,
                lowEstimate: Math.round(amt * 0.85),
                highEstimate: Math.round(amt * 1.15),
                paymentStatus: 'Unpaid',
                notes: p.notes || 'Added via Planora AI Co-Pilot',
              },
            ],
          };
        }
        if (change.type === 'add_task') {
          return {
            ...prev,
            tasks: [
              ...prev.tasks,
              {
                id: `t_ai_${Date.now()}`,
                title: p.title || change.summaryLabel,
                description: p.description || 'Added via AI Co-Pilot',
                dueDate: p.dueDate || prev.date,
                priority: p.priority || 'High',
                category: p.category || 'Operations',
                status: 'Todo',
                assignee: 'Lead Planner',
              },
            ],
          };
        }
        if (change.type === 'add_vendor') {
          return {
            ...prev,
            vendors: [
              ...prev.vendors,
              {
                id: `v_ai_${Date.now()}`,
                category: p.category || 'Specialty',
                vendorName: p.vendorName || change.summaryLabel,
                contactInfo: 'inquiries@partner.example.com',
                estimatedPrice: Number(p.estimatedPrice) || 2000,
                quotedAmount: 0,
                bookingStatus: 'Shortlisted',
                followUpDate: prev.date,
                notes: p.notes || 'Suggested by AI Co-Pilot',
              },
            ],
          };
        }
        if (change.type === 'add_idea') {
          const idea: CreativeIdea = {
            id: `i_ai_${Date.now()}`,
            category: p.category || 'Experience',
            title: p.title || change.summaryLabel,
            description: p.description || '',
            estimatedCostImpact: p.estimatedCostImpact || 'Included in budget',
            executionTip: p.executionTip || '',
          };
          return { ...prev, ideas: [...prev.ideas, idea] };
        }
        return prev;
      });
      notify(`Applied Co-Pilot action: ${change.summaryLabel}`);
    },
    [updateActiveEvent, notify]
  );

  const filteredBudgetItems = useMemo(
    () =>
      selectedCategory
        ? activeEvent.budgetItems.filter((item) => item.category === selectedCategory)
        : activeEvent.budgetItems,
    [activeEvent.budgetItems, selectedCategory]
  );

  const sortedTasks = useMemo(
    () => [...activeEvent.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [activeEvent.tasks]
  );

  const tasksByMonth = useMemo(() => {
    const groups: Record<string, TimelineTask[]> = {};
    for (const t of sortedTasks) {
      const monthKey = t.dueDate ? t.dueDate.slice(0, 7) : 'Unscheduled';
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(t);
    }
    return groups;
  }, [sortedTasks]);

  const milestoneGroups = useMemo(() => {
    const eventTime = new Date(activeEvent.date).getTime();
    const groups: Record<string, TimelineTask[]> = {
      'Phase 1: Foundation & Venue (90+ Days Out)': [],
      'Phase 2: Vendors & Design (30–90 Days Out)': [],
      'Phase 3: Final Runbook & Execution (< 30 Days Out)': [],
    };
    for (const t of sortedTasks) {
      const dueTime = new Date(t.dueDate).getTime();
      const diffDays = Math.round((eventTime - dueTime) / (1000 * 60 * 60 * 24));
      if (diffDays >= 90) groups['Phase 1: Foundation & Venue (90+ Days Out)'].push(t);
      else if (diffDays >= 30) groups['Phase 2: Vendors & Design (30–90 Days Out)'].push(t);
      else groups['Phase 3: Final Runbook & Execution (< 30 Days Out)'].push(t);
    }
    return groups;
  }, [sortedTasks, activeEvent.date]);

  const searchResults = useMemo(() => {
    if (!deferredSearchQuery.trim()) return null;
    const q = deferredSearchQuery.toLowerCase();
    return {
      budget: activeEvent.budgetItems.filter(
        (b) => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
      ),
      tasks: activeEvent.tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      ),
      vendors: activeEvent.vendors.filter(
        (v) => v.vendorName.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
      ),
    };
  }, [deferredSearchQuery, activeEvent]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1F1C18]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#0EA5E9] focus:text-white focus:font-semibold focus:text-xs"
        >
          Skip to main content
        </a>

        <AppHeader
          viewMode={viewMode}
          activeSection={activeSection}
          onNavigateSection={handleNavigateSection}
          onSetViewMode={setViewMode}
          searchQuery={searchQuery}
          onSetSearchQuery={setSearchQuery}
          onOpenGeneratorModal={() => setIsGeneratorModalOpen(true)}
          onResetDemoData={resetDemoData}
          currentUser={currentUser}
          isSyncingCloud={isSyncingCloud}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          toastNotice={toastNotice}
          onDismissToast={dismissToast}
        />

        <main
          id="main-content"
          className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {viewMode === 'landing' ? (
            <LandingPage
              sampleEvents={events}
              onEnterWorkspace={(eventId) => {
                if (eventId) setActiveEventId(eventId);
                setViewMode('workspace');
                setActiveSection('overview');
              }}
              onOpenGenerator={() => setIsGeneratorModalOpen(true)}
            />
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              <WorkspaceSidebar
                events={events}
                activeEvent={activeEvent}
                activeSection={activeSection}
                onNavigateSection={handleNavigateSection}
                onSelectEvent={setActiveEventId}
                onOpenGeneratorModal={() => setIsGeneratorModalOpen(true)}
                onDuplicateEvent={duplicateEvent}
                onDeleteEvent={deleteEventById}
              />

              <div className="flex-1 min-w-0 space-y-6">
                {searchResults && (
                  <div
                    role="region"
                    aria-label="Global search results"
                    className="bg-white border border-[#B8860B] rounded-2xl p-4 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#B8860B] font-semibold">
                        Search Results for &ldquo;{searchQuery}&rdquo;
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[#6E655A] hover:text-[#1F1C18]"
                      >
                        Close Search
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#FAF7F2]">
                        <strong className="block mb-1">Budget Items ({searchResults.budget.length})</strong>
                        {searchResults.budget.map((b) => (
                          <div key={b.id} className="py-1 border-b border-[#E6DFD3] last:border-0 flex justify-between">
                            <span>{b.title}</span>
                            <span className="font-mono">{formatCurrency(b.plannedAmount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF7F2]">
                        <strong className="block mb-1">Tasks ({searchResults.tasks.length})</strong>
                        {searchResults.tasks.map((t) => (
                          <div key={t.id} className="py-1 border-b border-[#E6DFD3] last:border-0 flex justify-between">
                            <span>{t.title}</span>
                            <span className="font-mono text-[#6E655A]">{t.dueDate}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF7F2]">
                        <strong className="block mb-1">Vendors ({searchResults.vendors.length})</strong>
                        {searchResults.vendors.map((v) => (
                          <div key={v.id} className="py-1 border-b border-[#E6DFD3] last:border-0 flex justify-between">
                            <span>{v.vendorName}</span>
                            <span className="font-mono">{formatCurrency(v.estimatedPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection !== 'portfolio' && (
                  <WorkspaceSummaryHeader
                    events={events}
                    activeEvent={activeEvent}
                    metrics={metrics}
                    activeSection={activeSection}
                    onNavigateSection={handleNavigateSection}
                    onSelectEvent={setActiveEventId}
                    onOpenGeneratorModal={() => setIsGeneratorModalOpen(true)}
                    currentUser={currentUser}
                    onSignIn={handleSignIn}
                  />
                )}

                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-busy="true"
                      className="bg-white border border-[#E6DFD3] rounded-2xl p-12 flex items-center justify-center gap-3 text-xs text-[#6E655A]"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-[#B8860B]" aria-hidden="true" />
                      <span>Loading workspace module...</span>
                    </div>
                  }
                >
                  {activeSection === 'portfolio' && (
                    <PortfolioSection
                      events={events}
                      activeEventId={activeEvent.id}
                      onSelectEvent={(id) => {
                        setActiveEventId(id);
                        setActiveSection('overview');
                      }}
                      onOpenGeneratorModal={() => setIsGeneratorModalOpen(true)}
                      onDuplicateEvent={duplicateEvent}
                      onDeleteEvent={deleteEventById}
                    />
                  )}
                  {activeSection === 'overview' && (
                    <OverviewSection
                      activeEvent={activeEvent}
                      metrics={metrics}
                      taskDiagnostics={taskDiagnostics}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      onNavigateToSection={handleNavigateSection}
                      onToggleTaskStatus={handleToggleTaskStatus}
                      onInstantRebalanceBudget={handleInstantRebalanceBudget}
                    />
                  )}
                  {activeSection === 'budget' && (
                    <BudgetSection
                      activeEvent={activeEvent}
                      metrics={metrics}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      lockedCategories={lockedCategories}
                      onToggleLockedCategory={toggleLockedCategory}
                      isOptimizingBudget={isOptimizingBudget}
                      optimizerProposal={optimizerProposal}
                      onDismissOptimizerProposal={dismissOptimizerProposal}
                      onApplyOptimizerProposal={applyOptimizerProposal}
                      onAiOptimizeBudget={handleAiOptimizeBudget}
                      onInstantRebalanceBudget={handleInstantRebalanceBudget}
                      onUpdateEventMeta={handleUpdateEventMeta}
                      newItem={newItem}
                      onSetNewItem={setNewItem}
                      onAddBudgetItem={handleAddBudgetItem}
                      onUpdateBudgetItemField={handleUpdateBudgetItemField}
                      onDeleteBudgetItem={handleDeleteBudgetItem}
                      filteredBudgetItems={filteredBudgetItems}
                    />
                  )}
                  {activeSection === 'timeline' && (
                    <TimelineSection
                      activeEvent={activeEvent}
                      timelineView={timelineView}
                      onSetTimelineView={setTimelineView}
                      sortedTasks={sortedTasks}
                      tasksByMonth={tasksByMonth}
                      milestoneGroups={milestoneGroups}
                      taskDiagnostics={taskDiagnostics}
                      newTask={newTask}
                      onSetNewTask={setNewTask}
                      onAddTask={handleAddTask}
                      onToggleTaskStatus={handleToggleTaskStatus}
                      onSetTaskDependency={handleSetTaskDependency}
                      onBulkUpdateTasks={handleBulkUpdateTasks}
                      onDeleteTask={handleDeleteTask}
                    />
                  )}
                  {activeSection === 'vendors' && (
                    <VendorsSection
                      activeEvent={activeEvent}
                      newVendor={newVendor}
                      onSetNewVendor={setNewVendor}
                      onAddVendor={handleAddVendor}
                      onUpdateVendorStatus={(vendorId, status) =>
                        updateActiveEvent((prev) => ({
                          ...prev,
                          vendors: prev.vendors.map((v) =>
                            v.id === vendorId ? { ...v, bookingStatus: status } : v
                          ),
                        }))
                      }
                      onUpdateVendorQuote={(vendorId, quoted) =>
                        updateActiveEvent((prev) => ({
                          ...prev,
                          vendors: prev.vendors.map((v) =>
                            v.id === vendorId ? { ...v, quotedAmount: Math.max(0, quoted) } : v
                          ),
                        }))
                      }
                      onDeleteVendor={(vendorId) =>
                        updateActiveEvent((prev) => ({
                          ...prev,
                          vendors: prev.vendors.filter((v) => v.id !== vendorId),
                        }))
                      }
                      newIdea={newIdea}
                      onSetNewIdea={setNewIdea}
                      onAddIdea={(e) => {
                        e.preventDefault();
                        if (!newIdea.title.trim()) return;
                        const idea: CreativeIdea = {
                          id: `i_${Date.now()}`,
                          category: newIdea.category.trim() || 'Experience',
                          title: newIdea.title.trim(),
                          description: newIdea.description.trim(),
                          estimatedCostImpact: newIdea.estimatedCostImpact.trim() || 'Included',
                          executionTip: newIdea.executionTip.trim(),
                        };
                        updateActiveEvent((prev) => ({ ...prev, ideas: [...prev.ideas, idea] }));
                        setNewIdea((p) => ({ ...p, title: '', description: '', executionTip: '' }));
                        notify(`Added creative idea "${idea.title}"`);
                      }}
                      onDeleteIdea={(ideaId) =>
                        updateActiveEvent((prev) => ({
                          ...prev,
                          ideas: prev.ideas.filter((i) => i.id !== ideaId),
                        }))
                      }
                    />
                  )}
                  {activeSection === 'scenarios' && (
                    <ScenarioSimulator
                      event={activeEvent}
                      onSaveScenario={(scen: SavedScenario) => {
                        updateActiveEvent((prev) => ({
                          ...prev,
                          savedScenarios: [...prev.savedScenarios, scen],
                        }));
                        notify(`Saved scenario snapshot "${scen.name}"`);
                      }}
                      onDeleteScenario={(scenId: string) =>
                        updateActiveEvent((prev) => ({
                          ...prev,
                          savedScenarios: prev.savedScenarios.filter((s) => s.id !== scenId),
                        }))
                      }
                      onApplyScenarioToPlan={(scen: SavedScenario) => {
                        const guestRatio = scen.guestCount / Math.max(1, activeEvent.guestCount);
                        updateActiveEvent((prev) => ({
                          ...prev,
                          guestCount: scen.guestCount,
                          totalBudget: scen.totalBudget,
                          budgetItems: prev.budgetItems.map((b) =>
                            b.category.toLowerCase().includes('catering')
                              ? {
                                  ...b,
                                  plannedAmount:
                                    Math.round((b.plannedAmount * guestRatio) / 10) * 10,
                                }
                              : b
                          ),
                        }));
                        notify(`Applied scenario "${scen.name}" to active event plan.`);
                      }}
                    />
                  )}
                  {activeSection === 'export' && (
                    <ExportSection
                      activeEvent={activeEvent}
                      copiedBrief={copiedBrief}
                      onCopyBrief={async () => {
                        const text = formatPlanSummaryText(activeEvent);
                        await navigator.clipboard.writeText(text);
                        setCopiedBrief(true);
                        notify('Copied executive event summary to clipboard.');
                        setTimeout(() => setCopiedBrief(false), 2500);
                      }}
                      onNotify={notify}
                    />
                  )}
                </Suspense>
              </div>
            </div>
          )}
        </main>

        <BlueprintGeneratorModal
          isOpen={isGeneratorModalOpen}
          onClose={() => setIsGeneratorModalOpen(false)}
          onCreateEvent={(ev, meta) => {
            createNewEvent(ev, meta);
            setViewMode('workspace');
            setActiveSection('overview');
          }}
        />

        <AssistantCoPilot
          event={activeEvent}
          onApplyProposedChange={handleApplyCopilotChange}
        />
      </div>
    </MotionConfig>
  );
}
export default App;
