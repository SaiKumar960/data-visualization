import type {
  UploadResponse,
  FieldProfile,
  Recommendation,
  ChartRequest,
  ChartDataResponse,
  TableRequest,
  TableResponse,
  DataQualityReport,
  UnavailableChartReason,
  KpiSummaryResponse,
  FilterConfig
} from "../types";
import { FieldType } from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function uploadExcelFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload Excel file.");
  }

  return res.json();
}

export async function selectSheet(sessionId: string, sheetName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/select-sheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, sheet_name: sheetName }),
  });

  if (!res.ok) {
    throw new Error("Failed to select sheet.");
  }

  return res.json();
}

export async function fetchFieldProfiles(sessionId: string): Promise<FieldProfile[]> {
  const res = await fetch(`${API_BASE}/fields/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch field profiles.");
  return res.json();
}

export async function fetchKpiSummary(
  sessionId: string,
  filters?: Record<string, FilterConfig>
): Promise<KpiSummaryResponse> {
  const res = await fetch(`${API_BASE}/kpi-summary/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters || {}),
  });
  if (!res.ok) throw new Error("Failed to fetch KPI summary.");
  return res.json();
}

export async function overrideFieldType(
  sessionId: string,
  fieldName: string,
  newType: FieldType
): Promise<{ profile: FieldProfile; recommendations: Recommendation[] }> {
  const res = await fetch(`${API_BASE}/fields/${sessionId}/${encodeURIComponent(fieldName)}/type`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_type: newType }),
  });

  if (!res.ok) throw new Error("Failed to override field type.");
  return res.json();
}

export async function fetchRecommendations(sessionId: string): Promise<Recommendation[]> {
  const res = await fetch(`${API_BASE}/recommendations/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch recommendations.");
  return res.json();
}

export async function fetchUnavailableCharts(sessionId: string): Promise<UnavailableChartReason[]> {
  const res = await fetch(`${API_BASE}/unavailable-charts/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch unavailable chart reasons.");
  return res.json();
}

export async function fetchChartData(req: ChartRequest): Promise<ChartDataResponse> {
  const res = await fetch(`${API_BASE}/chart-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) throw new Error("Failed to fetch chart data.");
  return res.json();
}

export async function fetchTableData(req: TableRequest): Promise<TableResponse> {
  const res = await fetch(`${API_BASE}/table`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) throw new Error("Failed to fetch table data.");
  return res.json();
}

export async function fetchExportCsv(req: TableRequest, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/export-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) throw new Error("Failed to export CSV.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchDataQuality(sessionId: string): Promise<DataQualityReport> {
  const res = await fetch(`${API_BASE}/data-quality/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch data quality report.");
  return res.json();
}

export async function resetSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/reset/${sessionId}`, { method: "POST" });
}
