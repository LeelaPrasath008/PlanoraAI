import React, { useId, useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PlanoraEvent } from '../types/event';
import { Dialog } from './ui/Dialog';
import {
  WizardFormState,
  WizardPreset,
  buildPlanoraEventFromApiResponse,
} from './blueprint/wizardPresets';
import { WizardSteps } from './blueprint/WizardSteps';
import { logClientWarning } from '../utils/clientLogger';

export interface BlueprintGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (
    newEvent: PlanoraEvent,
    meta?: { usedFallback?: boolean }
  ) => void;
}

const INITIAL_FORM_STATE: WizardFormState = {
  title: '',
  type: 'Wedding',
  date: '2026-09-19',
  location: 'San Francisco, CA',
  venuePreference: 'Outdoor Garden / Courtyard',
  guestCount: 150,
  totalBudget: 45000,
  contingencyPercent: 10,
  priorities: ['Gourmet Catering & Bar', 'Immersive Decor & Lighting'],
  notes: '',
};

/**
 * Accessible multi-step modal wizard that generates a complete `PlanoraEvent`
 * blueprint via `/api/ai/generate-plan` (with resilient deterministic fallback).
 */
export const BlueprintGeneratorModal: React.FC<BlueprintGeneratorModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
}) => {
  const uid = useId();
  const dialogTitleId = `${uid}-dialog-title`;
  const dialogDescId = `${uid}-dialog-desc`;

  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState<WizardFormState>(INITIAL_FORM_STATE);

  const applyPreset = (preset: WizardPreset) => {
    setForm({
      title: preset.title,
      type: preset.type,
      date: preset.date,
      location: preset.location,
      venuePreference: preset.venuePreference,
      guestCount: preset.guestCount,
      totalBudget: preset.totalBudget,
      contingencyPercent: preset.contingencyPercent,
      priorities: [...preset.priorities],
      notes: preset.notes,
    });
    setErrorMsg(null);
  };

  const togglePriority = (priority: string) => {
    setForm((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
  };

  const handleNext = () => {
    if (step === 1 && !form.title.trim()) {
      setErrorMsg('Please enter a name for your event before continuing.');
      return;
    }
    if (step === 2 && (!form.date || !form.location.trim())) {
      setErrorMsg('Please specify both an event date and location.');
      return;
    }
    setErrorMsg(null);
    setStep((s) => Math.min(5, s + 1));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleGenerateBlueprint = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const newEvent = buildPlanoraEventFromApiResponse(form, data);

      onCreateEvent(newEvent, { usedFallback: Boolean(data.usedFallback) });
      setStep(1);
      onClose();
    } catch (error) {
      logClientWarning({
        context: 'BlueprintGeneratorModal /api/ai/generate-plan fallback',
        error,
      });
      setErrorMsg(
        'Unable to reach the blueprint server right now. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={dialogTitleId}
      describedBy={dialogDescId}
      maxWidthClassName="max-w-3xl"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E6DFD3] flex items-center justify-between bg-[#F3EFE6]/60">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-[#1F1C18] text-[#FAF7F2] flex items-center justify-center"
          >
            <Sparkles className="w-5 h-5 text-[#B8860B]" />
          </div>
          <div>
            <h2
              id={dialogTitleId}
              className="font-serif text-xl font-bold text-[#1F1C18]"
            >
              AI Event Blueprint Generator
            </h2>
            <p id={dialogDescId} className="text-xs text-[#6E655A]">
              Step {step} of 5 — Structured budget, timeline &amp; vendor
              synthesis
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Event Blueprint Generator"
          className="p-2 rounded-lg text-[#6E655A] hover:text-[#1F1C18] hover:bg-[#E6DFD3]/50 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Step Progress Bar */}
      <div
        aria-hidden="true"
        className="w-full bg-[#E6DFD3] h-1.5"
      >
        <div
          className="bg-[#B8860B] h-1.5 transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6" aria-busy={isGenerating}>
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#A63A2B]/10 border border-[#A63A2B]/30 text-[#F87171] text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <WizardSteps
          step={step}
          form={form}
          setForm={setForm}
          validationError={errorMsg}
          onApplyPreset={applyPreset}
          onTogglePriority={togglePriority}
        />
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-[#E6DFD3] bg-[#F3EFE6]/50 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#1F1C18] bg-white border border-[#E6DFD3] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50 min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors min-h-[38px]"
          >
            Continue <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerateBlueprint}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#B8860B] text-white hover:bg-[#9A6F09] transition-colors shadow-sm disabled:opacity-60 min-h-[38px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Synthesizing Event Blueprint...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Generate Full Event Blueprint
              </>
            )}
          </button>
        )}
      </div>
    </Dialog>
  );
};
