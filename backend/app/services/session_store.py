import uuid
from typing import Dict, Any, Optional, List
import pandas as pd
from app.models.schemas import FieldProfile, FieldType, Recommendation

class Session:
    def __init__(self, session_id: str, filename: str, file_bytes: bytes, sheets: List[str]):
        self.session_id: str = session_id
        self.filename: str = filename
        self.file_bytes: bytes = file_bytes
        self.sheets: List[str] = sheets
        self.current_sheet: Optional[str] = sheets[0] if sheets else None
        self.df: Optional[pd.DataFrame] = None
        self.overrides: Dict[str, FieldType] = {}
        self.profiles: List[FieldProfile] = []
        self.recommendations: List[Recommendation] = []

class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, Session] = {}

    def create_session(self, filename: str, file_bytes: bytes, sheets: List[str]) -> Session:
        session_id = str(uuid.uuid4())
        session = Session(session_id, filename, file_bytes, sheets)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def clear_all(self):
        self._sessions.clear()

session_store = SessionStore()
