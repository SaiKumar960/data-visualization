from fastapi import APIRouter
from app.services.session_store import session_store

router = APIRouter()

@router.post("/reset/{session_id}")
async def reset_session(session_id: str):
    success = session_store.delete_session(session_id)
    return {"message": "Session reset successfully.", "success": success}

@router.post("/reset-all")
async def reset_all():
    session_store.clear_all()
    return {"message": "All sessions cleared."}
