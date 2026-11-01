import React, { useId } from 'react';
import {
  Sparkles,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/budgetCalculations';
import {
  EVENT_TYPES,
  VENUE_PREFERENCES,
  PRIORITY_OPTIONS,
  WIZARD_PRESETS,
  WizardFormState,
  WizardPreset,
} from './wizardPresets';

export interface WizardStepsProps {
  step: number;
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
  validationError: string | null;
  onApplyPreset: (preset: WizardPreset) => void;
  onTogglePriority: (priority: string) => void;
}

/**
 * Renders the 5 interactive wizard steps for the AI Event Blueprint Generator
 * with linked `<label htmlFor>` + `id`, `<fieldset>` + `<legend>`, and ARIA validation attributes.
 */
export const WizardSteps: React.FC<WizardStepsProps> = ({
  step,
  form,
  setForm,
  validationError,
  onApplyPreset,
  onTogglePriority,
}) => {
  const uid = useId();
  const titleInputId = `${uid}-title`;
  const titleErrorId = `${uid}-title-error`;
  const dateInputId = `${uid}-date`;
  const dateErrorId = `${uid}-date-error`;
  const locationInputId = `${uid}-location`;
  const locationErrorId = `${uid}-location-error`;
  const guestNumberId = `${uid}-guests-num`;
  const guestRangeId = `${uid}-guests-range`;
  const budgetNumberId = `${uid}-budget-num`;
  const budgetRangeId = `${uid}-budget-range`;
  const contingencyRangeId = `${uid}-contingency-range`;
  const notesTextareaId = `${uid}-notes`;

  const contingencyAmount = Math.round(
    form.totalBudget * (form.contingencyPercent / 100)
  );
  const usableBudget = Math.max(0, form.totalBudget - contingencyAmount);
  const perGuestBudget = Math.round(
    usableBudget / Math.max(1, form.guestCount)
  );

  const isTitleInvalid = step === 1 && Boolean(validationError);
  const isStep2Invalid = step === 2 && Boolean(validationError);

  return (
    <>
      {/* Step 1: Event Type & Title */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B8860B] flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" /> Quick-Start Demo Templates
              </span>
              <span className="text-xs text-[#6E655A]">
                1-click prefill for instant evaluation
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WIZARD_PRESETS.map((preset) => {
                const isSelectedPreset = form.title === preset.title;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    aria-pressed={isSelectedPreset}
                    className={`text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-2 min-h-[40px] ${
                      isSelectedPreset
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                        : 'bg-white text-[#1F1C18] border-[#E6DFD3] hover:border-[#B8860B]'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">
                      {preset.label}
                    </span>
                    <span
                      className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isSelectedPreset
                          ? 'bg-white/15 text-[#FAF7F2]'
                          : 'bg-[#F3EFE6] text-[#6E655A]'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor={titleInputId}
              className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2"
            >
              Event Title / Name <span aria-hidden="true">*</span>
            </label>
            <input
              id={titleInputId}
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              aria-required="true"
              aria-invalid={isTitleInvalid}
              aria-describedby={isTitleInvalid ? titleErrorId : undefined}
              placeholder="e.g., Aria & Julian Botanical Wedding or CloudNext Developer Summit"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E6DFD3] text-[#1F1C18] text-sm focus:outline-none focus:border-[#22D3EE]"
            />
            {isTitleInvalid && (
              <p id={titleErrorId} className="sr-only">
                {validationError}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2.5">
              Select Event Category
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {EVENT_TYPES.map((typeOption) => {
                const active = form.type === typeOption;
                return (
                  <button
                    key={typeOption}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, type: typeOption }))
                    }
                    className={`px-3.5 py-2.5 rounded-xl text-left text-xs font-medium border transition-all min-h-[40px] ${
                      active
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18] shadow-xs'
                        : 'bg-white text-[#1F1C18] border-[#E6DFD3] hover:border-[#B8860B]'
                    }`}
                  >
                    {typeOption}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      {/* Step 2: Date, Location & Venue Style */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={dateInputId}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2"
              >
                <Calendar className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" /> Target Event
                Date <span aria-hidden="true">*</span>
              </label>
              <input
                id={dateInputId}
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                aria-required="true"
                aria-invalid={isStep2Invalid && !form.date}
                aria-describedby={
                  isStep2Invalid && !form.date ? dateErrorId : undefined
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6DFD3] text-[#1F1C18] text-sm font-mono focus:outline-none focus:border-[#22D3EE]"
              />
              {isStep2Invalid && !form.date && (
                <p id={dateErrorId} className="sr-only">
                  {validationError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={locationInputId}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2"
              >
                <MapPin className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" /> City / Region{' '}
                <span aria-hidden="true">*</span>
              </label>
              <input
                id={locationInputId}
                type="text"
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                aria-required="true"
                aria-invalid={isStep2Invalid && !form.location.trim()}
                aria-describedby={
                  isStep2Invalid && !form.location.trim()
                    ? locationErrorId
                    : undefined
                }
                placeholder="e.g., San Francisco, CA or Chicago, IL"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6DFD3] text-[#1F1C18] text-sm focus:outline-none focus:border-[#22D3EE]"
              />
              {isStep2Invalid && !form.location.trim() && (
                <p id={locationErrorId} className="sr-only">
                  {validationError}
                </p>
              )}
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2.5">
              Venue Format & Setting Preference
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VENUE_PREFERENCES.map((venueOption) => {
                const active = form.venuePreference === venueOption;
                return (
                  <button
                    key={venueOption}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        venuePreference: venueOption,
                      }))
                    }
                    className={`px-4 py-2.5 rounded-xl text-left text-xs font-medium border transition-all min-h-[40px] ${
                      active
                        ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                        : 'bg-white text-[#1F1C18] border-[#E6DFD3] hover:border-[#B8860B]'
                    }`}
                  >
                    {venueOption}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      {/* Step 3: Guest Count & Total Budget */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor={guestNumberId}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6E655A]"
                >
                  <Users className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" /> Expected
                  Guests
                </label>
                <span className="font-mono text-base font-bold text-[#1F1C18]">
                  {form.guestCount} guests
                </span>
              </div>
              <input
                id={guestRangeId}
                type="range"
                min={15}
                max={1500}
                step={5}
                aria-label="Expected Guests Slider"
                value={Math.min(1500, form.guestCount)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    guestCount: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#22D3EE] mb-2"
              />
              <input
                id={guestNumberId}
                type="number"
                min={10}
                max={25000}
                value={form.guestCount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    guestCount: Math.max(10, Number(e.target.value) || 10),
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-sm font-mono text-[#1F1C18]"
              />
            </div>

            <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor={budgetNumberId}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6E655A]"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#2E5A44]" aria-hidden="true" /> Total
                  Budget Cap
                </label>
                <span className="font-mono text-base font-bold text-[#2E5A44]">
                  {formatCurrency(form.totalBudget)}
                </span>
              </div>
              <input
                id={budgetRangeId}
                type="range"
                min={2000}
                max={250000}
                step={1000}
                aria-label="Total Budget Cap Slider"
                value={Math.min(250000, form.totalBudget)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    totalBudget: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#34D399] mb-2"
              />
              <input
                id={budgetNumberId}
                type="number"
                min={500}
                step={500}
                value={form.totalBudget}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    totalBudget: Math.max(500, Number(e.target.value) || 500),
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-sm font-mono text-[#1F1C18]"
              />
            </div>
          </div>

          <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={contingencyRangeId}
                className="text-xs font-semibold uppercase tracking-wider text-[#6E655A]"
              >
                Emergency Contingency Reserve ({form.contingencyPercent}%)
              </label>
              <span className="font-mono text-xs font-semibold text-[#B8860B]">
                {formatCurrency(contingencyAmount)} reserved
              </span>
            </div>
            <input
              id={contingencyRangeId}
              type="range"
              min={0}
              max={25}
              step={1}
              value={form.contingencyPercent}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contingencyPercent: Number(e.target.value),
                }))
              }
              className="w-full accent-[#22D3EE]"
            />
            <div className="mt-3 pt-3 border-t border-[#E6DFD3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E655A]">
              <span>
                Usable Line-Item Budget:{' '}
                <strong className="font-mono text-[#1F1C18]">
                  {formatCurrency(usableBudget)}
                </strong>
              </span>
              <span>
                Target Per-Guest Spend:{' '}
                <strong className="font-mono text-[#2E5A44]">
                  {formatCurrency(perGuestBudget)} / guest
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Priorities & Constraints */}
      {step === 4 && (
        <div className="space-y-4">
          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2">
              Select Top Planning Priorities (AI weights budget toward these)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((priority) => {
                const selected = form.priorities.includes(priority);
                return (
                  <button
                    key={priority}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onTogglePriority(priority)}
                    className={`px-3.5 py-2.5 rounded-xl text-left text-xs font-medium border flex items-center justify-between transition-all min-h-[40px] ${
                      selected
                        ? 'bg-[#2E5A44] text-white border-[#2E5A44]'
                        : 'bg-white text-[#1F1C18] border-[#E6DFD3] hover:border-[#2E5A44]'
                    }`}
                  >
                    <span>{priority}</span>
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor={notesTextareaId}
              className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-1.5"
            >
              Special Requirements, Vibe, or Constraints
            </label>
            <textarea
              id={notesTextareaId}
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g., Must include vegetarian tasting menu, live acoustic trio, wheelchair accessible shuttles, and strict 11pm sound curfew..."
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E6DFD3] text-[#1F1C18] text-sm focus:outline-none focus:border-[#22D3EE]"
            />
          </div>
        </div>
      )}

      {/* Step 5: Blueprint Review & Generate */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E6DFD3] rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6DFD3] pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
                  {form.type}
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
                  {form.title}
                </h3>
                <p className="text-xs text-[#6E655A] mt-0.5">
                  {form.location} · {form.venuePreference} · Target Date:{' '}
                  <span className="font-mono">{form.date}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-[#6E655A] block">
                  Total Budget
                </span>
                <span className="font-mono text-lg font-bold text-[#2E5A44]">
                  {formatCurrency(form.totalBudget)}
                </span>
                <span className="text-xs font-mono text-[#6E655A] block">
                  {form.guestCount} guests ({formatCurrency(perGuestBudget)}/guest)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#6E655A] font-semibold block mb-1">
                  Priorities Weighted:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {form.priorities.length > 0 ? (
                    form.priorities.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#1F1C18] font-medium"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#6E655A]">Balanced across all categories</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[#6E655A] font-semibold block mb-1">
                  Contingency Reserve:
                </span>
                <p className="font-mono text-[#1F1C18]">
                  {form.contingencyPercent}% ({formatCurrency(contingencyAmount)}{' '}
                  buffer) · {formatCurrency(usableBudget)} allocated to line items
                </p>
              </div>
            </div>

            {form.notes && (
              <div className="text-xs bg-[#FAF7F2] p-3 rounded-lg border border-[#E6DFD3]">
                <span className="font-semibold text-[#1F1C18]">Notes: </span>
                <span className="text-[#6E655A]">{form.notes}</span>
              </div>
            )}
          </div>

          <div className="bg-[#2E5A44]/10 border border-[#2E5A44]/25 rounded-xl p-3.5 text-xs text-[#2E5A44] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Planora AI will generate a mathematically balanced budget breakdown,
              milestone task schedule, vendor shortlist, and creative execution
              tips tailored to your inputs.
            </span>
          </div>
        </div>
      )}
    </>
  );
};
