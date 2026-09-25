import React, { useState } from "react";
import type { FieldProfile } from "../types";
import { FieldType } from "../types";
import { Search, ChevronDown, ChevronUp, AlertTriangle, Hash, Calendar, Tag, FileText, CheckCircle } from "lucide-react";

interface FieldExplorerProps {
  profiles: FieldProfile[];
  onTypeOverride: (fieldName: string, newType: FieldType) => void;
}

export const FieldExplorer: React.FC<FieldExplorerProps> = ({ profiles, onTypeOverride }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const filteredProfiles = profiles.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCard = (fieldName: string) => {
    setExpandedCards((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const getTypeIcon = (type: FieldType) => {
    switch (type) {
      case FieldType.INTEGER:
      case FieldType.DECIMAL:
        return <Hash className="w-4 h-4 text-emerald-400" />;
      case FieldType.DATE:
      case FieldType.DATETIME:
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case FieldType.CATEGORICAL:
      case FieldType.BOOLEAN:
        return <Tag className="w-4 h-4 text-amber-400" />;
      case FieldType.IDENTIFIER:
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
      case FieldType.TEXT:
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="card mb-6 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-[var(--bg-secondary)] flex items-center justify-between cursor-pointer border-b border-[var(--border-color)] select-none"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Field Explorer ({profiles.length} Columns Profiled)
          </h2>
          <span className="text-xs text-[var(--text-secondary)] font-normal hidden sm:inline">
            Inferred from actual value analysis
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4">
          <div className="mb-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search profiled columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfiles.map((p) => {
              const isCardExpanded = expandedCards[p.name] ?? false;

              return (
                <div
                  key={p.name}
                  className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between hover:border-blue-500/50 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(p.effective_type)}
                        <h3 className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[160px]" title={p.name}>
                          {p.name}
                        </h3>
                      </div>

                      <select
                        value={p.effective_type}
                        onChange={(e) => onTypeOverride(p.name, e.target.value as FieldType)}
                        className="text-xs px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md font-semibold text-blue-400 focus:outline-none cursor-pointer"
                        title="Override auto-detected field type"
                      >
                        {Object.values(FieldType).map((t) => (
                          <option key={t} value={t}>
                            {t} {t === p.detected_type ? "(Auto)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {p.ambiguity_warning && (
                      <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{p.ambiguity_warning}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] mb-3">
                      <div>
                        <span>Unique: </span>
                        <strong className="text-[var(--text-primary)]">{p.unique_count.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>Missing: </span>
                        <strong className={p.missing_count > 0 ? "text-amber-400" : "text-[var(--text-primary)]"}>
                          {p.missing_count} ({p.missing_pct}%)
                        </strong>
                      </div>

                      {p.min_value !== undefined && p.min_value !== null ? (
                        <>
                          <div>
                            <span>Min: </span>
                            <strong className="text-[var(--text-primary)]">{String(p.min_value)}</strong>
                          </div>
                          <div>
                            <span>Max: </span>
                            <strong className="text-[var(--text-primary)]">{String(p.max_value ?? "-")}</strong>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <button
                      onClick={() => toggleCard(p.name)}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCardExpanded ? "Hide detailed statistics" : "Show detailed statistics"}
                      {isCardExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isCardExpanded && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-2">
                        {p.mean !== undefined && p.mean !== null && (
                          <div className="flex justify-between">
                            <span>Mean / Median:</span>
                            <span className="text-[var(--text-primary)]">{p.mean} / {p.median}</span>
                          </div>
                        )}
                        {p.std_dev !== undefined && p.std_dev !== null && (
                          <div className="flex justify-between">
                            <span>Std Dev:</span>
                            <span className="text-[var(--text-primary)]">{p.std_dev}</span>
                          </div>
                        )}
                        {p.has_outliers && (
                          <div className="flex justify-between text-amber-400">
                            <span>IQR Outliers:</span>
                            <span>{p.outlier_count} detected</span>
                          </div>
                        )}
                        {p.frequency_table && p.frequency_table.length > 0 && (
                          <div>
                            <div className="font-semibold mb-1 text-[var(--text-primary)]">Top Values:</div>
                            <div className="space-y-1">
                              {p.frequency_table.slice(0, 4).map((f, i) => (
                                <div key={i} className="flex justify-between text-[11px]">
                                  <span className="truncate max-w-[120px]">{String(f.value)}</span>
                                  <span>{f.count} ({f.percentage}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {p.sample_values && (
                          <div>
                            <div className="font-semibold mb-1 text-[var(--text-primary)]">Sample Values:</div>
                            <p className="text-[11px] italic truncate">{p.sample_values.join(", ")}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
