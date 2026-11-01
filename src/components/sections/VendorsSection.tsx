import React, { useId } from 'react';
import {
  Plus,
  Trash2,
  Lightbulb,
} from 'lucide-react';
import { PlanoraEvent, BookingStatus } from '../../types/event';
import { formatCurrency } from '../../utils/budgetCalculations';

export interface VendorsSectionProps {
  activeEvent: PlanoraEvent;
  newVendor: {
    category: string;
    vendorName: string;
    contactInfo: string;
    estimatedPrice: number;
    quotedAmount: number;
    bookingStatus: BookingStatus;
    followUpDate: string;
    notes: string;
  };
  onSetNewVendor: React.Dispatch<
    React.SetStateAction<{
      category: string;
      vendorName: string;
      contactInfo: string;
      estimatedPrice: number;
      quotedAmount: number;
      bookingStatus: BookingStatus;
      followUpDate: string;
      notes: string;
    }>
  >;
  onAddVendor: (e: React.FormEvent) => void;
  onUpdateVendorStatus: (vendorId: string, status: BookingStatus) => void;
  onUpdateVendorQuote: (vendorId: string, quotedAmount: number) => void;
  onDeleteVendor: (vendorId: string) => void;
  newIdea: {
    category: string;
    title: string;
    description: string;
    estimatedCostImpact: string;
    executionTip: string;
  };
  onSetNewIdea: React.Dispatch<
    React.SetStateAction<{
      category: string;
      title: string;
      description: string;
      estimatedCostImpact: string;
      executionTip: string;
    }>
  >;
  onAddIdea: (e: React.FormEvent) => void;
  onDeleteIdea: (ideaId: string) => void;
}

/**
 * Vendors & Creative Ideas section with accessible form controls (`useId()`),
 * table `<caption>`, and `scope="col"`/`scope="row"` headers.
 */
export const VendorsSection: React.FC<VendorsSectionProps> = React.memo(({
  activeEvent,
  newVendor,
  onSetNewVendor,
  onAddVendor,
  onUpdateVendorStatus,
  onUpdateVendorQuote,
  onDeleteVendor,
  newIdea,
  onSetNewIdea,
  onAddIdea,
  onDeleteIdea,
}) => {
  const uid = useId();
  const vendorCatId = `${uid}-vendor-cat`;
  const vendorNameId = `${uid}-vendor-name`;
  const vendorContactId = `${uid}-vendor-contact`;
  const vendorEstPriceId = `${uid}-vendor-est`;
  const vendorStatusId = `${uid}-vendor-status`;
  const ideaCatId = `${uid}-idea-cat`;
  const ideaTitleId = `${uid}-idea-title`;
  const ideaDescId = `${uid}-idea-desc`;
  const ideaImpactId = `${uid}-idea-impact`;
  const ideaTipId = `${uid}-idea-tip`;

  return (
    <div className="space-y-8">
      {/* Add Vendor Form */}
      <form
        onSubmit={onAddVendor}
        aria-label="Add Vendor to Shortlist"
        className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs space-y-4"
      >
        <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
          Add Vendor to Shortlist &amp; Quote Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor={vendorCatId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Category
            </label>
            <input
              id={vendorCatId}
              type="text"
              value={newVendor.category}
              onChange={(e) =>
                onSetNewVendor((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="e.g., Photography"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={vendorNameId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Vendor / Partner Name
            </label>
            <input
              id={vendorNameId}
              type="text"
              value={newVendor.vendorName}
              onChange={(e) =>
                onSetNewVendor((p) => ({ ...p, vendorName: e.target.value }))
              }
              required
              aria-required="true"
              placeholder="e.g., Lumina Fine Art Studio"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={vendorContactId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Contact / Email / Phone
            </label>
            <input
              id={vendorContactId}
              type="text"
              value={newVendor.contactInfo}
              onChange={(e) =>
                onSetNewVendor((p) => ({ ...p, contactInfo: e.target.value }))
              }
              placeholder="booking@studio.com"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={vendorEstPriceId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Estimated Price ($)
            </label>
            <input
              id={vendorEstPriceId}
              type="number"
              min={0}
              value={newVendor.estimatedPrice}
              onChange={(e) =>
                onSetNewVendor((p) => ({
                  ...p,
                  estimatedPrice: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor={vendorStatusId}
                className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
              >
                Status
              </label>
              <select
                id={vendorStatusId}
                value={newVendor.bookingStatus}
                onChange={(e) =>
                  onSetNewVendor((p) => ({
                    ...p,
                    bookingStatus: e.target.value as BookingStatus,
                  }))
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
              >
                <option value="Shortlisted">Shortlisted</option>
                <option value="Contacted">Contacted</option>
                <option value="Negotiating">Negotiating</option>
                <option value="Booked">Booked</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#1F1C18] text-white text-xs font-semibold hover:bg-[#332E28] transition-colors inline-flex items-center gap-1 shrink-0 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </form>

      {/* Vendors Table */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6DFD3]">
          <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
            Vendor Pipeline &amp; Contract Tracker ({activeEvent.vendors.length})
          </h3>
          <p className="text-xs text-[#6E655A]">
            Track quotes, booking status, and follow-up dates across all service
            categories
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">
              Vendor pipeline and contract tracker table
            </caption>
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#E6DFD3] text-xs font-mono uppercase tracking-wider text-[#6E655A]">
                <th scope="col" className="py-3 px-4">
                  Vendor &amp; Category
                </th>
                <th scope="col" className="py-3 px-3">
                  Contact Info
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Est. Price
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Quoted ($)
                </th>
                <th scope="col" className="py-3 px-3 text-center">
                  Booking Status
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD3] text-xs">
              {activeEvent.vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="hover:bg-[#FAF7F2]/60 transition-colors"
                >
                  <th scope="row" className="py-3 px-4 font-normal">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#B8860B] font-semibold block">
                      {vendor.category}
                    </span>
                    <span className="font-semibold text-[#1F1C18] text-sm">
                      {vendor.vendorName}
                    </span>
                    {vendor.notes && (
                      <p className="text-xs text-[#6E655A] mt-0.5">
                        {vendor.notes}
                      </p>
                    )}
                  </th>
                  <td className="py-3 px-3 text-[#6E655A] font-mono text-xs">
                    {vendor.contactInfo || '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#1F1C18]">
                    {formatCurrency(vendor.estimatedPrice)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      aria-label={`Quoted amount for ${vendor.vendorName}`}
                      value={vendor.quotedAmount}
                      onChange={(e) =>
                        onUpdateVendorQuote(vendor.id, Number(e.target.value))
                      }
                      className="w-24 text-right font-mono px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18]"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <select
                      aria-label={`Booking status for ${vendor.vendorName}`}
                      value={vendor.bookingStatus}
                      onChange={(e) =>
                        onUpdateVendorStatus(
                          vendor.id,
                          e.target.value as BookingStatus
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        vendor.bookingStatus === 'Booked'
                          ? 'bg-[#2E5A44]/15 text-[#34D399] border-[#2E5A44]/30'
                          : vendor.bookingStatus === 'Negotiating'
                          ? 'bg-[#D97706]/15 text-[#FBBF24] border-[#D97706]/30'
                          : 'bg-[#FAF7F2] text-[#CBD5E1] border-[#E6DFD3]'
                      }`}
                    >
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Negotiating">Negotiating</option>
                      <option value="Booked">Booked</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteVendor(vendor.id)}
                      aria-label={`Remove vendor ${vendor.vendorName}`}
                      className="p-2 rounded-lg text-[#CBD5E1] hover:text-[#F87171] hover:bg-[#A63A2B]/10 transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creative Ideas & Experience Enhancements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#1F1C18] flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#B8860B]" aria-hidden="true" />
              Creative Experience &amp; Cost-Smart Ideas
            </h3>
            <p className="text-xs text-[#6E655A]">
              Curated décor, hospitality, and entertainment concepts with
              estimated budget impact
            </p>
          </div>
        </div>

        <form
          onSubmit={onAddIdea}
          aria-label="Add Creative Idea"
          className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div>
            <label htmlFor={ideaCatId} className="sr-only">
              Idea Category
            </label>
            <input
              id={ideaCatId}
              type="text"
              value={newIdea.category}
              onChange={(e) =>
                onSetNewIdea((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="Category (e.g., Decor)"
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs w-full"
            />
          </div>
          <div>
            <label htmlFor={ideaTitleId} className="sr-only">
              Idea Title
            </label>
            <input
              id={ideaTitleId}
              type="text"
              value={newIdea.title}
              onChange={(e) =>
                onSetNewIdea((p) => ({ ...p, title: e.target.value }))
              }
              required
              aria-required="true"
              placeholder="Idea Title *"
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs w-full"
            />
          </div>
          <div>
            <label htmlFor={ideaDescId} className="sr-only">
              Concept Description
            </label>
            <input
              id={ideaDescId}
              type="text"
              value={newIdea.description}
              onChange={(e) =>
                onSetNewIdea((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Concept description..."
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs w-full"
            />
          </div>
          <div>
            <label htmlFor={ideaImpactId} className="sr-only">
              Cost Impact
            </label>
            <input
              id={ideaImpactId}
              type="text"
              value={newIdea.estimatedCostImpact}
              onChange={(e) =>
                onSetNewIdea((p) => ({
                  ...p,
                  estimatedCostImpact: e.target.value,
                }))
              }
              placeholder="Cost impact (e.g., +$800)"
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs w-full"
            />
          </div>
          <div className="flex gap-2">
            <label htmlFor={ideaTipId} className="sr-only">
              Execution Tip
            </label>
            <input
              id={ideaTipId}
              type="text"
              value={newIdea.executionTip}
              onChange={(e) =>
                onSetNewIdea((p) => ({ ...p, executionTip: e.target.value }))
              }
              placeholder="Execution tip..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs min-w-0"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#1F1C18] text-white text-xs font-semibold hover:bg-[#332E28] shrink-0 min-h-[36px]"
            >
              Add Idea
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeEvent.ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#F3EFE6] text-[#B8860B] font-semibold">
                    {idea.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteIdea(idea.id)}
                    aria-label={`Delete creative idea ${idea.title}`}
                    className="text-[#CBD5E1] hover:text-[#F87171] p-1 rounded min-w-[28px] min-h-[28px] inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <h4 className="font-serif text-base font-bold text-[#1F1C18] mb-1">
                  {idea.title}
                </h4>
                <p className="text-xs text-[#6E655A] leading-relaxed">
                  {idea.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E6DFD3] space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6E655A] font-semibold">
                    Cost Impact:
                  </span>
                  <span className="font-mono font-semibold text-[#34D399]">
                    {idea.estimatedCostImpact}
                  </span>
                </div>
                {idea.executionTip && (
                  <p className="text-[#6E655A]">
                    <strong className="text-[#1F1C18]">Tip:</strong>{' '}
                    {idea.executionTip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
