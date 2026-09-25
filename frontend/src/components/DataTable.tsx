import React, { useState, useEffect } from "react";
import type { TableResponse, FilterConfig } from "../types";
import { fetchTableData, fetchExportCsv } from "../api/apiClient";
import { Table as TableIcon, Download, Search, ChevronLeft, ChevronRight, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DataTableProps {
  sessionId: string;
  filename: string;
  filters: Record<string, FilterConfig>;
}

export const DataTable: React.FC<DataTableProps> = ({ sessionId, filename, filters }) => {
  const [tableData, setTableData] = useState<TableResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [globalSearch, setGlobalSearch] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColMenu, setShowColMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetchTableData({
        session_id: sessionId,
        filters: filters,
        sort_field: sortField,
        sort_order: sortOrder,
        global_search: globalSearch,
        page: page,
        page_size: pageSize,
      });
      setTableData(res);
    } catch (err) {
      console.error("Failed to load table data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId, filters, page, pageSize, sortField, sortOrder, globalSearch]);

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(col);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const toggleColumnVisibility = (col: string) => {
    const next = new Set(hiddenCols);
    if (next.has(col)) {
      next.delete(col);
    } else {
      next.add(col);
    }
    setHiddenCols(next);
  };

  const handleExportCsv = async () => {
    if (!sessionId) return;
    const baseName = filename.includes(".") ? filename.substring(0, filename.lastIndexOf(".")) : filename;
    await fetchExportCsv(
      {
        session_id: sessionId,
        filters: filters,
        sort_field: sortField,
        sort_order: sortOrder,
        global_search: globalSearch,
        page: 1,
        page_size: 100000,
      },
      `${baseName}_filtered.csv`
    );
  };

  const visibleColumns = (tableData?.columns || []).filter((col) => !hiddenCols.has(col));

  return (
    <div className="card mb-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Data Table Explorer
          </h2>
          {tableData && (
            <span className="text-xs text-[var(--text-secondary)] font-semibold">
              (Showing {tableData.rows.length} of {tableData.filtered_rows.toLocaleString()} filtered rows)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Global search table..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none w-48"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer hover:bg-[var(--bg-card)]"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Columns</span>
            </button>

            {showColMenu && tableData && (
              <div className="absolute right-0 mt-2 w-48 max-h-60 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl p-2 z-20 text-xs">
                <div className="font-bold text-slate-400 mb-2 px-1">Toggle Column Visibility:</div>
                {tableData.columns.map((col) => (
                  <label key={col} className="flex items-center gap-2 p-1 hover:bg-[var(--bg-primary)] rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col)}
                      onChange={() => toggleColumnVisibility(col)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span className="truncate text-[var(--text-primary)]">{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold uppercase tracking-wider z-10">
            <tr>
              <th className="py-3 px-4 w-12 text-center text-slate-500">#</th>
              {visibleColumns.map((col) => {
                const isSorted = sortField === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-3 px-4 hover:bg-[var(--bg-primary)] cursor-pointer select-none transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{col}</span>
                      {isSorted ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-primary)]">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-slate-400">
                  Loading table data...
                </td>
              </tr>
            ) : !tableData || tableData.rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-slate-400">
                  No matching records found.
                </td>
              </tr>
            ) : (
              tableData.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-card)] transition">
                  <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  {visibleColumns.map((col) => {
                    const val = row[col];
                    return (
                      <td key={col} className="py-2.5 px-4 truncate max-w-[200px] text-[var(--text-primary)]">
                        {val === null || val === undefined ? (
                          <span className="text-slate-600 italic">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tableData && tableData.total_pages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page <strong>{tableData.page}</strong> of <strong>{tableData.total_pages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-card)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= tableData.total_pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-card)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
