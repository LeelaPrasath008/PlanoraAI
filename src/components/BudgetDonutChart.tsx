import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetExpenseItem, CurrencyCode, formatCurrency } from '../types/event';

interface BudgetDonutChartProps {
  items: BudgetExpenseItem[];
  totalBudget: number;
  contingencyPercent: number;
  currency: CurrencyCode;
}

const SLICE_COLORS = [
  '#22D3EE', // Laser Cyan
  '#818CF8', // Nebula Indigo
  '#34D399', // Aurora Emerald
  '#FBBF24', // Solar Amber
  '#38BDF8', // Orbital Sky
  '#A78BFA', // Cosmic Violet
  '#F472B6', // Supernova Rose
  '#2DD4BF', // Ion Teal
];

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  items,
  totalBudget,
  contingencyPercent,
  currency,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Aggregate by category in application code
  const categoryMap = new Map<
    string,
    { planned: number; quoted: number; actual: number }
  >();
  for (const item of items) {
    const cat = item.category || 'Other';
    const prev = categoryMap.get(cat) || { planned: 0, quoted: 0, actual: 0 };
    categoryMap.set(cat, {
      planned: prev.planned + (Number(item.plannedAmount) || 0),
      quoted: prev.quoted + (Number(item.quotedAmount) || 0),
      actual: prev.actual + (Number(item.actualAmount) || 0),
    });
  }

  const contingencyReserve = Math.round(
    totalBudget * (Math.max(0, contingencyPercent) / 100)
  );
  if (contingencyReserve > 0) {
    categoryMap.set('Contingency Reserve', {
      planned: contingencyReserve,
      quoted: contingencyReserve,
      actual: 0,
    });
  }

  const categories = Array.from(categoryMap.entries()).map(
    ([name, vals], idx) => ({
      name,
      ...vals,
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    })
  );

  const totalPlannedWithContingency = categories.reduce(
    (s, c) => s + c.planned,
    0
  );
  const denominator = Math.max(1, totalPlannedWithContingency, totalBudget);

  // Build SVG Donut arcs
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const slices = categories.map((cat) => {
    const pct = cat.planned / denominator;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += pct;
    return {
      ...cat,
      pct,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = slices.find((s) => s.name === hoveredCategory) || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
    >
      {/* Left 5 Cols: Interactive SVG Donut Chart */}
      <div className="md:col-span-5 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg
            viewBox="0 0 180 180"
            className="w-full h-full -rotate-90 transform"
            role="img"
            aria-label="Budget allocation donut chart"
          >
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#16213A"
              strokeWidth="22"
            />
            {slices.map((slice, idx) => (
              <motion.circle
                key={slice.name}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: slice.strokeDasharray,
                  strokeDashoffset: slice.strokeDashoffset,
                  strokeWidth: hoveredCategory === slice.name ? 26 : 22,
                }}
                transition={{
                  duration: 0.55,
                  delay: idx * 0.05,
                  ease: 'easeOut',
                }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredCategory(slice.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlice ? activeSlice.name : 'total'}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col items-center"
              >
                <span className="text-xs text-slate-500 truncate max-w-[120px]">
                  {activeSlice ? activeSlice.name : 'Total Budget'}
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {activeSlice
                    ? formatCurrency(activeSlice.planned, currency)
                    : formatCurrency(totalBudget, currency)}
                </span>
                <span className="text-xs font-mono tabular-nums text-emerald-700 mt-0.5">
                  {activeSlice
                    ? `${Math.round(activeSlice.pct * 100)}% share`
                    : `${Math.round(
                        (totalPlannedWithContingency / Math.max(1, totalBudget)) *
                          100
                      )}% allocated`}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right 7 Cols: Category Breakdown Matrix */}
      <div className="md:col-span-7 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
          <span>Category Allocation</span>
          <span>Planned / Share of Budget</span>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {slices.map((slice, idx) => (
            <motion.div
              key={slice.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              onMouseEnter={() => setHoveredCategory(slice.name)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`p-2 rounded-lg transition-colors cursor-pointer space-y-1.5 text-xs ${
                hoveredCategory === slice.name
                  ? 'bg-slate-100'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-xs shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-slate-900 truncate">
                    {slice.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                  <span className="text-slate-900 font-medium">
                    {formatCurrency(slice.planned, currency)}
                  </span>
                  <span className="text-slate-500 w-10 text-right">
                    {Math.round(slice.pct * 100)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-200/80 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round(slice.pct * 100))}%` }}
                  transition={{ duration: 0.55, delay: 0.1 + idx * 0.04 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
