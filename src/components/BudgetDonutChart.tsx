import React, { useId, useMemo } from 'react';
import { CategorySummary, formatCurrency } from '../utils/budgetCalculations';

export interface BudgetDonutChartProps {
  categories: CategorySummary[];
  totalPlanned: number;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CHART_COLORS = [
  '#38BDF8', // Cyan Sky
  '#34D399', // Cosmic Emerald
  '#FBBF24', // Solar Amber
  '#F87171', // Nova Coral
  '#A78BFA', // Nebula Violet
  '#60A5FA', // Starlight Blue
  '#F472B6', // Pulsar Rose
  '#2DD4BF', // Aurora Teal
  '#FB923C', // Comet Orange
  '#94A3B8', // Asteroid Slate
];

/**
 * Accessible SVG Budget Donut Chart with interactive category slices,
 * SVG <title>/<desc> labelled via aria-labelledby, and a visually-hidden
 * data table for screen reader users.
 */
export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = React.memo(({
  categories,
  totalPlanned,
  selectedCategory,
  onSelectCategory,
}) => {
  const chartId = useId();
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;

  const size = 210;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const slices = useMemo(() => {
    const safeTotal = totalPlanned > 0 ? totalPlanned : 1;
    return categories.reduce<
      Array<
        CategorySummary & {
          color: string;
          fraction: number;
          dashArray: string;
          dashOffset: number;
        }
      >
    >((acc, cat, idx) => {
      const prevCumulative =
        acc.length > 0
          ? acc.reduce((sum, item) => sum + item.fraction, 0)
          : 0;
      const fraction = Math.max(0, cat.planned) / safeTotal;
      const dashLength = Math.max(0, fraction * circumference - 2);
      const dashOffset = -prevCumulative * circumference;
      acc.push({
        ...cat,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        fraction,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset,
      });
      return acc;
    }, []);
  }, [categories, totalPlanned, circumference]);

  const activeSlice = slices.find((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>Budget Allocation Donut Chart</title>
          <desc id={descId}>
            Planned budget distribution across {slices.length} categories totaling{' '}
            {formatCurrency(totalPlanned)}.
          </desc>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice) => {
            const isSelected = selectedCategory === slice.category;
            const isDimmed = selectedCategory !== null && !isSelected;
            return (
              <circle
                key={slice.category}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isSelected ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={slice.dashArray}
                strokeDashoffset={slice.dashOffset}
                strokeLinecap="butt"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                  transition:
                    'stroke-dasharray 0.35s ease, stroke-dashoffset 0.35s ease, stroke-width 0.2s ease, opacity 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() =>
                  onSelectCategory(isSelected ? null : slice.category)
                }
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          <span className="text-xs uppercase tracking-widest text-[#CBD5E1] font-semibold truncate max-w-[115px]">
            {activeSlice ? activeSlice.category : 'Planned Total'}
          </span>
          <span className="font-mono text-base font-bold text-[#F8FAFC] mt-0.5">
            {formatCurrency(activeSlice ? activeSlice.planned : totalPlanned)}
          </span>
          <span className="text-xs font-mono text-[#CBD5E1]">
            {activeSlice
              ? `${activeSlice.sharePercent.toFixed(1)}% of plan`
              : `${categories.length} categories`}
          </span>
        </div>
      </div>

      {/* Visually-hidden data table for assistive technologies */}
      <table className="sr-only">
        <caption>Budget allocation breakdown by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Planned Amount</th>
            <th scope="col">Quoted Amount</th>
            <th scope="col">Actual Amount</th>
            <th scope="col">Share of Planned Budget</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((slice) => (
            <tr key={slice.category}>
              <th scope="row">{slice.category}</th>
              <td>{formatCurrency(slice.planned)}</td>
              <td>{formatCurrency(slice.quoted)}</td>
              <td>{formatCurrency(slice.actual)}</td>
              <td>{slice.sharePercent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Interactive Category Legend */}
      <div className="flex-1 w-full grid grid-cols-1 gap-1.5">
        {slices.map((slice) => {
          const isSelected = selectedCategory === slice.category;
          return (
            <button
              key={slice.category}
              type="button"
              onClick={() =>
                onSelectCategory(isSelected ? null : slice.category)
              }
              aria-pressed={isSelected}
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all text-xs border min-h-[32px] ${
                isSelected
                  ? 'bg-[#FAF7F2] border-[#38BDF8] shadow-xs font-semibold text-[#1F1C18]'
                  : 'bg-transparent border-transparent hover:bg-[#FAF7F2] text-[#1F1C18]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.category}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono">
                <span className="text-[#1F1C18]">{formatCurrency(slice.planned)}</span>
                <span className="text-[#CBD5E1] w-11 text-right">
                  {slice.sharePercent.toFixed(0)}%
                </span>
              </div>
            </button>
          );
        })}
        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-xs text-[#38BDF8] hover:underline text-left px-3 pt-1 font-medium min-h-[28px]"
          >
            Clear category filter ({selectedCategory})
          </button>
        )}
      </div>
    </div>
  );
});
