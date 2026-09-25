import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface HistogramViewProps {
  data: any[];
}

export const HistogramView: React.FC<HistogramViewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No bin data available for Histogram.</div>;
  }

  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="bin" stroke="#94a3b8" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
