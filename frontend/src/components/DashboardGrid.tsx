import React, { useState, useEffect } from "react";
import type { Recommendation, FilterConfig, ChartDataResponse } from "../types";
import { fetchChartData } from "../api/apiClient";
import { BarChartView } from "./Charts/BarChartView";
import { LineChartView } from "./Charts/LineChartView";
import { PieChartView } from "./Charts/PieChartView";
import { ScatterChartView } from "./Charts/ScatterChartView";
import { HistogramView } from "./Charts/HistogramView";
import { BoxPlotView } from "./Charts/BoxPlotView";
import { HeatmapView } from "./Charts/HeatmapView";
import { CorrelationMatrixView } from "./Charts/CorrelationMatrixView";
import { ThreeBarChart } from "./Charts/3D/ThreeBarChart";
import { ThreePieChart } from "./Charts/3D/ThreePieChart";
import { ThreeScatterPlot } from "./Charts/3D/ThreeScatterPlot";
import { ThreeSurfacePlot } from "./Charts/3D/ThreeSurfacePlot";
import { LayoutGrid, Sliders, RefreshCw, Info, Box } from "lucide-react";
import { ChartType } from "../types";

interface ChartCardProps {
  rec: Recommendation;
  sessionId: string;
  filters: Record<string, FilterConfig>;
  onCustomize: (rec: Recommendation) => void;
}

const ChartCard: React.FC<ChartCardProps> = ({ rec, sessionId, filters, onCustomize }) => {
  const [chartResponse, setChartResponse] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchChartData({
      session_id: sessionId,
      chart_type: rec.chart_type,
      fields: rec.fields,
      aggregation: rec.default_aggregation,
      filters: filters,
      top_n: rec.top_n ?? undefined,
    })
      .then((res) => {
        if (isMounted) setChartResponse(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to render chart.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rec, sessionId, filters]);

  const renderCanvas = () => {
    if (loading) {
      return (
        <div className="h-[300px] flex items-center justify-center text-[var(--text-secondary)] gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-xs">Loading visualization...</span>
        </div>
      );
    }

    if (error || !chartResponse || !chartResponse.data || chartResponse.data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs">
          No records matching current configuration.
        </div>
      );
    }

    const xField = rec.fields.x || "";
    const yField = rec.fields.y || "value";

    if (is3DMode) {
      switch (chartResponse.chart_type) {
        case ChartType.PIE:
        case ChartType.DONUT:
          return <ThreePieChart data={chartResponse.data} nameField={xField || "name"} valueField={yField || "value"} />;
        case ChartType.SCATTER:
          return <ThreeScatterPlot data={chartResponse.data} xField={xField} yField={yField} />;
        case ChartType.HEATMAP:
        case ChartType.CORRELATION_MATRIX:
          return <ThreeSurfacePlot data={chartResponse.data} seriesKeys={chartResponse.series_keys || undefined} />;
        default:
          return <ThreeBarChart data={chartResponse.data} xField={xField} yField={yField} />;
      }
    }

    switch (chartResponse.chart_type) {
      case ChartType.BAR:
      case ChartType.COLUMN:
      case ChartType.HORIZONTAL_BAR:
      case ChartType.GROUPED_BAR:
      case ChartType.STACKED_BAR:
      case ChartType.TOP_N_BAR:
        return (
          <BarChartView
            data={chartResponse.data}
            chartType={chartResponse.chart_type}
            xField={xField}
            yField={yField}
            seriesKeys={chartResponse.series_keys}
          />
        );

      case ChartType.LINE:
      case ChartType.AREA:
        return (
          <LineChartView
            data={chartResponse.data}
            chartType={chartResponse.chart_type}
            xField={xField}
            yField={yField}
            seriesKeys={chartResponse.series_keys}
          />
        );

      case ChartType.PIE:
      case ChartType.DONUT:
        return <PieChartView data={chartResponse.data} chartType={chartResponse.chart_type} />;

      case ChartType.SCATTER:
        return <ScatterChartView data={chartResponse.data} xField={xField} yField={yField} metadata={chartResponse.metadata} />;

      case ChartType.HISTOGRAM:
        return <HistogramView data={chartResponse.data} />;

      case ChartType.BOX_PLOT:
        return <BoxPlotView data={chartResponse.data} />;

      case ChartType.HEATMAP:
        return <HeatmapView data={chartResponse.data} seriesKeys={chartResponse.series_keys} />;

      case ChartType.CORRELATION_MATRIX:
        return <CorrelationMatrixView data={chartResponse.data} seriesKeys={chartResponse.series_keys} />;

      default:
        return null;
    }
  };

  return (
    <div className="card-3d p-5 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl shadow-lg transition flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              {rec.title}
            </h3>
            <span className="badge badge-blue text-[10px] uppercase font-bold tracking-wider">
              {rec.chart_type.replace("_", " ")}
            </span>
            {is3DMode && (
              <span className="badge badge-warning text-[10px] uppercase font-bold tracking-wider animate-pulse">
                3D WebGL
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
            {rec.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              is3DMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                : "bg-[var(--bg-primary)] text-slate-400 hover:text-blue-400 border-[var(--border-color)]"
            }`}
            title={is3DMode ? "Switch to 2D View" : "Render in Interactive 3D WebGL"}
          >
            <Box className={`w-3.5 h-3.5 ${is3DMode ? "text-amber-400" : "text-slate-400"}`} />
            <span>{is3DMode ? "3D Active" : "3D Mode"}</span>
          </button>

          <button
            onClick={() => onCustomize(rec)}
            className="px-2.5 py-1 bg-[var(--bg-primary)] hover:bg-blue-600/10 text-slate-400 hover:text-blue-500 border border-[var(--border-color)] rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Customize in Chart Builder"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-500" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      <div className="w-full min-h-[320px] bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] p-2 flex items-center justify-center">
        {renderCanvas()}
      </div>

      <div className="mt-3 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium truncate">
        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="truncate">{rec.reasoning}</span>
      </div>
    </div>
  );
};

interface DashboardGridProps {
  sessionId: string;
  recommendations: Recommendation[];
  filters: Record<string, FilterConfig>;
  onCustomizeRecommendation: (rec: Recommendation) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  sessionId,
  recommendations,
  filters,
  onCustomizeRecommendation,
}) => {
  if (!sessionId || recommendations.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
        <LayoutGrid className="w-5 h-5 text-indigo-500" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Executive Data Dashboard
        </h2>
        <span className="text-xs text-[var(--text-secondary)] font-normal hidden sm:inline">
          Live rendered multi-chart layout
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recommendations.slice(0, 6).map((rec) => (
          <ChartCard
            key={rec.id}
            rec={rec}
            sessionId={sessionId}
            filters={filters}
            onCustomize={onCustomizeRecommendation}
          />
        ))}
      </div>
    </div>
  );
};
