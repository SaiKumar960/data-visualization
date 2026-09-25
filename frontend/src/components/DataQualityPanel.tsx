import React, { useState, useEffect } from "react";
import type { DataQualityReport } from "../types";
import { fetchDataQuality } from "../api/apiClient";
import { ShieldCheck, AlertTriangle, Info, AlertOctagon, ChevronDown, ChevronUp, Copy } from "lucide-react";

interface DataQualityPanelProps {
  sessionId: string;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({ sessionId }) => {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [showDupPreview, setShowDupPreview] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchDataQuality(sessionId)
        .then(setReport)
        .catch(console.error);
    }
  }, [sessionId]);

  if (!report) return null;

  const getHealthBadgeClass = (score: number) => {
    if (score >= 85) return "badge-green";
    if (score >= 60) return "badge-warning";
    return "badge-danger";
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "error":
        return <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="card mb-6 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-[var(--bg-secondary)] flex items-center justify-between cursor-pointer border-b border-[var(--border-color)] select-none"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Data Quality & Integrity Audit
          </h2>
          <span className={`badge ${getHealthBadgeClass(report.health_score)} font-bold text-xs`}>
            Health Score: {report.health_score} / 100
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <span className="text-xs text-[var(--text-secondary)] block mb-1">Duplicate Rows</span>
              <div className="flex items-center justify-between">
                <strong className={report.duplicate_rows_count > 0 ? "text-amber-400 text-lg font-bold" : "text-[var(--text-primary)] text-lg font-bold"}>
                  {report.duplicate_rows_count}
                </strong>
                {report.duplicate_rows_count > 0 && (
                  <button
                    onClick={() => setShowDupPreview(!showDupPreview)}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{showDupPreview ? "Hide" : "Preview"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <span className="text-xs text-[var(--text-secondary)] block mb-1">Empty Columns</span>
              <strong className={report.empty_columns.length > 0 ? "text-red-400 text-lg font-bold" : "text-[var(--text-primary)] text-lg font-bold"}>
                {report.empty_columns.length}
              </strong>
            </div>

            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <span className="text-xs text-[var(--text-secondary)] block mb-1">Constant Columns</span>
              <strong className={report.constant_columns.length > 0 ? "text-amber-400 text-lg font-bold" : "text-[var(--text-primary)] text-lg font-bold"}>
                {report.constant_columns.length}
              </strong>
            </div>

            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
              <span className="text-xs text-[var(--text-secondary)] block mb-1">Suspected IDs</span>
              <strong className="text-purple-400 text-lg font-bold">
                {report.suspected_identifiers.length}
              </strong>
            </div>
          </div>

          {showDupPreview && report.duplicate_preview.length > 0 && (
            <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-amber-500/30 rounded-xl">
              <div className="font-bold text-xs text-amber-400 mb-2">Duplicate Rows Sample Preview:</div>
              <div className="overflow-x-auto text-[11px] font-mono text-slate-300">
                <pre>{JSON.stringify(report.duplicate_preview, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Detected Quality Audit Logs ({report.issues.length})
            </h3>

            {report.issues.length === 0 ? (
              <p className="text-xs text-emerald-400">No data quality issues detected in this sheet!</p>
            ) : (
              report.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex items-start gap-3"
                >
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {issue.field && (
                        <span className="font-bold text-xs text-[var(--text-primary)]">{issue.field}</span>
                      )}
                      <span className={`badge ${issue.severity === "error" ? "badge-danger" : issue.severity === "warning" ? "badge-warning" : "badge-blue"} text-[10px]`}>
                        {issue.issue_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{issue.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
