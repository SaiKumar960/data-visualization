import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartType } from "../../types";

interface LineChartViewProps {
  data: any[];
  chartType: ChartType;
  xField: string;
  yField?: string;
  seriesKeys?: string[] | null;
}

const VIBRANT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#06b6d4",
];

export const LineChartView: React.FC<LineChartViewProps> = ({
  data,
  chartType,
  xField,
  yField = "value",
  seriesKeys,
}) => {
  const isArea = chartType === ChartType.AREA;
  const isMulti = seriesKeys && seriesKeys.length > 0;

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-sm">No data available for time series.</div>;
  }

  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        {isArea ? (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
            <XAxis dataKey={xField} stroke="var(--text-secondary)" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
                borderRadius: "12px",
                color: "var(--text-primary)"
              }}
            />
            {isMulti ? (
              seriesKeys.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]}
                  stroke={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]}
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                />
              ))
            ) : (
              <Area type="monotone" dataKey={yField} fill="url(#areaGradient)" stroke="#6366f1" strokeWidth={3} />
            )}
            {isMulti && <Legend wrapperStyle={{ paddingTop: 10 }} />}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
            <XAxis dataKey={xField} stroke="var(--text-secondary)" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
                borderRadius: "12px",
                color: "var(--text-primary)"
              }}
            />
            {isMulti ? (
              seriesKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                />
              ))
            ) : (
              <Line type="monotone" dataKey={yField} stroke="#6366f1" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
            )}
            {isMulti && <Legend wrapperStyle={{ paddingTop: 10 }} />}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
