import React from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ScatterChartViewProps {
  data: any[];
  xField: string;
  yField: string;
  metadata?: Record<string, any>;
}

export const ScatterChartView: React.FC<ScatterChartViewProps> = ({ data, xField, yField, metadata }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for Scatter plot.</div>;
  }

  const trendline = metadata?.trendline;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xField} name={xField} type="number" stroke="#94a3b8" label={{ value: xField, position: "insideBottom", offset: -25, fill: "#94a3b8" }} />
            <YAxis dataKey={yField} name={yField} type="number" stroke="#94a3b8" label={{ value: yField, angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Points" data={data} fill="#3b82f6" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {trendline && (
        <div className="mt-2 text-xs bg-[var(--bg-primary)] px-4 py-2 rounded-lg border border-[var(--border-color)] text-slate-300">
          <span className="font-semibold text-blue-400">Linear Trendline: </span>
          <span>y = {trendline.slope}x {trendline.intercept >= 0 ? "+" : ""} {trendline.intercept}</span>
          <span className="ml-3 font-semibold text-emerald-400">R² = {trendline.r_squared}</span>
        </div>
      )}
    </div>
  );
};
