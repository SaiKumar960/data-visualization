from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException
from app.services.session_store import session_store
from app.services.aggregator import build_chart_data, build_kpi_summary
from app.core.recommendation_engine import get_unavailable_chart_reasons
from app.models.schemas import (
    Recommendation, ChartRequest, ChartDataResponse, UnavailableChartReason, KpiSummaryResponse, FilterConfig
)

router = APIRouter()

@router.get("/recommendations/{session_id}", response_model=List[Recommendation])
async def get_recommendations(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session.recommendations

@router.get("/unavailable-charts/{session_id}", response_model=List[UnavailableChartReason])
async def get_unavailable_charts(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return get_unavailable_chart_reasons(session.profiles)

@router.post("/kpi-summary/{session_id}", response_model=KpiSummaryResponse)
async def get_kpi_summary(session_id: str, filters: Optional[Dict[str, FilterConfig]] = None):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.df is None or session.df.empty:
        raise HTTPException(status_code=400, detail="No active data in session.")
    
    kpis = build_kpi_summary(session.df, session.profiles, filters)
    return KpiSummaryResponse(kpis=kpis)

@router.post("/chart-data", response_model=ChartDataResponse)
async def get_chart_data(req: ChartRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.df is None or session.df.empty:
        raise HTTPException(status_code=400, detail="No active DataFrame in session.")

    data, series_keys, metadata = build_chart_data(
        df=session.df,
        chart_type=req.chart_type,
        fields=req.fields,
        aggregation=req.aggregation,
        filters=req.filters,
        profiles=session.profiles,
        top_n=req.top_n,
        sort_order=req.sort_order,
        bin_count=req.bin_count
    )

    return ChartDataResponse(
        chart_type=req.chart_type,
        data=data,
        series_keys=series_keys,
        metadata=metadata
    )
