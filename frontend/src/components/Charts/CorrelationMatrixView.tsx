import React from "react";

interface CorrelationMatrixViewProps {
  data: any[];
  seriesKeys?: string[] | null;
}

export const CorrelationMatrixView: React.FC<CorrelationMatrixViewProps> = ({ data, seriesKeys }) => {
  if (!data || data.length === 0 || !seriesKeys || seriesKeys.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for Correlation Matrix.</div>;
  }

  const getCorrColor = (val: number) => {
    if (val === 1) return "rgba(59, 130, 246, 0.2)";
    if (val > 0) {
      return `rgba(16, 185, 129, ${Math.abs(val) * 0.7 + 0.1})`;
    } else {
      return `rgba(239, 68, 68, ${Math.abs(val) * 0.7 + 0.1})`;
    }
  };

  return (
    <div className="w-full overflow-x-auto p-2">
      <div className="min-w-[550px]">
        <div
          className="grid gap-1 mb-1 text-xs font-bold text-[var(--text-secondary)] text-center"
          style={{ gridTemplateColumns: `140px repeat(${seriesKeys.length}, minmax(70px, 1fr))` }}
        >
          <div className="p-2 text-left">Variables</div>
          {seriesKeys.map((col) => (
            <div key={col} className="p-2 truncate bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
              {col}
            </div>
          ))}
        </div>

        {data.map((row, idx) => (
          <div
            key={idx}
            className="grid gap-1 mb-1 text-xs text-center"
            style={{ gridTemplateColumns: `140px repeat(${seriesKeys.length}, minmax(70px, 1fr))` }}
          >
            <div className="p-2 text-left font-bold text-[var(--text-primary)] truncate bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
              {row.variable}
            </div>
            {seriesKeys.map((col) => {
              const val = Number(row[col] || 0);
              return (
                <div
                  key={col}
                  className="p-2.5 rounded font-mono font-semibold text-[var(--text-primary)] transition hover:scale-105 border border-slate-700/50"
                  style={{ backgroundColor: getCorrColor(val) }}
                  title={`${row.variable} vs ${col}: ${val}`}
                >
                  {val.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
