"use client";

export interface SummaryCard {
  label: string;
  value: number;
  prefix?: string;
  description?: string;
}

export default function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 mb-6">
      {cards.map((s, i) => (
        <div key={`${s.label}-${i}`} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90 whitespace-nowrap">{s.prefix || ""}{s.value.toLocaleString()}</p>
          {s.description && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{s.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
