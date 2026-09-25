import io
from typing import List, Tuple
import pandas as pd

def inspect_excel_file(file_bytes: bytes, filename: str) -> List[str]:
    """
    Extracts all sheet names from an Excel file (.xlsx or .xls).
    """
    file_obj = io.BytesIO(file_bytes)
    if filename.endswith(".xls"):
        excel_file = pd.ExcelFile(file_obj, engine="xlrd")
    else:
        excel_file = pd.ExcelFile(file_obj, engine="openpyxl")
    return excel_file.sheet_names

def load_sheet_dataframe(file_bytes: bytes, filename: str, sheet_name: str) -> pd.DataFrame:
    """
    Parses a single sheet into a clean Pandas DataFrame.
    Auto-disambiguates duplicate column names (e.g. 'Amount', 'Amount (2)').
    """
    file_obj = io.BytesIO(file_bytes)
    engine = "xlrd" if filename.endswith(".xls") else "openpyxl"
    
    df = pd.read_excel(file_obj, sheet_name=sheet_name, engine=engine)

    if df.empty:
        return df

    # Disambiguate column names if duplicates exist
    cols = []
    seen = {}
    for col in df.columns:
        col_str = str(col).strip() if pd.notna(col) else "Unnamed"
        if col_str in seen:
            seen[col_str] += 1
            cols.append(f"{col_str} ({seen[col_str]})")
        else:
            seen[col_str] = 1
            cols.append(col_str)
    df.columns = cols

    # Drop completely empty rows
    df = df.dropna(how="all").reset_index(drop=True)
    return df
