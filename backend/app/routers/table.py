import io
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.session_store import session_store
from app.services.aggregator import apply_filters
from app.models.schemas import TableRequest, TableResponse

router = APIRouter()

@router.post("/table", response_model=TableResponse)
async def get_table_data(req: TableRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.df is None:
        raise HTTPException(status_code=400, detail="No active data in session.")

    profiles_dict = {p.name: p for p in session.profiles}
    filtered_df = apply_filters(session.df, req.filters, profiles_dict)

    # Global search across all columns
    if req.global_search and req.global_search.strip():
        search_term = re.escape(req.global_search.strip())
        mask = filtered_df.astype(str).apply(lambda row: row.str.contains(search_term, case=False, na=False).any(), axis=1)
        filtered_df = filtered_df[mask]

    # Server-side sorting
    if req.sort_field and req.sort_field in filtered_df.columns:
        ascending = (req.sort_order == "asc")
        # Handle numeric sort cleanly
        try:
            filtered_df = filtered_df.sort_values(by=req.sort_field, ascending=ascending)
        except Exception:
            pass

    total_rows = len(session.df)
    filtered_rows = len(filtered_df)
    page_size = max(1, min(100, req.page_size))
    total_pages = max(1, (filtered_rows + page_size - 1) // page_size)
    page = max(1, min(total_pages, req.page))

    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    sliced_df = filtered_df.iloc[start_idx:end_idx]

    # Clean records for JSON output (convert NaNs to None)
    records = sliced_df.to_dict(orient="records")
    clean_records = []
    for r in records:
        clean_row = {}
        for k, v in r.items():
            if isinstance(v, float) and (v != v):  # NaN check
                clean_row[k] = None
            else:
                clean_row[k] = v
        clean_records.append(clean_row)

    return TableResponse(
        columns=list(session.df.columns),
        rows=clean_records,
        total_rows=total_rows,
        filtered_rows=filtered_rows,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("/export-csv")
async def export_csv(req: TableRequest):
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    profiles_dict = {p.name: p for p in session.profiles}
    filtered_df = apply_filters(session.df, req.filters, profiles_dict)

    if req.global_search and req.global_search.strip():
        search_term = re.escape(req.global_search.strip())
        mask = filtered_df.astype(str).apply(lambda row: row.str.contains(search_term, case=False, na=False).any(), axis=1)
        filtered_df = filtered_df[mask]

    if req.sort_field and req.sort_field in filtered_df.columns:
        ascending = (req.sort_order == "asc")
        try:
            filtered_df = filtered_df.sort_values(by=req.sort_field, ascending=ascending)
        except Exception:
            pass

    stream = io.StringIO()
    filtered_df.to_csv(stream, index=False)
    stream.seek(0)

    filename = f"{session.filename.rsplit('.', 1)[0]}_filtered.csv"
    return StreamingResponse(
        io.BytesIO(stream.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
