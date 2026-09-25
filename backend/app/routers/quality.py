from fastapi import APIRouter, HTTPException
from app.services.session_store import session_store
from app.core.quality_checker import evaluate_data_quality
from app.models.schemas import DataQualityReport

router = APIRouter()

@router.get("/data-quality/{session_id}", response_model=DataQualityReport)
async def get_data_quality(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.df is None:
        raise HTTPException(status_code=400, detail="No active DataFrame in session.")

    return evaluate_data_quality(session.df, session.profiles)
