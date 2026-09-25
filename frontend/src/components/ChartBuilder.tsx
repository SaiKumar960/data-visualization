import React, { useState, useEffect } from "react";
import type { FieldProfile, ChartDataResponse, FilterConfig } from "../types";
import { FieldType, ChartType } from "../types";
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
import { Sliders, RefreshCw, AlertCircle, Box } from "lucide-react";

interface ChartBuilderProps {
  sessionId: string;
  profiles: FieldProfile[];
  filters: Record<string, FilterConfig>;
  activeRecommendation?: any;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  sessionId,
  profiles,
  filters,
  activeRecommendation,
}) => {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(ChartType.BAR);
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [groupField, setGroupField] = useState<string>("");
  const [aggregation, setAggregation] = useState<string>("sum");
  const [topN, setTopN] = useState<number>(10);
  const [binCount, setBinCount] = useState<number>(10);
  const [multiNumeric, setMultiNumeric] = useState<string[]>([]);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);

  const [chartResponse, setChartResponse] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categoricals = profiles.filter((p) => p.effective_type === FieldType.CATEGORICAL || p.effective_type === FieldType.BOOLEAN);
  const numerics = profiles.filter((p) => p.effective_type === FieldType.INTEGER || p.effective_type === FieldType.DECIMAL);

  useEffect(() => {
    if (activeRecommendation) {
      setSelectedChartType(activeRecommendation.chart_type);
      if (activeRecommendation.fields.x) setXField(activeRecommendation.fields.x);
      if (activeRecommendation.fields.y) setYField(activeRecommendation.fields.y);
      if (activeRecommendation.fields.group) setGroupField(activeRecommendation.fields.group);
      if (activeRecommendation.default_aggregation) setAggregation(activeRecommendation.default_aggregation);
      if (activeRecommendation.top_n) setTopN(activeRecommendation.top_n);
    } else {
      if (categoricals.length > 0 && !xField) setXField(categoricals[0].name);
      if (numerics.length > 0 && !yField) setYField(numerics[0].name);
      if (numerics.length >= 3 && multiNumeric.length === 0) setMultiNumeric(numerics.map((p) => p.name));
    }
  }, [activeRecommendation, profiles]);

  const loadChartData = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    try {
      const fieldsConfig: Record<string, any> = {};
      if (xField) fieldsConfig.x = xField;
      if (yField) fieldsConfig.y = yField;
      if (groupField) fieldsConfig.group = groupField;
      if (selectedChartType === ChartType.CORRELATION_MATRIX) {
        fieldsConfig.multi_numeric = multiNumeric;
      }

      const res = await fetchChartData({
        session_id: sessionId,
        chart_type: selectedChartType,
        fields: fieldsConfig,
        aggregation: aggregation,
        filters: filters,
        top_n: topN,
        bin_count: binCount,
      });

      setChartResponse(res);
    } catch (err: any) {
      setError(err.message || "Failed to load chart data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, [sessionId, selectedChartType, xField, yField, groupField, aggregation, topN, binCount, multiNumeric, filters]);

  const renderChartCanvas = () => {
    if (loading) {
      return (
        <div className="h-[400px] flex items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Computing aggregated visualization...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-[400px] flex flex-col items-center justify-center text-amber-400 gap-2 p-6 text-center">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      );
    }

    if (!chartResponse || !chartResponse.data || chartResponse.data.length === 0) {
      return (
        <div className="h-[400px] flex items-center justify-center text-slate-400">
          Select appropriate axes to render chart.
        </div>
      );
    }

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
          return <ThreeBarChart data={chartResponse.data} xField={xField} yField={yField || "value"} />;
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
            yField={yField || "value"}
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
            yField={yField || "value"}
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
        return <div>Unsupported chart view</div>;
    }
  };

  return (
    <div id="custom-chart-builder" className="card-3d mb-6 p-4 scroll-mt-6">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Custom Chart Builder</h2>
        </div>

        <button
          onClick={() => setIs3DMode(!is3DMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
            is3DMode
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
              : "bg-[var(--bg-primary)] text-slate-400 hover:text-blue-400 border-[var(--border-color)]"
          }`}
          title={is3DMode ? "Switch to 2D View" : "Render in Interactive 3D WebGL"}
        >
          <Box className={`w-4 h-4 ${is3DMode ? "text-amber-400" : "text-slate-400"}`} />
          <span>{is3DMode ? "3D WebGL Active" : "3D Mode"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Chart Type</label>
          <select
            value={selectedChartType}
            onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            <option value={ChartType.BAR}>Bar Chart</option>
            <option value={ChartType.COLUMN}>Column Chart</option>
            <option value={ChartType.HORIZONTAL_BAR}>Horizontal Bar</option>
            <option value={ChartType.STACKED_BAR}>Stacked Bar</option>
            <option value={ChartType.GROUPED_BAR}>Grouped Bar</option>
            <option value={ChartType.LINE}>Line Chart</option>
            <option value={ChartType.AREA}>Area Chart</option>
            <option value={ChartType.PIE}>Pie Chart</option>
            <option value={ChartType.DONUT}>Donut Chart</option>
            <option value={ChartType.SCATTER}>Scatter Plot</option>
            <option value={ChartType.HISTOGRAM}>Histogram</option>
            <option value={ChartType.BOX_PLOT}>Box Plot</option>
            <option value={ChartType.HEATMAP}>2D Heatmap</option>
            <option value={ChartType.CORRELATION_MATRIX}>Correlation Matrix</option>
            <option value={ChartType.TOP_N_BAR}>Top N Bar</option>
          </select>
        </div>

        {[ChartType.CORRELATION_MATRIX].includes(selectedChartType) ? null : (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {selectedChartType === ChartType.LINE || selectedChartType === ChartType.AREA
                ? "Time Field (X-Axis)"
                : selectedChartType === ChartType.SCATTER || selectedChartType === ChartType.HISTOGRAM
                ? "Numeric Field"
                : "Category Field (X-Axis)"}
            </label>
            <select
              value={xField}
              onChange={(e) => setXField(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="">Select Field...</option>
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.effective_type})
                </option>
              ))}
            </select>
          </div>
        )}

        {[ChartType.HISTOGRAM, ChartType.CORRELATION_MATRIX].includes(selectedChartType) ? null : (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Measure / Value Field (Y-Axis)
            </label>
            <select
              value={yField}
              onChange={(e) => setYField(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="">Count of Cases / Rows (Default)</option>
              {numerics.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.effective_type})
                </option>
              ))}
            </select>
          </div>
        )}

        {[ChartType.SCATTER, ChartType.HISTOGRAM, ChartType.BOX_PLOT, ChartType.CORRELATION_MATRIX].includes(
          selectedChartType
        ) ? null : (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Aggregation</label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="sum">Sum</option>
              <option value="average">Average / Mean</option>
              <option value="count">Count of Cases</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="median">Median</option>
            </select>
          </div>
        )}

        {[ChartType.GROUPED_BAR, ChartType.STACKED_BAR, ChartType.HEATMAP, ChartType.LINE, ChartType.AREA].includes(
          selectedChartType
        ) && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Secondary Category (Group-by)
            </label>
            <select
              value={groupField}
              onChange={(e) => setGroupField(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="">Select Grouping...</option>
              {categoricals.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedChartType === ChartType.HISTOGRAM && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Bin Count ({binCount})
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        )}

        {selectedChartType === ChartType.TOP_N_BAR && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Top-N Limit</label>
            <input
              type="number"
              min="3"
              max="50"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 min-h-[420px]">
        {renderChartCanvas()}
      </div>
    </div>
  );
};
