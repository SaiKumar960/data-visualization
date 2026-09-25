import React, { useState } from "react";
import type { FieldProfile, FilterConfig } from "../types";
import { FieldType } from "../types";
import { Filter, XCircle, Search, ChevronDown, ChevronUp } from "lucide-react";

interface FilterPanelProps {
  profiles: FieldProfile[];
  filters: Record<string, FilterConfig>;
  onFilterChange: (fieldName: string, config: FilterConfig | null) => void;
  onClearAllFilters: () => void;
  filteredCount?: number;
  totalCount?: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  profiles,
  filters,
  onFilterChange,
  onClearAllFilters,
  filteredCount,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [catSearch, setCatSearch] = useState<Record<string, string>>({});

  const activeFilterCount = Object.keys(filters).length;

  const handleCategoricalToggle = (colName: string, val: string) => {
    const currentSelected = filters[colName]?.selected_values || [];
    const valStr = String(val);
    let updated: string[];

    if (currentSelected.includes(valStr)) {
      updated = currentSelected.filter((v) => String(v) !== valStr);
    } else {
      updated = [...currentSelected, valStr];
    }

    if (updated.length === 0) {
      onFilterChange(colName, null);
    } else {
      onFilterChange(colName, { ...filters[colName], selected_values: updated });
    }
  };

  const handleNumericMinChange = (colName: string, minVal: number) => {
    onFilterChange(colName, { ...filters[colName], min_val: minVal });
  };

  const handleNumericMaxChange = (colName: string, maxVal: number) => {
    onFilterChange(colName, { ...filters[colName], max_val: maxVal });
  };

  const handleDateChange = (colName: string, key: "start_date" | "end_date", value: string) => {
    onFilterChange(colName, { ...filters[colName], [key]: value || null });
  };

  return (
    <div className="card mb-6 overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-[var(--bg-secondary)] flex items-center justify-between cursor-pointer border-b border-[var(--border-color)] select-none"
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Global Data Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="badge badge-blue">{activeFilterCount} active</span>
          )}
          {filteredCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-[var(--text-secondary)] font-semibold">
              ({filteredCount.toLocaleString()} / {totalCount.toLocaleString()} records active)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAllFilters();
              }}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear all filters</span>
            </button>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const currentFilter = filters[p.name] || {};

            if (p.effective_type === FieldType.CATEGORICAL || p.effective_type === FieldType.BOOLEAN) {
              const freqItems = p.frequency_table || [];
              const search = catSearch[p.name] || "";
              const filteredFreq = freqItems.filter((f) =>
                String(f.value).toLowerCase().includes(search.toLowerCase())
              );
              const selectedVals = currentFilter.selected_values || [];

              return (
                <div key={p.name} className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[140px]" title={p.name}>
                      {p.name}
                    </span>
                    {selectedVals.length > 0 && (
                      <button
                        onClick={() => onFilterChange(p.name, null)}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {freqItems.length > 5 && (
                    <div className="mb-2 relative">
                      <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search values..."
                        value={search}
                        onChange={(e) => setCatSearch({ ...catSearch, [p.name]: e.target.value })}
                        className="w-full pl-7 pr-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {filteredFreq.map((item, idx) => {
                      const valStr = String(item.value);
                      const isChecked = selectedVals.includes(valStr);

                      return (
                        <label
                          key={idx}
                          className="flex items-center justify-between p-1 hover:bg-[var(--bg-card)] rounded cursor-pointer text-[var(--text-secondary)]"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCategoricalToggle(p.name, valStr)}
                              className="rounded border-[var(--border-color)] text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate text-[var(--text-primary)]">{valStr}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{item.count}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (p.effective_type === FieldType.INTEGER || p.effective_type === FieldType.DECIMAL) {
              const minVal = currentFilter.min_val ?? (p.min_value as number);
              const maxVal = currentFilter.max_val ?? (p.max_value as number);

              return (
                <div key={p.name} className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[140px]" title={p.name}>
                      {p.name} (Numeric)
                    </span>
                    {(currentFilter.min_val !== undefined || currentFilter.max_val !== undefined) && (
                      <button
                        onClick={() => onFilterChange(p.name, null)}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Min:</span>
                      <input
                        type="number"
                        placeholder={String(p.min_value ?? "")}
                        value={minVal !== undefined ? minVal : ""}
                        onChange={(e) => handleNumericMinChange(p.name, Number(e.target.value))}
                        className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Max:</span>
                      <input
                        type="number"
                        placeholder={String(p.max_value ?? "")}
                        value={maxVal !== undefined ? maxVal : ""}
                        onChange={(e) => handleNumericMaxChange(p.name, Number(e.target.value))}
                        className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (p.effective_type === FieldType.DATE || p.effective_type === FieldType.DATETIME) {
              return (
                <div key={p.name} className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[140px]" title={p.name}>
                      {p.name} (Date)
                    </span>
                    {(currentFilter.start_date || currentFilter.end_date) && (
                      <button
                        onClick={() => onFilterChange(p.name, null)}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">From:</span>
                      <input
                        type="date"
                        value={currentFilter.start_date ? currentFilter.start_date.substring(0, 10) : ""}
                        onChange={(e) => handleDateChange(p.name, "start_date", e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">To:</span>
                      <input
                        type="date"
                        value={currentFilter.end_date ? currentFilter.end_date.substring(0, 10) : ""}
                        onChange={(e) => handleDateChange(p.name, "end_date", e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
