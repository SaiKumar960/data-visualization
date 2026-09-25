from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.session_store import session_store
from app.services.excel_parser import load_sheet_dataframe
from app.core.profiler import profile_dataframe
from app.core.recommendation_engine import generate_recommendations
from app.models.schemas import (
    FieldProfile, SelectSheetRequest, DynamicTypeOverrideRequest, FieldType
)

router = APIRouter()

@router.get("/sheets/{session_id}")
async def get_sheets(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"sheets": session.sheets, "active_sheet": session.current_sheet}

@router.post("/select-sheet")
async def select_sheet(req: SelectSheetRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    if req.sheet_name not in session.sheets:
        raise HTTPException(status_code=400, detail=f"Sheet '{req.sheet_name}' not found in workbook.")

    session.current_sheet = req.sheet_name
    session.overrides.clear()  # Clear stale field type overrides across sheets!
    
    df = load_sheet_dataframe(session.file_bytes, session.filename, req.sheet_name)
    session.df = df
    session.profiles = profile_dataframe(df, session.overrides)
    session.recommendations = generate_recommendations(session.profiles)

    return {
        "session_id": session.session_id,
        "active_sheet": req.sheet_name,
        "row_count": len(df),
        "column_count": len(df.columns),
        "fields": session.profiles
    }

@router.get("/fields/{session_id}", response_model=List[FieldProfile])
async def get_field_profiles(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session.profiles

@router.patch("/fields/{session_id}/{field_name}/type")
async def override_field_type(session_id: str, field_name: str, req: DynamicTypeOverrideRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.df is None or field_name not in session.df.columns:
        raise HTTPException(status_code=404, detail=f"Field '{field_name}' not found in active sheet.")

    session.overrides[field_name] = req.new_type
    session.profiles = profile_dataframe(session.df, session.overrides)
    session.recommendations = generate_recommendations(session.profiles)

    updated_profile = next((p for p in session.profiles if p.name == field_name), None)
    return {
        "message": f"Updated field type for '{field_name}' to '{req.new_type}'.",
        "profile": updated_profile,
        "recommendations": session.recommendations
    }
