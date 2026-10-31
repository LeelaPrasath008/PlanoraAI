import React, { useState } from 'react';
import {
  X,
  Loader2,
  Wand2,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  CurrencyCode,
  EventType,
  formatCurrency,
  PlanoraEvent,
  VenuePreference,
} from '../types/event';

interface BlueprintGeneratorModalProps {
  isOpen: boolean;
  ownerId: string;
  onClose: () => void;
  onCreated: (newPlan: PlanoraEvent) => void;
}

const PRIORITY_OPTIONS = [
  'Guest Experience',
  'Affordability',
  'Elegance',
  'Sustainability',
  'Convenience',
  'Cultural Authenticity',
];

const WIZARD_PRESETS: Array<{
  label: string;
  eventType: EventType;
  title: string;
  description: string;
  eventDate: string;
  durationHours: number;
  city: string;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  themeStyle: string;
  venuePreference: VenuePreference;
  foodPreference: string;
  culturalNotes: string;
  mustHaves: string;
  avoidItems: string;
  priorities: string[];
}> = [
  {
    label: 'Indian Wedding (200 Guests · ₹5L)',
    eventType: 'Wedding',
    title: 'Rohan & Kavya — Courtyard Sangeet & Wedding',
    description:
      'Daytime pheras and evening folk musical reception for 200 family and close friends.',
    eventDate: '2027-02-20',
    durationHours: 10,
    city: 'Udaipur, Rajasthan',
    guestCount: 200,
    totalBudget: 500000,
    currency: 'INR',
    themeStyle: 'Royal Marigold, Brass Urlis & Handloom Drapery',
    venuePreference: 'Outdoor',
    foodPreference: 'Pure Vegetarian North Indian & Rajasthani Thali + Live Chaat',
    culturalNotes: 'Traditional Vedic pheras with bilingual summary cards for guests.',
    mustHaves: 'Live Dhol & Folk Singers, Kulhad Chai Station, Candid Photographer',
    avoidItems: 'Plastic floral foam, synthetic stage backdrops',
    priorities: ['Affordability', 'Guest Experience', 'Cultural Authenticity'],
  },
  {
    label: 'College Cultural Fest (400 Guests · ₹1.8L)',
    eventType: 'College Event',
    title: 'Aarohan 2027 — Inter-Collegiate Music & Design Fest',
    description:
      'Full-day campus cultural festival featuring battle of bands, design hackathon, and street food stalls.',
    eventDate: '2027-01-18',
    durationHours: 9,
    city: 'Mumbai, Maharashtra',
    guestCount: 400,
    totalBudget: 180000,
    currency: 'INR',
    themeStyle: 'Indie Acoustic Campus Commons & Retro Poster Art',
    venuePreference: 'Hybrid',
    foodPreference: 'Student-Friendly Street Food Stalls, Cold Brew & Millet Wraps',
    culturalNotes: 'Student volunteer-run production with sponsor stalls.',
    mustHaves: 'Line-array stage audio, digital QR pass check-in, ambulance standby',
    avoidItems: 'Single-use plastic cups, delayed soundcheck',
    priorities: ['Affordability', 'Convenience', 'Guest Experience'],
  },
  {
    label: 'Silver Anniversary Gala (80 Guests · $12k)',
    eventType: 'Anniversary',
    title: '25th Silver Anniversary Conservatory Dinner',
    description:
      'Intimate seated celebration honoring 25 years with live strings, family toast reel, and plated supper.',
    eventDate: '2027-04-10',
    durationHours: 5,
    city: 'San Francisco, CA',
    guestCount: 80,
    totalBudget: 12000,
    currency: 'USD',
    themeStyle: 'Warm Botanical Glasshouse & Taper Candlelight',
    venuePreference: 'Indoor',
    foodPreference: 'Mediterranean Three-Course Plated Dinner + Gluten-Free Options',
    culturalNotes: 'Memory timeline display and toast sequence between courses.',
    mustHaves: 'Acoustic string duo, projector for family archive montage',
    avoidItems: 'Buffet queues, overly loud dance music',
    priorities: ['Elegance', 'Guest Experience', 'Convenience'],
  },
];

interface GeneratedBudgetItemRaw {
  category?: string;
  title?: string;
  plannedAmount?: number;
  quotedAmount?: number;
  actualAmount?: number;
  lowEstimate?: number;
  highEstimate?: number;
  paymentStatus?: 'Paid' | 'Pending' | 'Unpaid';
  notes?: string;
}

interface GeneratedTaskRaw {
  title?: string;
  description?: string;
  dueDate?: string;
  durationDays?: number;
  priority?: 'High' | 'Medium' | 'Low';
  category?: string;
  status?: 'Todo' | 'In Progress' | 'Completed';
  assignee?: string;
}

interface GeneratedVendorRaw {
  category?: string;
  vendorName?: string;
  contactInfo?: string;
  estimatedPrice?: number;
  quotedAmount?: number;
  followUpDate?: string;
  notes?: string;
}

interface GeneratedIdeaRaw {
  category?: 'Decor' | 'Food & Beverage' | 'Entertainment' | 'Invitations' | 'Activities';
  title?: string;
  description?: string;
  estimatedCostImpact?: string;
  executionTip?: string;
}

export const BlueprintGeneratorModal: React.FC<BlueprintGeneratorModalProps> = ({
  isOpen,
  ownerId,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [title, setTitle] = useState('Rohan & Kavya — Courtyard Sangeet & Wedding');
  const [description, setDescription] = useState(
    'Daytime pheras and evening folk musical reception for family and close friends.'
  );
  const [eventDate, setEventDate] = useState('2027-02-20');
  const [durationHours, setDurationHours] = useState(10);
  const [city, setCity] = useState('Udaipur, Rajasthan');
  const [guestCount, setGuestCount] = useState(200);
  const [totalBudget, setTotalBudget] = useState(500000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [contingencyPercent, setContingencyPercent] = useState(8);
  const [venuePreference, setVenuePreference] = useState<VenuePreference>('Outdoor');
  const [themeStyle, setThemeStyle] = useState(
    'Royal Marigold, Brass Urlis & Handloom Drapery'
  );
  const [foodPreference, setFoodPreference] = useState(
    'Pure Vegetarian North Indian & Rajasthani Thali + Live Chaat'
  );
  const [culturalNotes, setCulturalNotes] = useState(
    'Traditional Vedic pheras with bilingual summary cards for guests.'
  );
  const [mustHaves, setMustHaves] = useState(
    'Live Dhol & Folk Singers, Kulhad Chai Station, Candid Photographer'
  );
  const [avoidItems, setAvoidItems] = useState(
    'Plastic floral foam, synthetic stage backdrops'
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    'Affordability',
    'Guest Experience',
    'Cultural Authenticity',
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const applyPreset = (p: (typeof WIZARD_PRESETS)[0]) => {
    setEventType(p.eventType);
    setTitle(p.title);
    setDescription(p.description);
    setEventDate(p.eventDate);
    setDurationHours(p.durationHours);
    setCity(p.city);
    setGuestCount(p.guestCount);
    setTotalBudget(p.totalBudget);
    setCurrency(p.currency);
    setThemeStyle(p.themeStyle);
    setVenuePreference(p.venuePreference);
    setFoodPreference(p.foodPreference);
    setCulturalNotes(p.culturalNotes);
    setMustHaves(p.mustHaves);
    setAvoidItems(p.avoidItems);
    setSelectedPriorities(p.priorities);
    setValidationError(null);
  };

  const togglePriority = (prio: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(prio) ? prev.filter((x) => x !== prio) : [...prev, prio]
    );
  };

  const validateCurrentStep = (): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!title.trim() || !city.trim() || !eventDate) {
        setValidationError('Please enter an event name, city/location, and valid date.');
        return false;
      }
    }
    if (step === 2) {
      if (guestCount < 1 || totalBudget <= 0) {
        setValidationError('Guest count must be at least 1 and budget must be greater than 0.');
        return false;
      }
    }
    if (step === 4) {
      if (selectedPriorities.length === 0) {
        setValidationError('Please select at least one planning priority.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleGenerate = async () => {
    if (!validateCurrentStep()) return;
    setIsGenerating(true);
    setValidationError(null);

    try {
      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          title,
          description,
          eventDate,
          durationHours,
          city,
          guestCount,
          totalBudget,
          currency,
          contingencyPercent,
          venuePreference,
          themeStyle,
          foodPreference,
          culturalNotes,
          mustHaves,
          avoidItems,
          priorities: selectedPriorities.join(', '),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI plan');
      }

      const now = Date.now();
      const eventId = `evt_${now}`;
      const rawBudgetItems = (data.budgetItems || []) as GeneratedBudgetItemRaw[];
      const rawTasks = (data.tasks || []) as GeneratedTaskRaw[];
      const rawVendors = (data.vendors || []) as GeneratedVendorRaw[];
      const rawIdeas = (data.ideas || []) as GeneratedIdeaRaw[];

      const newPlan: PlanoraEvent = {
        id: eventId,
        ownerId,
        isDemo: false,
        title: title.trim(),
        description: description.trim(),
        eventType,
        eventDate,
        durationHours: Number(durationHours) || 6,
        city: city.trim(),
        guestCount: Number(guestCount) || 50,
        totalBudget: Number(totalBudget) || 50000,
        currency,
        themeStyle: themeStyle.trim(),
        venuePreference,
        foodPreference: foodPreference.trim(),
        culturalNotes: culturalNotes.trim(),
        mustHaves: mustHaves.trim(),
        avoidItems: avoidItems.trim(),
        priorities: selectedPriorities.join(', '),
        contingencyPercent: Number(contingencyPercent) || 8,
        status: 'active',
        isShared: false,
        shareToken: `shr_${now}`,
        aiConceptSummary:
          data.aiConceptSummary ||
          'Personalized event concept tailored to your parameters.',
        aiRisksAndContingencies:
          data.aiRisksAndContingencies ||
          'Review weather backup and vendor cancellation clauses.',
        budgetItems: rawBudgetItems.map((b, i) => ({
          id: `b_${now}_${i}`,
          eventId,
          ownerId,
          category: b.category || 'General',
          title: b.title || 'Budget Allocation',
          plannedAmount: Number(b.plannedAmount) || 0,
          quotedAmount: Number(b.quotedAmount) || 0,
          actualAmount: Number(b.actualAmount) || 0,
          lowEstimate: Number(b.lowEstimate) || 0,
          highEstimate: Number(b.highEstimate) || 0,
          paymentStatus:
            b.paymentStatus && ['Paid', 'Pending', 'Unpaid'].includes(b.paymentStatus)
              ? b.paymentStatus
              : 'Unpaid',
          notes: b.notes || '',
        })),
        tasks: rawTasks.map((t, i) => ({
          id: `t_${now}_${i}`,
          eventId,
          ownerId,
          title: t.title || 'Preparation Task',
          description: t.description || '',
          dueDate: t.dueDate || eventDate,
          durationDays: Number(t.durationDays) || 7,
          priority:
            t.priority && ['High', 'Medium', 'Low'].includes(t.priority)
              ? t.priority
              : 'Medium',
          category: t.category || 'General',
          status:
            t.status && ['Todo', 'In Progress', 'Completed'].includes(t.status)
              ? t.status
              : 'Todo',
          dependsOnTaskId: i > 0 ? `t_${now}_${i - 1}` : '',
          assignee: t.assignee || 'Organizer',
        })),
        vendors: rawVendors.map((v, i) => ({
          id: `v_${now}_${i}`,
          eventId,
          ownerId,
          category: v.category || 'Venue',
          vendorName: v.vendorName || 'Suggested Vendor Archetype',
          contactInfo:
            v.contactInfo || 'Unverified AI Suggestion — Add local quote',
          estimatedPrice: Number(v.estimatedPrice) || 0,
          quotedAmount: Number(v.quotedAmount) || 0,
          bookingStatus: 'Shortlisted',
          followUpDate: v.followUpDate || eventDate,
          notes: v.notes || '',
          isAiSuggestion: true,
        })),
        ideas: rawIdeas.map((idea, i) => ({
          id: `i_${now}_${i}`,
          eventId,
          ownerId,
          category:
            idea.category &&
            [
              'Decor',
              'Food & Beverage',
              'Entertainment',
              'Invitations',
              'Activities',
            ].includes(idea.category)
              ? idea.category
              : 'Decor',
          title: idea.title || 'Creative Recommendation',
          description: idea.description || '',
          estimatedCostImpact: idea.estimatedCostImpact || 'Within budget',
          executionTip: idea.executionTip || '',
        })),
        messages: [
          {
            id: `m_${now}_0`,
            eventId,
            ownerId,
            role: 'assistant',
            content: `Generated your complete ${eventType} blueprint for ${guestCount} guests in ${city} (${formatCurrency(
              totalBudget,
              currency
            )}). Ask me to refine any budget category, compare vendor quotes, or adjust timelines.`,
            createdAt: new Date().toISOString(),
            suggestedActionLabel: 'Initial Plan Created',
          },
        ],
      };

      onCreated(newPlan);
      onClose();
      setStep(1);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error
          ? err.message
          : 'Unable to generate event plan. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
    >
      <div className="bg-[#FAF8F5] border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl my-8">
        {/* Top Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="wizard-modal-title"
              className="text-lg font-bold text-[#1E1B4B] font-display"
            >
              Planora AI — 5-Step Event Creation Wizard
            </h2>
            <p className="text-xs text-slate-500">
              Step {step} of 5 · Build a personalized budget, timeline, vendor checklist, and concept
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
            aria-label="Close wizard"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-white px-6 py-2.5 border-b border-slate-200 grid grid-cols-5 gap-2 text-xs">
          {[
            '1. Basics',
            '2. Budget',
            '3. Style & Food',
            '4. Priorities',
            '5. Review',
          ].map((label, idx) => {
            const sNum = idx + 1;
            const active = step === sNum;
            const done = step > sNum;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (sNum < step || validateCurrentStep()) setStep(sNum);
                }}
                className={`py-1.5 px-2 rounded-md font-medium text-center transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-[#1E1B4B] text-white'
                    : done
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Presets on Step 1 */}
          {step === 1 && (
            <div className="bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="text-xs font-medium text-slate-600 mb-2">
                Quick-Fill Sample Scenarios (Unverified Illustrative Presets)
              </div>
              <div className="flex flex-wrap gap-2">
                {WIZARD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-3 py-1.5 text-xs font-medium text-[#1E1B4B] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Event Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Event Type
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
                  {(
                    [
                      'Wedding',
                      'Birthday',
                      'Anniversary',
                      'College Event',
                      'Festival',
                      'Community',
                    ] as EventType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEventType(t)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                        eventType === t
                          ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Rohan & Kavya — Courtyard Wedding"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Brief Description & Vision
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    City or Location
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    placeholder="e.g. Jaipur, Bengaluru, London"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Guest Scale, Budget & Venue Type */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Total Budget ({currency})
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={1000}
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estimated Guest Count
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50000}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Indoor / Outdoor Setting Preference
                  </label>
                  <div className="flex items-center p-1 bg-slate-200/70 rounded-lg">
                    {(['Indoor', 'Outdoor', 'Hybrid'] as VenuePreference[]).map(
                      (v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVenuePreference(v)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            venuePreference === v
                              ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {v}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contingency Buffer Reserve ({contingencyPercent}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={contingencyPercent}
                    onChange={(e) => setContingencyPercent(Number(e.target.value))}
                    className="w-full accent-[#1E1B4B] mt-2"
                  />
                  <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    Reserved: {formatCurrency((totalBudget * contingencyPercent) / 100, currency)} · Per-Guest Target: {formatCurrency(totalBudget / Math.max(1, guestCount), currency)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Theme, Food & Cultural Preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Theme & Visual Style
                </label>
                <input
                  type="text"
                  value={themeStyle}
                  onChange={(e) => setThemeStyle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Warm Marigold & Brass, Minimalist Botanical, Retro Campus Fest"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Food Preferences & Dietary Requirements
                </label>
                <input
                  type="text"
                  value={foodPreference}
                  onChange={(e) => setFoodPreference(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Pure Vegetarian, Jain counter, South Indian Sadhya, Mediterranean Tapas"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cultural or Regional Considerations (Optional)
                </label>
                <textarea
                  rows={2}
                  value={culturalNotes}
                  onChange={(e) => setCulturalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Morning Muhurtham timing, Haldi/Mehendi rituals, bilingual signage..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: Must-Haves, Avoids & Priorities */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select Planning Priorities (Choose 1–4)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map((prio) => {
                    const active = selectedPriorities.includes(prio);
                    return (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => togglePriority(prio)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          active
                            ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        <span>{prio}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Must-Have Elements
                </label>
                <input
                  type="text"
                  value={mustHaves}
                  onChange={(e) => setMustHaves(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Live folk music, Polaroid booth, shaded elder seating"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Items or Clichés to Avoid
                </label>
                <input
                  type="text"
                  value={avoidItems}
                  onChange={(e) => setAvoidItems(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Single-use plastics, loud DJ bass, synthetic flowers"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-900 text-sm font-display">
                    {title}
                  </span>
                  <span className="font-mono tabular-nums text-emerald-800 font-semibold">
                    {formatCurrency(totalBudget, currency)} ({guestCount} guests)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <strong className="text-slate-800">Type & Venue:</strong>{' '}
                    {eventType} · {venuePreference}
                  </div>
                  <div>
                    <strong className="text-slate-800">Date & City:</strong>{' '}
                    {eventDate} · {city}
                  </div>
                  <div>
                    <strong className="text-slate-800">Theme:</strong>{' '}
                    {themeStyle || 'Custom'}
                  </div>
                  <div>
                    <strong className="text-slate-800">Priorities:</strong>{' '}
                    {selectedPriorities.join(', ')}
                  </div>
                </div>
                <div className="text-slate-600">
                  <strong className="text-slate-800">Culinary & Cultural:</strong>{' '}
                  {foodPreference} {culturalNotes ? `· ${culturalNotes}` : ''}
                </div>
              </div>

              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  <strong>Transparency Note:</strong> AI-generated cost ranges,
                  category allocations, and vendor archetypes are illustrative
                  planning estimates—not verified real-world quotes or confirmed
                  bookings.
                </span>
              </div>
            </div>
          )}

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {validationError}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={step === 1 ? onClose : handleBack}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{step === 1 ? 'Cancel' : 'Back'}</span>
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] rounded-lg hover:bg-slate-900"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#059669] rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Personalized Plan...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Generate My Event Plan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
