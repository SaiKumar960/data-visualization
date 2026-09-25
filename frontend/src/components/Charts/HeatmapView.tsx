import React from "react";

interface HeatmapViewProps {
  data: any[];
  seriesKeys?: string[] | null;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({ data, seriesKeys }) => {
  if (!data || data.length === 0 || !seriesKeys || seriesKeys.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for 2D Heatmap.</div>;
  }

  // Determine min and max for color scaling
  let minVal = Infinity;
  let maxVal = -Infinity;
  data.forEach((row) => {
    seriesKeys.forEach((key) => {
      const v = Number(row[key] || 0);
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });
  if (minVal === maxVal) maxVal = minVal + 1;

  const getColor = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    // Interpolate blue intensity
    const alpha = 0.15 + ratio * 0.75;
    return `rgba(59, 130, 246, ${alpha})`;
  };

  return (
    <div className="w-full overflow-x-auto p-2">
      <div className="min-w-[500px]">
        {/* Table Header */}
        <div
          className="grid gap-1 mb-1 text-xs font-bold text-[var(--text-secondary)] text-center"
          style={{ gridTemplateColumns: `120px repeat(${seriesKeys.length}, minmax(60px, 1fr))` }}
        >
          <div className="p-2 text-left">X \ Y</div>
          {seriesKeys.map((col) => (
            <div key={col} className="p-2 truncate bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
              {col}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {data.map((row, idx) => (
          <div
            key={idx}
            className="grid gap-1 mb-1 text-xs text-center"
            style={{ gridTemplateColumns: `120px repeat(${seriesKeys.length}, minmax(60px, 1fr))` }}
          >
            <div className="p-2 text-left font-bold text-[var(--text-primary)] truncate bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
              {row.x}
            </div>
            {seriesKeys.map((col) => {
              const val = Number(row[col] || 0);
              return (
                <div
                  key={col}
                  className="p-2.5 rounded font-semibold text-[var(--text-primary)] transition hover:scale-105 border border-blue-500/20"
                  style={{ backgroundColor: getColor(val) }}
                  title={`${row.x} × ${col}: ${val}`}
                >
                  {val.toLocaleString()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
