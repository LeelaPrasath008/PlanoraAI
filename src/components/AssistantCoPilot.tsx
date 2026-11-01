import React, { useState, useRef, useEffect, useId } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Check,
  Loader2,
  Wand2,
} from 'lucide-react';
import { PlanoraEvent, ProposedCopilotChange } from '../types/event';
import { formatCurrency } from '../utils/budgetCalculations';
import { logClientWarning } from '../utils/clientLogger';

export interface AssistantCoPilotProps {
  event: PlanoraEvent;
  onApplyProposedChange: (change: ProposedCopilotChange) => void;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  proposedChanges?: ProposedCopilotChange[];
  appliedIndices?: number[];
}

const QUICK_PROMPTS = [
  'Reduce total budget by 15% without hurting guest experience',
  'What happens if we add 40 more guests?',
  'Suggest 2 high-impact low-cost decor ideas',
  'Which tasks are most urgent right now?',
];

/**
 * Floating AI Planning Co-Pilot drawer with keyboard Escape support,
 * `useId()` linked message input label, and explicit confirmation buttons
 * for every proposed plan mutation.
 */
export const AssistantCoPilot: React.FC<AssistantCoPilotProps> = ({
  event,
  onApplyProposedChange,
}) => {
  const uid = useId();
  const titleId = `${uid}-copilot-title`;
  const inputId = `${uid}-copilot-input`;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your Planora AI Co-Pilot for "${event.title}". Ask me to trim costs, adjust guest counts, add contingency tasks, or brainstorm creative ideas.`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgSeqRef = useRef<number>(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    msgSeqRef.current += 1;
    const userMsg: ChatMessage = {
      id: `u_${msgSeqRef.current}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            title: event.title,
            type: event.type,
            date: event.date,
            location: event.location,
            guestCount: event.guestCount,
            totalBudget: event.totalBudget,
            contingencyPercent: event.contingencyPercent,
            budgetItems: event.budgetItems.map((b) => ({
              category: b.category,
              title: b.title,
              plannedAmount: b.plannedAmount,
              actualAmount: b.actualAmount,
            })),
            tasks: event.tasks.slice(0, 8).map((t) => ({
              title: t.title,
              dueDate: t.dueDate,
              status: t.status,
              priority: t.priority,
            })),
          },
          userMessage: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error('Co-Pilot request failed');
      }

      const data = await response.json();

      msgSeqRef.current += 1;
      const assistantMsg: ChatMessage = {
        id: `a_${msgSeqRef.current}`,
        role: 'assistant',
        content:
          data.reply ||
          'Here are my tailored recommendations for your event plan.',
        proposedChanges: Array.isArray(data.proposedChanges)
          ? data.proposedChanges
          : [],
        appliedIndices: [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      logClientWarning({
        context: 'AssistantCoPilot /api/ai/copilot fallback',
        error,
      });
      msgSeqRef.current += 1;
      const fallbackReply: ChatMessage = {
        id: `a_${msgSeqRef.current}`,
        role: 'assistant',
        content: `For ${event.title} (${event.guestCount} guests, ${formatCurrency(event.totalBudget)} budget), I recommend trimming non-essential variable categories by 12% so your ${event.contingencyPercent}% contingency buffer stays protected.`,
        proposedChanges: [
          {
            type: 'scale_budget_items',
            summaryLabel: 'Trim variable budget items by 12%',
            payload: { scaleFactor: 0.88, excludeCategory: 'venue' },
          },
        ],
        appliedIndices: [],
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAction = (
    msgId: string,
    changeIndex: number,
    change: ProposedCopilotChange
  ) => {
    onApplyProposedChange(change);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.appliedIndices || [];
        if (existing.includes(changeIndex)) return m;
        return { ...m, appliedIndices: [...existing, changeIndex] };
      })
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close AI Co-Pilot' : 'Open AI Co-Pilot'}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-[#1F1C18] text-[#FAF7F2] shadow-xl hover:bg-[#332E28] transition-all border border-[#B8860B]/40 group min-h-[44px]"
      >
        <Sparkles className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wide">AI Co-Pilot</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="fixed bottom-20 right-6 z-40 w-[92vw] sm:w-[410px] bg-[#FAF7F2] border border-[#E6DFD3] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[75vh]"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#1F1C18] text-[#FAF7F2] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-lg bg-[#B8860B]/20 flex items-center justify-center"
              >
                <Wand2 className="w-4 h-4 text-[#B8860B]" />
              </div>
              <div>
                <h3 id={titleId} className="font-serif text-sm font-bold">
                  Planora AI Planning Co-Pilot
                </h3>
                <p className="text-xs text-[#CBD5E1] truncate max-w-[240px]">
                  Context: {event.title} ({formatCurrency(event.totalBudget)})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Planning Co-Pilot"
              className="p-1.5 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            aria-live="polite"
            aria-busy={isLoading}
            className="flex-1 p-4 overflow-y-auto space-y-3"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1F1C18] text-white rounded-br-xs'
                      : 'bg-white border border-[#E6DFD3] text-[#1F1C18] rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p>{msg.content}</p>

                  {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E6DFD3] space-y-1.5">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block">
                        One-Click Plan Actions (Requires Confirmation):
                      </span>
                      {msg.proposedChanges.map((change, idx) => {
                        const isApplied = msg.appliedIndices?.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isApplied}
                            onClick={() =>
                              handleApplyAction(msg.id, idx, change)
                            }
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all min-h-[36px] ${
                              isApplied
                                ? 'bg-[#2E5A44]/15 text-[#34D399] border border-[#2E5A44]/30'
                                : 'bg-[#FAF7F2] hover:bg-[#B8860B] hover:text-white text-[#1F1C18] border border-[#E6DFD3]'
                            }`}
                          >
                            <span className="truncate">
                              {change.summaryLabel}
                            </span>
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                                Applied
                              </span>
                            ) : (
                              <span className="text-xs uppercase tracking-wider shrink-0 font-mono">
                                Apply →
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#6E655A] px-2">
                <Loader2
                  className="w-3.5 h-3.5 animate-spin text-[#B8860B]"
                  aria-hidden="true"
                />
                <span>Analyzing budget &amp; timeline trade-offs...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-[#F3EFE6]/70 border-t border-[#E6DFD3] flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => sendMessage(qp)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E6DFD3] text-xs text-[#6E655A] hover:text-[#1F1C18] hover:border-[#B8860B] whitespace-nowrap transition-colors shrink-0 min-h-[28px]"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 bg-white border-t border-[#E6DFD3] flex items-center gap-2"
          >
            <MessageSquare
              className="w-4 h-4 text-[#6E655A] shrink-0 hidden sm:block"
              aria-hidden="true"
            />
            <label htmlFor={inputId} className="sr-only">
              Ask AI Co-Pilot a planning question
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask to rebalance budget, add tasks, or test guest counts..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs text-[#1F1C18] focus:outline-none focus:border-[#22D3EE]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message to AI Co-Pilot"
              className="p-2.5 rounded-xl bg-[#1F1C18] text-white hover:bg-[#332E28] disabled:opacity-40 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
