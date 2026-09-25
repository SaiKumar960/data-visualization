import re
import pandas as pd
import numpy as np
from typing import Tuple, Optional
from app.models.schemas import FieldType

BOOLEAN_PAIRS = {
    frozenset({"yes", "no"}),
    frozenset({"true", "false"}),
    frozenset({"0", "1"}),
    frozenset({"y", "n"}),
    frozenset({"t", "f"}),
}

ID_HEADER_REGEX = re.compile(r'\b(id|number|no|num|code|ref|ticket|claim|policy|serial|case|account|guid|uuid)\b', re.IGNORECASE)
ID_REGEX = re.compile(r'^[A-Za-z0-9\-_#]{2,50}$')
ALPHANUM_CODE_REGEX = re.compile(r'^[A-Za-z]+[-_]?[0-9]+$|^[0-9]+[-_]?[A-Za-z]+$')

def classify_field_type(series: pd.Series, column_name: str) -> Tuple[FieldType, Optional[str]]:
    """
    Infers semantic type of a column from actual data values & value shapes.
    Zero reliance on domain assumptions!
    """
    clean_series = series.dropna()
    total_count = len(series)
    non_null_count = len(clean_series)

    if non_null_count == 0:
        return FieldType.TEXT, "Column contains only null values."

    unique_count = clean_series.nunique()
    cardinality_ratio = unique_count / non_null_count if non_null_count > 0 else 0

    str_values = clean_series.astype(str).str.strip()
    lower_str_values = str_values.str.lower()
    unique_lowers = set(lower_str_values.unique())

    # A. BOOLEAN CHECK (Fast check)
    if unique_lowers.issubset({"yes", "no"}) or \
       unique_lowers.issubset({"true", "false"}) or \
       unique_lowers.issubset({"0", "1"}) or \
       unique_lowers.issubset({"y", "n"}) or \
       unique_lowers.issubset({"t", "f"}):
        if len(unique_lowers) <= 2:
            return FieldType.BOOLEAN, None

    # B. DATE / DATETIME CHECK
    if pd.api.types.is_datetime64_any_dtype(series):
        has_time = any((clean_series.dt.hour != 0) | (clean_series.dt.minute != 0) | (clean_series.dt.second != 0))
        return (FieldType.DATETIME if has_time else FieldType.DATE), None

    if not pd.api.types.is_numeric_dtype(series):
        sample = clean_series.iloc[:100]
        try:
            sample_strs = sample.astype(str)
            if any(re.search(r'\d', s) for s in sample_strs):
                parsed_dates = pd.to_datetime(sample_strs, errors='coerce', format='mixed')
                valid_parsed_count = parsed_dates.notna().sum()
                if valid_parsed_count / len(sample) >= 0.85:
                    full_parsed = pd.to_datetime(clean_series, errors='coerce', format='mixed')
                    valid_ratio = full_parsed.notna().sum() / non_null_count
                    if valid_ratio >= 0.85:
                        valid_dates = full_parsed.dropna()
                        has_time = any((valid_dates.dt.hour != 0) | (valid_dates.dt.minute != 0) | (valid_dates.dt.second != 0))
                        return (FieldType.DATETIME if has_time else FieldType.DATE), None
        except Exception:
            pass

    # C. IDENTIFIER CHECK
    # 1. Header structural pattern indicator (e.g. Case Number, Claim ID, Policy No) + moderate to high cardinality
    is_id_header = bool(ID_HEADER_REGEX.search(column_name))
    if is_id_header and (unique_count >= 50 or cardinality_ratio >= 0.10):
        # Verify it's not a standard small integer range like Rating (1-5) or Quantity (1-10)
        if unique_count > 15:
            return FieldType.IDENTIFIER, "Identified as reference code/number (Identifier)."

    # 2. Huge fixed-digit reference numbers (e.g., >8 digits like 2026090000000000)
    if pd.api.types.is_numeric_dtype(series):
        nums = clean_series.values
        if len(nums) > 0 and np.all(np.mod(nums, 1) == 0):
            avg_abs = np.mean(np.abs(nums))
            if avg_abs >= 1e8 and unique_count > 20:  # >8 digit numbers (Reference codes)
                return FieldType.IDENTIFIER, "High-value reference numbers classified as Identifier."
            
            # High cardinality ratio (>= 85%) for integer series
            if non_null_count >= 5 and cardinality_ratio >= 0.85:
                diffs = np.diff(np.sort(nums))
                if np.all(diffs == 1) or cardinality_ratio >= 0.95:
                    return FieldType.IDENTIFIER, "Monotonic or high cardinality numeric column detected as Identifier."
    else:
        # String / object identifier check
        if non_null_count >= 5 and cardinality_ratio >= 0.85:
            sample_strs = list(unique_lowers)[:100]
            if all(ID_REGEX.match(s) for s in sample_strs) or any(ALPHANUM_CODE_REGEX.match(s) for s in sample_strs):
                avg_len = str_values.str.len().mean()
                if avg_len <= 35:
                    return FieldType.IDENTIFIER, None

    # D. NUMERIC CHECK (INTEGER / DECIMAL)
    is_num = pd.api.types.is_numeric_dtype(series)
    if not is_num:
        cleaned_num_str = str_values.str.replace(r'[\$,]', '', regex=True)
        coerced = pd.to_numeric(cleaned_num_str, errors='coerce')
        if coerced.notna().sum() / non_null_count >= 0.90:
            is_num = True
            clean_series = coerced.dropna()

    if is_num:
        vals = clean_series.values
        is_integer_vals = np.all(np.mod(vals, 1) == 0)
        
        ambiguity_msg = None
        if unique_count <= max(10, min(50, int(0.05 * total_count))):
            ambiguity_msg = "Numeric (low cardinality) — could be treated as Categorical"

        if is_integer_vals:
            return FieldType.INTEGER, ambiguity_msg
        else:
            return FieldType.DECIMAL, ambiguity_msg

    # E. CATEGORICAL CHECK
    cardinality_limit = max(15, min(50, int(0.05 * total_count)))
    if unique_count <= cardinality_limit or (total_count <= 100 and unique_count <= 25):
        return FieldType.CATEGORICAL, None

    # F. TEXT CHECK (FREE-FORM)
    avg_str_len = str_values.str.len().mean() if len(str_values) > 0 else 0
    if avg_str_len > 20 or cardinality_ratio > 0.5:
        return FieldType.TEXT, None

    if unique_count <= 100:
        return FieldType.CATEGORICAL, None
    return FieldType.TEXT, None
