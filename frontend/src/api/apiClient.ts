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
  FilterConfig,
} from "../types";
import { FieldType } from "../types";
import {
  parseExcelClientSide,
  selectSheetClientSide,
  getClientProfiles,
  overrideClientProfileType,
  generateClientKpis,
  generateClientRecommendations,
  computeClientChartData,
  getClientTableData,
  getClientDataQuality,
} from "./clientDataEngine";

const API_BASE = "http://127.0.0.1:8000/api";
let isClientMode = false;

export async function uploadExcelFile(file: File): Promise<UploadResponse> {
  // If hosted online (HTTPS or non-localhost domain) or backend is down, use pure 100% in-browser parsing
  const isRemoteHost = window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost";

  if (isRemoteHost || isClientMode) {
    isClientMode = true;
    return parseExcelClientSide(file);
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error();
    return await res.json();
  } catch (err) {
    // Fallback to pure client-side engine seamlessly
    console.log("Backend unavailable. Switching to 100% In-Browser Excel Processing.");
    isClientMode = true;
    return parseExcelClientSide(file);
  }
}

export async function selectSheet(sessionId: string, sheetName: string): Promise<any> {
  if (isClientMode || sessionId.startsWith("client_")) {
    return selectSheetClientSide(sessionId, sheetName);
  }
  const res = await fetch(`${API_BASE}/select-sheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, sheet_name: sheetName }),
  });
  if (!res.ok) throw new Error("Failed to select sheet.");
  return res.json();
}

export async function fetchFieldProfiles(sessionId: string): Promise<FieldProfile[]> {
  if (isClientMode || sessionId.startsWith("client_")) {
    return getClientProfiles();
  }
  const res = await fetch(`${API_BASE}/fields/${sessionId}`);
  if (!res.ok) return getClientProfiles();
  return res.json();
}

export async function fetchKpiSummary(
  sessionId: string,
  filters?: Record<string, FilterConfig>
): Promise<KpiSummaryResponse> {
  if (isClientMode || sessionId.startsWith("client_")) {
    return generateClientKpis(filters);
  }
  try {
    const res = await fetch(`${API_BASE}/kpi-summary/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters || {}),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return generateClientKpis(filters);
  }
}

export async function overrideFieldType(
  sessionId: string,
  fieldName: string,
  newType: FieldType
): Promise<{ profile: FieldProfile; recommendations: Recommendation[] }> {
  if (isClientMode || sessionId.startsWith("client_")) {
    const profile = overrideClientProfileType(fieldName, newType);
    const recommendations = generateClientRecommendations();
    return { profile, recommendations };
  }
  const res = await fetch(`${API_BASE}/fields/${sessionId}/${encodeURIComponent(fieldName)}/type`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_type: newType }),
  });
  if (!res.ok) throw new Error("Failed to override field type.");
  return res.json();
}

export async function fetchRecommendations(sessionId: string): Promise<Recommendation[]> {
  if (isClientMode || sessionId.startsWith("client_")) {
    return generateClientRecommendations();
  }
  try {
    const res = await fetch(`${API_BASE}/recommendations/${sessionId}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return generateClientRecommendations();
  }
}

export async function fetchUnavailableCharts(sessionId: string): Promise<UnavailableChartReason[]> {
  if (isClientMode || sessionId.startsWith("client_")) {
    return [];
  }
  const res = await fetch(`${API_BASE}/unavailable-charts/${sessionId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchChartData(req: ChartRequest): Promise<ChartDataResponse> {
  if (isClientMode || req.session_id.startsWith("client_")) {
    return computeClientChartData(req);
  }
  try {
    const res = await fetch(`${API_BASE}/chart-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return computeClientChartData(req);
  }
}

export async function fetchTableData(req: TableRequest): Promise<TableResponse> {
  if (isClientMode || req.session_id.startsWith("client_")) {
    return getClientTableData(req);
  }
  try {
    const res = await fetch(`${API_BASE}/table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return getClientTableData(req);
  }
}

export async function fetchExportCsv(req: TableRequest, filename: string): Promise<void> {
  const tableRes = isClientMode || req.session_id.startsWith("client_") ? getClientTableData(req) : await fetchTableData(req);
  if (!tableRes.rows || tableRes.rows.length === 0) return;

  const cols = tableRes.columns;
  const csvLines = [cols.join(",")];
  tableRes.rows.forEach((r) => {
    csvLines.push(cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
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
  if (isClientMode || sessionId.startsWith("client_")) {
    return getClientDataQuality();
  }
  try {
    const res = await fetch(`${API_BASE}/data-quality/${sessionId}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return getClientDataQuality();
  }
}

export async function resetSession(sessionId: string): Promise<void> {
  if (!isClientMode && !sessionId.startsWith("client_")) {
    await fetch(`${API_BASE}/reset/${sessionId}`, { method: "POST" }).catch(() => {});
  }
}
