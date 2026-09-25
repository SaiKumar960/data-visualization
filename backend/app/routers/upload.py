from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.session_store import session_store
from app.services.excel_parser import inspect_excel_file, load_sheet_dataframe
from app.core.profiler import profile_dataframe
from app.core.recommendation_engine import generate_recommendations
from app.models.schemas import UploadResponse

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_excel_file(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file (.xlsx or .xls).")

    try:
        file_bytes = await file.read()
        sheet_names = inspect_excel_file(file_bytes, file.filename)
        
        if not sheet_names:
            raise HTTPException(status_code=400, detail="The uploaded Excel workbook contains no sheets.")

        session = session_store.create_session(file.filename, file_bytes, sheet_names)
        
        # Load initial sheet
        active_sheet = sheet_names[0]
        df = load_sheet_dataframe(file_bytes, file.filename, active_sheet)
        session.df = df
        session.profiles = profile_dataframe(df, session.overrides)
        session.recommendations = generate_recommendations(session.profiles)

        return UploadResponse(
            session_id=session.session_id,
            filename=file.filename,
            sheets=sheet_names,
            active_sheet=active_sheet,
            row_count=len(df),
            column_count=len(df.columns)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process Excel file: {str(e)}")
