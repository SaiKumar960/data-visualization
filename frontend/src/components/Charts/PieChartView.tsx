import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartType } from "../../types";

interface PieChartViewProps {
  data: any[];
  chartType: ChartType;
}

const VIBRANT_COLORS = [
  "#10b981", // Emerald Teal
  "#3b82f6", // Sky Blue
  "#a855f7", // Vivid Purple
  "#f59e0b", // Amber
  "#ec4899", // Magenta
  "#06b6d4", // Cyan
  "#f97316", // Vivid Orange
  "#64748b", // Slate
];

export const PieChartView: React.FC<PieChartViewProps> = ({ data, chartType }) => {
  const isDonut = chartType === ChartType.DONUT;

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for Pie/Donut chart.</div>;
  }

  const total = data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const renderLegendText = (value: string) => {
    const item = data.find((d) => d.name === value);
    const count = item ? item.value : 0;
    return (
      <span className="text-xs font-semibold text-[var(--text-primary)] ml-1">
        {value} <span className="text-[var(--text-secondary)] font-normal">({count})</span>
      </span>
    );
  };

  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={isDonut ? 75 : 0}
            outerRadius={120}
            paddingAngle={3}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} stroke="var(--bg-card)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: any) => [`${val.toLocaleString()} (${total > 0 ? ((val / total) * 100).toFixed(1) : 0}%)`, "Value"]}
            contentStyle={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-color)",
              borderRadius: "12px",
              color: "var(--text-primary)"
            }}
          />
          <Legend formatter={renderLegendText} layout="horizontal" align="center" verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
