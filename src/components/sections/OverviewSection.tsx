import React, { useState, Suspense } from 'react';
import {
  CopilotChatMessage,
  PlanoraEvent,
  PlanoraIdea,
  ProposedCopilotChange,
} from '../../types/event';
import { BudgetDonutChart } from '../BudgetDonutChart';

const AssistantCoPilot = React.lazy(() =>
  import('../AssistantCoPilot').then((m) => ({ default: m.AssistantCoPilot }))
);

interface OverviewSectionProps {
  activeEvent: PlanoraEvent;
  isReadOnly: boolean;
  ownerId: string;
  onAddIdea: (idea: PlanoraIdea) => Promise<void>;
  onSendMessage: (
    userMsg: CopilotChatMessage,
    assistantMsg: CopilotChatMessage
  ) => Promise<void>;
  onConfirmProposedChange: (
    messageId: string,
    change: ProposedCopilotChange
  ) => Promise<void>;
}

export const OverviewSection: React.FC<OverviewSectionProps> = React.memo(
  ({
    activeEvent,
    isReadOnly,
    ownerId,
    onAddIdea,
    onSendMessage,
    onConfirmProposedChange,
  }) => {
    const [newIdea, setNewIdea] = useState({
      category: 'Decor' as PlanoraIdea['category'],
      title: '',
      description: '',
      estimatedCostImpact: '',
      executionTip: '',
    });

    const handleIdeaSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newIdea.title.trim()) return;
      const item: PlanoraIdea = {
        id: `i_man_${Date.now()}`,
        eventId: activeEvent.id,
        ownerId,
        category: newIdea.category,
        title: newIdea.title.trim(),
        description: newIdea.description.trim(),
        estimatedCostImpact:
          newIdea.estimatedCostImpact.trim() || 'Included in budget',
        executionTip: newIdea.executionTip.trim(),
      };
      await onAddIdea(item);
      setNewIdea({
        category: 'Decor',
        title: '',
        description: '',
        estimatedCostImpact: '',
        executionTip: '',
      });
    };

    return (
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
              Potential Risks, Overlooked Costs &amp; Contingency Plan
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
                  Personalized Decor, Food, Entertainment &amp; Activity Ideas
                </h2>
                <p className="text-xs text-slate-500">
                  Tailored to {activeEvent.city} and{' '}
                  {activeEvent.foodPreference}
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
                  {idea.executionTip && (
                    <div className="text-xs text-slate-500 pt-1">
                      <strong>Tip:</strong> {idea.executionTip}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick-Add Idea Form */}
            {!isReadOnly && (
              <form
                onSubmit={handleIdeaSubmit}
                aria-label="Add personalized event idea"
                className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2"
              >
                <select
                  aria-label="Idea category"
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
                  <option value="Food & Beverage">Food &amp; Beverage</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Invitations">Invitations</option>
                  <option value="Activities">Activities</option>
                </select>
                <input
                  type="text"
                  required
                  aria-label="Idea title"
                  value={newIdea.title}
                  onChange={(e) =>
                    setNewIdea((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Idea title..."
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
                <input
                  type="text"
                  aria-label="Idea description"
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
          <Suspense
            fallback={
              <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 animate-pulse space-y-3">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-24 w-full bg-slate-100 rounded" />
              </div>
            }
          >
            <AssistantCoPilot
              event={activeEvent}
              onSendMessage={onSendMessage}
              onConfirmProposedChange={onConfirmProposedChange}
            />
          </Suspense>
        </div>
      </div>
    );
  }
);
