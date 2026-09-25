import * as XLSX from "xlsx";
import type {
  UploadResponse,
  FieldProfile,
  Recommendation,
  ChartRequest,
  ChartDataResponse,
  TableRequest,
  TableResponse,
  DataQualityReport,
  KpiSummaryResponse,
  FilterConfig,
  QualityIssue,
} from "../types";
import { FieldType, ChartType } from "../types";

interface InternalSession {
  sessionId: string;
  filename: string;
  workbook: XLSX.WorkBook;
  activeSheet: string;
  sheets: string[];
  rawRows: any[];
  profiles: FieldProfile[];
}

let activeSession: InternalSession | null = null;

function classifyColumn(name: string, values: any[]): FieldProfile {
  const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== "");
  const totalCount = values.length;
  const nonNullCount = nonNulls.length;
  const missingCount = totalCount - nonNullCount;
  const missingPct = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;
  const uniqueCount = new Set(nonNulls.map((v) => String(v).trim())).size;

  let inferredType = FieldType.CATEGORICAL;

  if (nonNullCount === 0) {
    inferredType = FieldType.CATEGORICAL;
  } else {
    const isIdHeader = /case\s*no|id|code|num|ref/i.test(name);
    if (isIdHeader || (uniqueCount === nonNullCount && nonNullCount > 15)) {
      inferredType = FieldType.IDENTIFIER;
    } else {
      let dateMatches = 0;
      for (const val of nonNulls.slice(0, 50)) {
        if (val instanceof Date) { dateMatches++; continue; }
        const sVal = String(val).trim();
        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(sVal) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(sVal)) {
          dateMatches++;
        }
      }
      if (dateMatches / Math.min(nonNullCount, 50) > 0.6) {
        inferredType = FieldType.DATE;
      } else {
        let numCount = 0;
        let intCount = 0;
        for (const val of nonNulls) {
          const num = Number(val);
          if (!isNaN(num) && typeof val !== "boolean") {
            numCount++;
            if (Number.isInteger(num)) intCount++;
          }
        }

        if (numCount / nonNullCount > 0.8) {
          if (intCount === numCount && uniqueCount > 10) {
            inferredType = FieldType.INTEGER;
          } else if (intCount < numCount || uniqueCount > 10) {
            inferredType = FieldType.DECIMAL;
          } else {
            inferredType = FieldType.CATEGORICAL;
          }
        } else {
          inferredType = FieldType.CATEGORICAL;
        }
      }
    }
  }

  const sampleValues = Array.from(new Set(nonNulls.slice(0, 10).map((v) => String(v))));

  return {
    name,
    detected_type: inferredType,
    override_type: null,
    effective_type: inferredType,
    row_count: totalCount,
    non_null_count: nonNullCount,
    missing_count: missingCount,
    missing_pct: Math.round(missingPct * 10) / 10,
    unique_count: uniqueCount,
    sample_values: sampleValues,
    has_outliers: false,
    outlier_count: 0,
  };
}

export async function parseExcelClientSide(file: File): Promise<UploadResponse> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets = workbook.SheetNames;
  if (sheets.length === 0) throw new Error("Excel workbook contains no sheets.");

  const activeSheet = sheets[0];
  const worksheet = workbook.Sheets[activeSheet];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  if (rawRows.length === 0) throw new Error("Excel sheet contains no data rows.");

  const columnNames = Object.keys(rawRows[0]);
  const profiles: FieldProfile[] = columnNames.map((col) => {
    const vals = rawRows.map((r) => r[col]);
    return classifyColumn(col, vals);
  });

  const sessionId = "client_" + Date.now();
  activeSession = {
    sessionId,
    filename: file.name,
    workbook,
    activeSheet,
    sheets,
    rawRows,
    profiles,
  };

  return {
    session_id: sessionId,
    filename: file.name,
    sheets,
    active_sheet: activeSheet,
    row_count: rawRows.length,
    column_count: columnNames.length,
  };
}

export async function selectSheetClientSide(_sessionId: string, sheetName: string): Promise<any> {
  if (!activeSession) throw new Error("Session not found.");

  const worksheet = activeSession.workbook.Sheets[sheetName];
  if (!worksheet) throw new Error("Sheet not found.");

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  const columnNames = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

  const profiles: FieldProfile[] = columnNames.map((col) => {
    const vals = rawRows.map((r) => r[col]);
    return classifyColumn(col, vals);
  });

  activeSession.activeSheet = sheetName;
  activeSession.rawRows = rawRows;
  activeSession.profiles = profiles;

  return {
    row_count: rawRows.length,
    column_count: columnNames.length,
  };
}

export function getClientProfiles(): FieldProfile[] {
  return activeSession ? activeSession.profiles : [];
}

export function overrideClientProfileType(fieldName: string, newType: FieldType): FieldProfile {
  if (!activeSession) throw new Error("No active session.");
  const p = activeSession.profiles.find((pr) => pr.name === fieldName);
  if (p) {
    p.override_type = newType;
    p.effective_type = newType;
    return p;
  }
  throw new Error("Field not found.");
}

function filterRows(rows: any[], filters?: Record<string, FilterConfig>): any[] {
  if (!filters || Object.keys(filters).length === 0) return rows;

  return rows.filter((row) => {
    for (const [col, config] of Object.entries(filters)) {
      const val = row[col];
      if (config.selected_values && config.selected_values.length > 0) {
        if (!config.selected_values.includes(String(val))) return false;
      }
      if (config.min_val !== undefined && config.min_val !== null) {
        if (Number(val) < config.min_val) return false;
      }
      if (config.max_val !== undefined && config.max_val !== null) {
        if (Number(val) > config.max_val) return false;
      }
    }
    return true;
  });
}

export function generateClientKpis(filters?: Record<string, FilterConfig>): KpiSummaryResponse {
  if (!activeSession) return { kpis: [] };

  const activeRows = filterRows(activeSession.rawRows, filters);
  const totalCases = activeRows.length;
  const totalOriginal = activeSession.rawRows.length;
  const pctProcessed = totalOriginal > 0 ? ((totalCases / totalOriginal) * 100).toFixed(1) + "%" : "100%";

  const profiles = activeSession.profiles;
  const numerics = profiles.filter((p) => p.effective_type === FieldType.DECIMAL || p.effective_type === FieldType.INTEGER);
  const categoricals = profiles.filter((p) => p.effective_type === FieldType.CATEGORICAL);

  const kpis = [
    {
      id: "kpi_total_cases",
      label: "TOTAL CASES",
      value: totalCases.toLocaleString(),
      subtext: `${pctProcessed} of dataset processed`,
      icon_type: "total",
      accent_color: "indigo",
    },
  ];

  if (numerics.length > 0) {
    const numCol = numerics[0].name;
    let sumVal = 0;
    let validCount = 0;
    activeRows.forEach((r) => {
      const v = Number(r[numCol]);
      if (!isNaN(v)) {
        sumVal += v;
        validCount++;
      }
    });

    const meanVal = validCount > 0 ? sumVal / validCount : 0;

    kpis.push({
      id: "kpi_sum",
      label: `TOTAL ${numCol.toUpperCase().slice(0, 10)}`,
      value: sumVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      subtext: "Total sum across active records",
      icon_type: "sum",
      accent_color: "emerald",
    });

    kpis.push({
      id: "kpi_avg",
      label: `AVG ${numCol.toUpperCase().slice(0, 10)}`,
      value: meanVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      subtext: "Mean average per case",
      icon_type: "average",
      accent_color: "amber",
    });
  }

  if (categoricals.length > 0) {
    const catCol = categoricals[0].name;
    const freq: Record<string, number> = {};
    activeRows.forEach((r) => {
      const val = String(r[catCol] ?? "");
      if (val) freq[val] = (freq[val] || 0) + 1;
    });

    let topVal = "N/A";
    let maxFreq = 0;
    for (const [k, count] of Object.entries(freq)) {
      if (count > maxFreq) {
        maxFreq = count;
        topVal = k;
      }
    }

    const topPct = totalCases > 0 ? ((maxFreq / totalCases) * 100).toFixed(1) + "%" : "0%";

    kpis.push({
      id: "kpi_top_category",
      label: `TOP ${catCol.toUpperCase().slice(0, 12)}`,
      value: topVal,
      subtext: `${maxFreq.toLocaleString()} cases (${topPct})`,
      icon_type: "top",
      accent_color: "purple",
    });
  }

  return { kpis };
}

export function generateClientRecommendations(): Recommendation[] {
  if (!activeSession) return [];

  const profiles = activeSession.profiles;
  const categoricals = profiles.filter((p) => p.effective_type === FieldType.CATEGORICAL);
  const numerics = profiles.filter((p) => p.effective_type === FieldType.DECIMAL || p.effective_type === FieldType.INTEGER);
  const dates = profiles.filter((p) => p.effective_type === FieldType.DATE);

  const recs: Recommendation[] = [];

  if (categoricals.length >= 2) {
    recs.push({
      id: "rec_stacked_cat",
      title: `${categoricals[1].name} Mix by ${categoricals[0].name}`,
      description: `Stacked breakdown distribution of ${categoricals[1].name} across ${categoricals[0].name}.`,
      chart_type: ChartType.STACKED_BAR,
      fields: { x: categoricals[0].name, group: categoricals[1].name },
      default_aggregation: "count",
      reasoning: `Paired 2 Categoricals ('${categoricals[0].name}', '${categoricals[1].name}') for stacked volume distribution.`,
      top_n: 10,
    });

    recs.push({
      id: "rec_grouped_cat",
      title: `${categoricals[0].name} Breakdown (${categoricals[1].name} Comparison)`,
      description: `Grouped comparison breakdown across ${categoricals[0].name}.`,
      chart_type: ChartType.GROUPED_BAR,
      fields: { x: categoricals[0].name, group: categoricals[1].name },
      default_aggregation: "count",
      reasoning: `Grouped comparison of '${categoricals[0].name}' by '${categoricals[1].name}'.`,
      top_n: 8,
    });
  }

  if (categoricals.length > 0) {
    recs.push({
      id: "rec_donut_cat",
      title: `${categoricals[0].name} Volume Distribution`,
      description: `Part-to-whole donut mix across top ${categoricals[0].name} categories.`,
      chart_type: ChartType.DONUT,
      fields: { x: categoricals[0].name, y: numerics.length > 0 ? numerics[0].name : "value" },
      default_aggregation: numerics.length > 0 ? "sum" : "count",
      reasoning: `Low cardinality categorical '${categoricals[0].name}' for part-to-whole donut mix.`,
      top_n: 6,
    });
  }

  if (dates.length > 0 && numerics.length > 0) {
    recs.push({
      id: "rec_line_date",
      title: `${numerics[0].name} over ${dates[0].name}`,
      description: `Time-series trend analysis over ${dates[0].name}.`,
      chart_type: ChartType.LINE,
      fields: { x: dates[0].name, y: numerics[0].name },
      default_aggregation: "sum",
      reasoning: `Time-series trend analysis over '${dates[0].name}'.`,
    });

    recs.push({
      id: "rec_area_date",
      title: `Cumulative Volume over ${dates[0].name}`,
      description: `Cumulative area trend over ${dates[0].name}.`,
      chart_type: ChartType.AREA,
      fields: { x: dates[0].name, y: numerics[0].name },
      default_aggregation: "sum",
      reasoning: `Cumulative area trend for '${dates[0].name}'.`,
    });
  }

  if (categoricals.length > 0 && numerics.length > 0) {
    recs.push({
      id: "rec_bar_cat_num",
      title: `Total ${numerics[0].name} by ${categoricals[0].name}`,
      description: `Aggregated ${numerics[0].name} grouped by ${categoricals[0].name}.`,
      chart_type: ChartType.BAR,
      fields: { x: categoricals[0].name, y: numerics[0].name },
      default_aggregation: "sum",
      reasoning: `Paired Categorical '${categoricals[0].name}' with Numeric measure '${numerics[0].name}'.`,
      top_n: 10,
    });
  }

  if (categoricals.length >= 2) {
    recs.push({
      id: "rec_heatmap",
      title: `Heatmap: ${numerics.length > 0 ? numerics[0].name : "Count"} by ${categoricals[0].name} × ${categoricals[1].name}`,
      description: `2D Matrix heatmap density distribution.`,
      chart_type: ChartType.HEATMAP,
      fields: { x: categoricals[0].name, group: categoricals[1].name, y: numerics.length > 0 ? numerics[0].name : "value" },
      default_aggregation: numerics.length > 0 ? "sum" : "count",
      reasoning: `Two categoricals for 2D matrix density view.`,
    });
  }

  return recs;
}

export function computeClientChartData(req: ChartRequest): ChartDataResponse {
  if (!activeSession) {
    return { chart_type: req.chart_type, data: [], series_keys: [], metadata: {} };
  }

  const rows = filterRows(activeSession.rawRows, req.filters);
  const xField = req.fields.x || "";
  const yField = req.fields.y || "value";
  const groupField = req.fields.group || "";
  const agg = req.aggregation || "sum";

  if (groupField && (req.chart_type === ChartType.STACKED_BAR || req.chart_type === ChartType.GROUPED_BAR || req.chart_type === ChartType.HEATMAP)) {
    const seriesSet = new Set<string>();
    const matrix: Record<string, Record<string, number>> = {};

    rows.forEach((r) => {
      const xVal = String(r[xField] ?? "N/A");
      const gVal = String(r[groupField] ?? "N/A");
      const num = yField ? Number(r[yField]) || 0 : 1;

      seriesSet.add(gVal);
      if (!matrix[xVal]) matrix[xVal] = {};

      if (agg === "count") {
        matrix[xVal][gVal] = (matrix[xVal][gVal] || 0) + 1;
      } else {
        matrix[xVal][gVal] = (matrix[xVal][gVal] || 0) + num;
      }
    });

    const seriesKeys = Array.from(seriesSet).slice(0, 10);
    let chartData = Object.entries(matrix).map(([xKey, gMap]) => {
      const rowObj: Record<string, any> = { [xField]: xKey, x: xKey, row: xKey };
      seriesKeys.forEach((sKey) => {
        rowObj[sKey] = gMap[sKey] || 0;
      });
      return rowObj;
    });

    if (req.top_n) chartData = chartData.slice(0, req.top_n);

    return {
      chart_type: req.chart_type,
      data: chartData,
      series_keys: seriesKeys,
      metadata: {},
    };
  } else {
    const map: Record<string, { sum: number; count: number }> = {};
    rows.forEach((r) => {
      const xVal = String(r[xField] ?? "N/A");
      const num = yField ? Number(r[yField]) || 0 : 1;

      if (!map[xVal]) map[xVal] = { sum: 0, count: 0 };
      map[xVal].sum += num;
      map[xVal].count += 1;
    });

    let chartData = Object.entries(map).map(([xKey, obj]) => {
      const val = agg === "count" ? obj.count : agg === "average" ? (obj.count > 0 ? obj.sum / obj.count : 0) : obj.sum;
      const targetVal = Math.round(val * 100) / 100;
      return {
        [xField]: xKey,
        [yField]: targetVal,
        name: xKey,
        value: targetVal,
      };
    });

    if (req.top_n) chartData = chartData.slice(0, req.top_n);

    return {
      chart_type: req.chart_type,
      data: chartData,
      metadata: {},
    };
  }
}

export function getClientTableData(req: TableRequest): TableResponse {
  if (!activeSession) {
    return { total_rows: 0, filtered_rows: 0, page: 1, page_size: 20, total_pages: 0, columns: [], rows: [] };
  }

  let rows = filterRows(activeSession.rawRows, req.filters);

  if (req.global_search) {
    const q = req.global_search.toLowerCase();
    rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  }

  const columns = Object.keys(activeSession.rawRows[0] || {});
  const totalCount = activeSession.rawRows.length;
  const filteredCount = rows.length;
  const pageSize = req.page_size || 20;
  const page = req.page || 1;
  const totalPages = Math.ceil(filteredCount / pageSize);

  const startIdx = (page - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);

  return {
    total_rows: totalCount,
    filtered_rows: filteredCount,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    columns,
    rows: pageRows,
  };
}

export function getClientDataQuality(): DataQualityReport {
  if (!activeSession) {
    return {
      total_rows: 0,
      total_cols: 0,
      health_score: 100,
      duplicate_rows_count: 0,
      duplicate_preview: [],
      empty_columns: [],
      constant_columns: [],
      suspected_identifiers: [],
      issues: [],
    };
  }

  const rows = activeSession.rawRows;
  const total = rows.length;
  const issues: QualityIssue[] = [];

  activeSession.profiles.forEach((p) => {
    if (p.missing_count > 0) {
      issues.push({
        field: p.name,
        issue_type: "Missing Values",
        severity: "warning",
        description: `Field '${p.name}' has ${p.missing_count} missing values.`,
        affected_count: p.missing_count,
        affected_pct: p.missing_pct,
      });
    }
  });

  const healthScore = Math.max(70, 100 - issues.length * 3);

  return {
    total_rows: total,
    total_cols: activeSession.profiles.length,
    health_score: healthScore,
    duplicate_rows_count: 0,
    duplicate_preview: [],
    empty_columns: [],
    constant_columns: [],
    suspected_identifiers: activeSession.profiles.filter((p) => p.effective_type === FieldType.IDENTIFIER).map((p) => p.name),
    issues,
  };
}
