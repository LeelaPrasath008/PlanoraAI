import React, { useState } from 'react';
import { Send, Loader2, Check, Sparkles } from 'lucide-react';
import {
  CopilotChatMessage,
  formatCurrency,
  PlanoraEvent,
  ProposedCopilotChange,
} from '../types/event';

interface AssistantCoPilotProps {
  event: PlanoraEvent;
  onSendMessage: (
    userMsg: CopilotChatMessage,
    assistantMsg: CopilotChatMessage
  ) => void;
  onConfirmProposedChange: (
    messageId: string,
    change: ProposedCopilotChange
  ) => void;
}

const COPILOT_QUICK_PROMPTS = [
  'Reduce my planned spending by 15% without compromising catering.',
  'My event is in seven days. What should I do first?',
  'Compare my current quotations and suggest selection criteria.',
  'What important expenses or permits have I missed?',
  'Increase the guest count by 25% and recalculate the budget.',
  'Suggest a low-cost sustainable decor upgrade.',
];

export const AssistantCoPilot: React.FC<AssistantCoPilotProps> = React.memo(({
  event,
  onSendMessage,
  onConfirmProposedChange,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, boolean>>({});

  const handleAsk = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setInput('');

    const now = Date.now();
    const userMsg: CopilotChatMessage = {
      id: `msg_u_${now}`,
      eventId: event.id,
      ownerId: event.ownerId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          userMessage: trimmed,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to consult AI Copilot');
      }

      const assistantMsg: CopilotChatMessage = {
        id: `msg_a_${now + 1}`,
        eventId: event.id,
        ownerId: event.ownerId,
        role: 'assistant',
        content:
          data.reply ||
          'Here is my analysis based on your saved event context.',
        createdAt: new Date().toISOString(),
        suggestedActionLabel: data.proposedChanges?.[0]?.summaryLabel || '',
        proposedChanges: Array.isArray(data.proposedChanges)
          ? data.proposedChanges
          : [],
      };

      onSendMessage(userMsg, assistantMsg);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Planora AI Copilot. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      aria-label="Planora AI Planning Copilot"
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3.5">
        <div>
          <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
            Planora AI Planning Copilot
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Grounded in {event.title} · Changes apply only after your explicit confirmation.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-emerald-800 shrink-0">
          {formatCurrency(event.totalBudget, event.currency)}
        </span>
      </div>

      {/* Quick Action Suggestions */}
      <div className="space-y-1.5">
        <div className="text-xs text-slate-500">
          Quick-Action Planning Requests
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COPILOT_QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isLoading}
              onClick={() => handleAsk(q)}
              className="text-left px-2.5 py-1.5 text-xs text-slate-700 bg-[#FAF8F5] hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(input);
        }}
        aria-label="Ask Planora AI Copilot"
        className="flex items-center gap-2"
      >
        <input
          type="text"
          aria-label="Copilot planning prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Copilot to adjust budgets, compare quotes, or add tasks..."
          className="flex-1 min-w-0 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E1B4B]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] rounded-lg hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>Ask Copilot</span>
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg"
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 border border-slate-200 rounded-lg space-y-2 animate-pulse"
        >
          <div className="h-3 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
        </div>
      )}

      {/* Conversation History for Current Event */}
      <div
        aria-live="polite"
        className="space-y-3 max-h-96 overflow-y-auto pr-1"
      >
        {event.messages.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No conversation turns yet. Select a quick prompt above or ask a question.
          </p>
        ) : (
          [...event.messages].reverse().map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-lg border space-y-2.5 ${
                msg.role === 'user'
                  ? 'bg-slate-100/80 border-slate-200'
                  : 'bg-[#FAF8F5] border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  {msg.role === 'user' ? 'You' : 'Planora AI Copilot (Advisory)'}
                </span>
                <span className="font-mono tabular-nums">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>

              {/* Proposed Changes requiring explicit user confirmation */}
              {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                <div className="pt-2.5 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-medium text-[#1E1B4B]">
                    Proposed Plan Changes (Requires Explicit Confirmation):
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {msg.proposedChanges.map((change, idx) => {
                      const key = `${msg.id}_${idx}`;
                      const isConfirmed = Boolean(confirmedMap[key]);
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-md"
                        >
                          <span className="text-xs text-slate-800 truncate">
                            {change.summaryLabel}
                          </span>
                          <button
                            type="button"
                            disabled={isConfirmed}
                            onClick={() => {
                              onConfirmProposedChange(msg.id, change);
                              setConfirmedMap((prev) => ({
                                ...prev,
                                [key]: true,
                              }));
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                              isConfirmed
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-[#059669] text-white hover:bg-emerald-700'
                            }`}
                          >
                            {isConfirmed ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Confirmed & Saved</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>Confirm & Apply</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
});
