import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Background3D } from "./components/Background3D";
import { KpiSummaryCards } from "./components/KpiSummaryCards";
import { DashboardGrid } from "./components/DashboardGrid";
import { FieldExplorer } from "./components/FieldExplorer";
import { RecommendedCharts } from "./components/RecommendedCharts";
import { ChartBuilder } from "./components/ChartBuilder";
import { FilterPanel } from "./components/FilterPanel";
import { DataTable } from "./components/DataTable";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { Footer } from "./components/Footer";

import type {
  UploadResponse,
  FieldProfile,
  Recommendation,
  FilterConfig,
  UnavailableChartReason,
} from "./types";
import { FieldType } from "./types";
import {
  uploadExcelFile,
  selectSheet,
  fetchFieldProfiles,
  fetchRecommendations,
  fetchUnavailableCharts,
  overrideFieldType,
  resetSession,
} from "./api/apiClient";

import { FileSpreadsheet, Upload, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export function App() {
  const [session, setSession] = useState<UploadResponse | null>(null);
  const [profiles, setProfiles] = useState<FieldProfile[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [unavailableCharts, setUnavailableCharts] = useState<UnavailableChartReason[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<Record<string, FilterConfig>>({});

  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [active3DScene, setActive3DScene] = useState<number>(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const uploadRes = await uploadExcelFile(file);
      setSession(uploadRes);

      const [pRes, rRes, uRes] = await Promise.all([
        fetchFieldProfiles(uploadRes.session_id),
        fetchRecommendations(uploadRes.session_id),
        fetchUnavailableCharts(uploadRes.session_id),
      ]);

      setProfiles(pRes);
      setRecommendations(rRes);
      setUnavailableCharts(uRes);
      setFilters({});
      setActiveRecommendation(rRes.length > 0 ? rRes[0] : null);
    } catch (err: any) {
      setErrorMessage(err.message || "Error processing file.");
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!session) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const sheetRes = await selectSheet(session.session_id, sheetName);
      setSession({
        ...session,
        active_sheet: sheetName,
        row_count: sheetRes.row_count,
        column_count: sheetRes.column_count,
      });

      const [pRes, rRes, uRes] = await Promise.all([
        fetchFieldProfiles(session.session_id),
        fetchRecommendations(session.session_id),
        fetchUnavailableCharts(session.session_id),
      ]);

      setProfiles(pRes);
      setRecommendations(rRes);
      setUnavailableCharts(uRes);
      setFilters({});
      setActiveRecommendation(rRes.length > 0 ? rRes[0] : null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to switch sheet.");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeOverride = async (fieldName: string, newType: FieldType) => {
    if (!session) return;
    try {
      await overrideFieldType(session.session_id, fieldName, newType);
      const [pRes, rRes, uRes] = await Promise.all([
        fetchFieldProfiles(session.session_id),
        fetchRecommendations(session.session_id),
        fetchUnavailableCharts(session.session_id),
      ]);
      setProfiles(pRes);
      setRecommendations(rRes);
      setUnavailableCharts(uRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to override field type.");
    }
  };

  const handleReset = async () => {
    if (session) {
      await resetSession(session.session_id).catch(() => {});
    }
    setSession(null);
    setProfiles([]);
    setRecommendations([]);
    setUnavailableCharts([]);
    setFilters({});
    setActiveRecommendation(null);
    setErrorMessage(null);
  };

  const handleFilterChange = (fieldName: string, config: FilterConfig | null) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (config === null) {
        delete next[fieldName];
      } else {
        next[fieldName] = config;
      }
      return next;
    });
  };

  const handleClearAllFilters = () => {
    setFilters({});
  };

  const handleCustomizeRecommendation = (rec: Recommendation) => {
    setActiveRecommendation(rec);
    setTimeout(() => {
      document.getElementById("custom-chart-builder")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto transition-colors duration-200">
      <Background3D
        theme={theme}
        activeSceneIndex={active3DScene}
        onSceneChange={(idx) => setActive3DScene(idx)}
      />

      <Header
        session={session}
        onFileUpload={handleFileUpload}
        onSheetSelect={handleSheetSelect}
        onReset={handleReset}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        loading={loading}
        active3DScene={active3DScene}
        on3DSceneSelect={(idx) => setActive3DScene(idx)}
      />

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {!session ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`card p-12 text-center my-8 flex flex-col items-center justify-center border-2 border-dashed transition ${
            dragActive ? "border-blue-500 bg-blue-500/5" : "border-[var(--border-color)]"
          }`}
        >
          <div className="p-4 bg-blue-600/15 text-blue-500 rounded-2xl mb-4 border border-blue-500/30">
            <FileSpreadsheet className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Upload any Excel File to Visualize
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mb-6">
            Drag & drop an Excel workbook (<code className="text-blue-500 font-semibold">.xlsx</code> or <code className="text-blue-500 font-semibold">.xls</code>) here, or browse from your computer. Field types are automatically inferred from data values.
          </p>

          <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg transition cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Select Excel File</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </label>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl">
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              <h3 className="font-bold text-xs text-[var(--text-primary)] mb-1">Zero Hardcoded Domain</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Works for sales, HR, science, finance, or student marks without column assumptions.</p>
            </div>
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <ShieldCheck className="w-5 h-5 text-blue-500 mb-2" />
              <h3 className="font-bold text-xs text-[var(--text-primary)] mb-1">100% Local Privacy</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">No cloud uploads, no telemetry, no AI APIs. Runs entirely on your local machine.</p>
            </div>
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-500 mb-2" />
              <h3 className="font-bold text-xs text-[var(--text-primary)] mb-1">Smart Profiling</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Detects identifiers, dates, ranges, missing values, outliers, and dynamic chart rules.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Executive KPI Summary Cards */}
          <KpiSummaryCards sessionId={session.session_id} filters={filters} />

          {/* Executive Multi-Chart Dashboard Grid */}
          <DashboardGrid
            sessionId={session.session_id}
            recommendations={recommendations}
            filters={filters}
            onCustomizeRecommendation={handleCustomizeRecommendation}
          />

          {/* Field Explorer */}
          <FieldExplorer profiles={profiles} onTypeOverride={handleTypeOverride} />

          {/* Recommendations List & Guardrails */}
          <RecommendedCharts
            recommendations={recommendations}
            unavailable={unavailableCharts}
            onSelectRecommendation={handleCustomizeRecommendation}
          />

          {/* Global Data Filter Controls */}
          <FilterPanel
            profiles={profiles}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAllFilters={handleClearAllFilters}
            filteredCount={session.row_count}
            totalCount={session.row_count}
          />

          {/* Custom Chart Builder */}
          <ChartBuilder
            sessionId={session.session_id}
            profiles={profiles}
            filters={filters}
            activeRecommendation={activeRecommendation}
          />

          {/* Data Table */}
          <DataTable
            sessionId={session.session_id}
            filename={session.filename}
            filters={filters}
          />

          {/* Data Quality Report */}
          <DataQualityPanel sessionId={session.session_id} />
        </>
      )}

      <Footer />
    </div>
  );
}

export default App;
