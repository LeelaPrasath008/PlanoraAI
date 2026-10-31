import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  formatCurrency,
  PlanoraEvent,
  PlanoraVendor,
} from '../../types/event';

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

interface VendorsSectionProps {
  activeEvent: PlanoraEvent;
  isReadOnly: boolean;
  ownerId: string;
  onUpdateVendor: (updated: PlanoraVendor) => Promise<void>;
  onDeleteVendor: (vendorId: string) => Promise<void>;
  onAddVendor: (vendor: PlanoraVendor) => Promise<void>;
}

export const VendorsSection: React.FC<VendorsSectionProps> = React.memo(
  ({
    activeEvent,
    isReadOnly,
    ownerId,
    onUpdateVendor,
    onDeleteVendor,
    onAddVendor,
  }) => {
    const [vendorViewMode, setVendorViewMode] = useState<
      'list' | 'compare' | 'checklist'
    >('list');

    const [newVendor, setNewVendor] = useState({
      category: 'Catering',
      vendorName: '',
      contactInfo: '',
      estimatedPrice: '',
      quotedAmount: '',
      bookingStatus: 'Quoted' as PlanoraVendor['bookingStatus'],
      followUpDate: activeEvent.eventDate,
      notes: '',
    });

    const handleVendorSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newVendor.vendorName.trim()) return;
      const created: PlanoraVendor = {
        id: `v_man_${Date.now()}`,
        eventId: activeEvent.id,
        ownerId,
        category: newVendor.category,
        vendorName: newVendor.vendorName.trim(),
        contactInfo: newVendor.contactInfo.trim() || 'Direct Contact',
        estimatedPrice: Number(newVendor.estimatedPrice) || 0,
        quotedAmount: Number(newVendor.quotedAmount) || 0,
        bookingStatus: newVendor.bookingStatus,
        followUpDate: newVendor.followUpDate,
        notes: newVendor.notes.trim(),
        isAiSuggestion: false,
      };
      await onAddVendor(created);
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
    };

    return (
      <section aria-label="Vendor and Quotation Management" className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
              Vendor Directory, Quotation Comparison &amp; Inquiry Checklist
            </h2>
            <p className="text-xs text-slate-500">
              AI suggestions are clearly labeled as unverified search
              strategies—never fabricated reviews or fake bookings.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Vendor management views"
            className="flex items-center p-1 bg-slate-100 rounded-lg"
          >
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
                role="tab"
                aria-selected={vendorViewMode === vm.id}
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
                    <th scope="col" className="py-3 px-4 font-medium">
                      Category &amp; Vendor / Strategy
                    </th>
                    <th scope="col" className="py-3 px-4 font-medium">
                      Contact
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 font-medium text-right"
                    >
                      Est. Price
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 font-medium text-right"
                    >
                      Quoted Amount
                    </th>
                    <th scope="col" className="py-3 px-4 font-medium">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 font-medium text-right"
                    >
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
                        {formatCurrency(v.estimatedPrice, activeEvent.currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          aria-label={`Quoted amount for ${v.vendorName}`}
                          disabled={isReadOnly}
                          value={v.quotedAmount}
                          onChange={(e) => {
                            onUpdateVendor({
                              ...v,
                              quotedAmount: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            });
                          }}
                          className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Booking status for ${v.vendorName}`}
                          disabled={isReadOnly}
                          value={v.bookingStatus}
                          onChange={(e) => {
                            onUpdateVendor({
                              ...v,
                              bookingStatus: e.target
                                .value as PlanoraVendor['bookingStatus'],
                            });
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded"
                        >
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Inquiry Sent">Inquiry Sent</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Booked">Booked</option>
                          <option value="Declined">Declined</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => onDeleteVendor(v.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          aria-label={`Delete vendor ${v.vendorName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
                onSubmit={handleVendorSubmit}
                aria-label="Add vendor quotation"
                className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
              >
                <select
                  aria-label="New vendor category"
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
                    Equipment &amp; Rentals
                  </option>
                </select>
                <input
                  type="text"
                  required
                  aria-label="New vendor name"
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
                  aria-label="New vendor budget estimate"
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
                  aria-label="New vendor quoted amount"
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
                        {formatCurrency(v.quotedAmount, activeEvent.currency)}
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
                    {cat} — Contract &amp; Vetting Questions
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
    );
  }
);
