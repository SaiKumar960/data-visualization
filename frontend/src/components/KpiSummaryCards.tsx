import React, { useState, useEffect } from "react";
import type { KpiMetric, FilterConfig } from "../types";
import { fetchKpiSummary } from "../api/apiClient";
import { Layers, DollarSign, TrendingUp, Award, Activity } from "lucide-react";

interface KpiSummaryCardsProps {
  sessionId: string;
  filters: Record<string, FilterConfig>;
}

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({ sessionId, filters }) => {
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setLoading(true);
      fetchKpiSummary(sessionId, filters)
        .then((res) => setKpis(res.kpis))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionId, filters]);

  if (!sessionId || kpis.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "total":
        return <Layers className="w-5 h-5 text-indigo-500" />;
      case "sum":
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case "average":
        return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case "top":
        return <Award className="w-5 h-5 text-purple-500" />;
      default:
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAccentBg = (color: string) => {
    switch (color) {
      case "indigo":
        return "bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 border-indigo-500/40 shadow-indigo-500/10";
      case "emerald":
        return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-emerald-500/40 shadow-emerald-500/10";
      case "amber":
        return "bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-amber-500/40 shadow-amber-500/10";
      case "purple":
        return "bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-purple-500/40 shadow-purple-500/10";
      default:
        return "bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/40 shadow-blue-500/10";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="card-3d p-5 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl shadow-lg transition flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition duration-500" />
          
          <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {kpi.label}
            </span>
            <div className={`p-2.5 rounded-xl border shadow-md ${getAccentBg(kpi.accent_color)}`}>
              {getIcon(kpi.icon_type)}
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tight mb-1 truncate drop-shadow-sm">
              {loading ? "..." : kpi.value}
            </div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 truncate">
              <span>{kpi.subtext}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
