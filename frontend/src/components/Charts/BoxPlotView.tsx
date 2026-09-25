import React from "react";

interface BoxPlotItem {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

interface BoxPlotViewProps {
  data: BoxPlotItem[];
}

export const BoxPlotView: React.FC<BoxPlotViewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for Box Plot.</div>;
  }

  return (
    <div className="w-full space-y-4 p-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
        Five-Number Summary & Quartile Distribution
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item, idx) => (
          <div key={idx} className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
            <div className="font-bold text-sm text-[var(--text-primary)] mb-2 truncate">
              {item.category}
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs mb-3">
              <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)]">
                <span className="text-slate-400 block text-[10px]">Min</span>
                <strong className="text-blue-400 font-semibold">{item.min}</strong>
              </div>
              <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)]">
                <span className="text-slate-400 block text-[10px]">Q1</span>
                <strong className="text-slate-200 font-semibold">{item.q1}</strong>
              </div>
              <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/30">
                <span className="text-emerald-400 block text-[10px]">Median</span>
                <strong className="text-emerald-400 font-semibold">{item.median}</strong>
              </div>
              <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)]">
                <span className="text-slate-400 block text-[10px]">Q3</span>
                <strong className="text-slate-200 font-semibold">{item.q3}</strong>
              </div>
              <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)]">
                <span className="text-slate-400 block text-[10px]">Max</span>
                <strong className="text-purple-400 font-semibold">{item.max}</strong>
              </div>
            </div>

            {item.outliers && item.outliers.length > 0 && (
              <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                <span>Outliers ({item.outliers.length}): </span>
                <span className="truncate">{item.outliers.join(", ")}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
