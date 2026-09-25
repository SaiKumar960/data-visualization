import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { ChartType } from "../../types";

interface BarChartViewProps {
  data: any[];
  chartType: ChartType;
  xField: string;
  yField?: string;
  seriesKeys?: string[] | null;
}

const VIBRANT_COLORS = [
  "#6366f1", // Vivid Indigo
  "#f59e0b", // Vibrant Amber
  "#10b981", // Emerald Teal
  "#3b82f6", // Sky Blue
  "#ec4899", // Vivid Pink
  "#8b5cf6", // Deep Purple
  "#06b6d4", // Bright Cyan
  "#f97316", // Vivid Orange
  "#14b8a6", // Teal
  "#e11d48", // Rose Red
];

export const BarChartView: React.FC<BarChartViewProps> = ({
  data,
  chartType,
  xField,
  yField = "value",
  seriesKeys,
}) => {
  const isHorizontal = chartType === ChartType.HORIZONTAL_BAR;
  const isGrouped = seriesKeys && seriesKeys.length > 0;
  const isStacked = chartType === ChartType.STACKED_BAR;

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for this chart configuration.</div>;
  }

  return (
    <div className="w-full h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        {isHorizontal ? (
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
            <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
            <YAxis dataKey={xField} type="category" stroke="var(--text-secondary)" width={120} tick={{ fontSize: 11 }} interval={0} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
              }}
            />
            {isGrouped ? (
              seriesKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]}
                  radius={isStacked ? [0, 0, 0, 0] : [0, 6, 6, 0]}
                  stackId={isStacked ? "a" : undefined}
                />
              ))
            ) : (
              <Bar dataKey={yField} radius={[0, 6, 6, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                ))}
              </Bar>
            )}
            {isGrouped && <Legend wrapperStyle={{ paddingTop: 10 }} />}
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 65 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
            <XAxis dataKey={xField} stroke="var(--text-secondary)" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} height={60} />
            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
              }}
            />
            {isGrouped ? (
              seriesKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]}
                  radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  stackId={isStacked ? "a" : undefined}
                />
              ))
            ) : (
              <Bar dataKey={yField} radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                ))}
              </Bar>
            )}
            {isGrouped && <Legend wrapperStyle={{ paddingTop: 10 }} />}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
