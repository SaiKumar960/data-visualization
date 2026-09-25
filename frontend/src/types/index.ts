export type FieldType =
  | "Identifier"
  | "Boolean"
  | "Date"
  | "DateTime"
  | "Integer"
  | "Decimal"
  | "Categorical"
  | "Text";

export const FieldType = {
  IDENTIFIER: "Identifier" as FieldType,
  BOOLEAN: "Boolean" as FieldType,
  DATE: "Date" as FieldType,
  DATETIME: "DateTime" as FieldType,
  INTEGER: "Integer" as FieldType,
  DECIMAL: "Decimal" as FieldType,
  CATEGORICAL: "Categorical" as FieldType,
  TEXT: "Text" as FieldType,
};

export type ChartType =
  | "bar"
  | "column"
  | "horizontal_bar"
  | "line"
  | "area"
  | "scatter"
  | "histogram"
  | "box_plot"
  | "pie"
  | "donut"
  | "grouped_bar"
  | "stacked_bar"
  | "heatmap"
  | "correlation_matrix"
  | "top_n_bar";

export const ChartType = {
  BAR: "bar" as ChartType,
  COLUMN: "column" as ChartType,
  HORIZONTAL_BAR: "horizontal_bar" as ChartType,
  LINE: "line" as ChartType,
  AREA: "area" as ChartType,
  SCATTER: "scatter" as ChartType,
  HISTOGRAM: "histogram" as ChartType,
  BOX_PLOT: "box_plot" as ChartType,
  PIE: "pie" as ChartType,
  DONUT: "donut" as ChartType,
  GROUPED_BAR: "grouped_bar" as ChartType,
  STACKED_BAR: "stacked_bar" as ChartType,
  HEATMAP: "heatmap" as ChartType,
  CORRELATION_MATRIX: "correlation_matrix" as ChartType,
  TOP_N_BAR: "top_n_bar" as ChartType,
};

export interface FrequencyItem {
  value: any;
  count: number;
  percentage: number;
}

export interface FieldProfile {
  name: string;
  detected_type: FieldType;
  override_type?: FieldType | null;
  effective_type: FieldType;
  row_count: number;
  non_null_count: number;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  min_value?: number | string | null;
  max_value?: number | string | null;
  mean?: number | null;
  median?: number | null;
  std_dev?: number | null;
  mode?: any;
  frequency_table?: FrequencyItem[] | null;
  min_date?: string | null;
  max_date?: string | null;
  date_range_days?: number | null;
  sample_values?: any[] | null;
  has_outliers: boolean;
  outlier_count: number;
  ambiguity_warning?: string | null;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  chart_type: ChartType;
  fields: Record<string, string>;
  default_aggregation: string;
  reasoning: string;
  is_top_n_default?: boolean;
  top_n?: number | null;
}

export interface UploadResponse {
  session_id: string;
  filename: string;
  sheets: string[];
  active_sheet: string;
  row_count: number;
  column_count: number;
}

export interface FilterConfig {
  selected_values?: any[] | null;
  min_val?: number | null;
  max_val?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  text_search?: string | null;
}

export interface ChartRequest {
  session_id: string;
  chart_type: ChartType;
  fields: Record<string, any>;
  aggregation: string;
  filters?: Record<string, FilterConfig>;
  top_n?: number | null;
  sort_order?: "asc" | "desc";
  bin_count?: number | null;
}

export interface ChartDataResponse {
  chart_type: ChartType;
  data: any[];
  series_keys?: string[] | null;
  metadata: Record<string, any>;
}

export interface TableRequest {
  session_id: string;
  filters?: Record<string, FilterConfig>;
  sort_field?: string | null;
  sort_order?: "asc" | "desc";
  global_search?: string | null;
  page: number;
  page_size: number;
}

export interface TableResponse {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  filtered_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QualityIssue {
  field?: string | null;
  issue_type: string;
  severity: "warning" | "info" | "error";
  description: string;
  affected_count: number;
  affected_pct: number;
  details?: Record<string, any> | null;
}

export interface DataQualityReport {
  total_rows: number;
  total_cols: number;
  health_score: number;
  duplicate_rows_count: number;
  duplicate_preview: Record<string, any>[];
  empty_columns: string[];
  constant_columns: string[];
  suspected_identifiers: string[];
  issues: QualityIssue[];
}

export interface UnavailableChartReason {
  chart_type: ChartType;
  title: string;
  available: boolean;
  reason: string;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  subtext: string;
  icon_type: string;
  accent_color: string;
}

export interface KpiSummaryResponse {
  kpis: KpiMetric[];
}
