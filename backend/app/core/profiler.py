import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.models.schemas import FieldProfile, FieldType, FrequencyItem
from app.core.type_classifier import classify_field_type

def profile_column(series: pd.Series, column_name: str, override_type: Optional[FieldType] = None) -> FieldProfile:
    row_count = int(len(series))
    clean_series = series.dropna()
    non_null_count = int(len(clean_series))
    missing_count = int(row_count - non_null_count)
    missing_pct = round(float((missing_count / row_count) * 100), 2) if row_count > 0 else 0.0
    unique_count = int(clean_series.nunique())

    detected_type, ambiguity_warning = classify_field_type(series, column_name)
    effective_type = override_type if override_type is not None else detected_type

    min_val, max_val = None, None
    mean_val, median_val, std_dev_val = None, None, None
    mode_val = None
    freq_table: Optional[List[FrequencyItem]] = None
    min_date_str, max_date_str = None, None
    date_range_days = None
    sample_values = None
    has_outliers = False
    outlier_count = 0

    # Profiling based on EFFECTIVE TYPE
    if effective_type in (FieldType.INTEGER, FieldType.DECIMAL):
        num_series = pd.to_numeric(clean_series, errors='coerce').dropna()
        if len(num_series) > 0:
            min_val = float(num_series.min()) if np.issubdtype(num_series.dtype, np.floating) or num_series.min() > 1e15 else (int(num_series.min()) if float(num_series.min()).is_integer() else float(num_series.min()))
            max_val = float(num_series.max()) if np.issubdtype(num_series.dtype, np.floating) or num_series.max() > 1e15 else (int(num_series.max()) if float(num_series.max()).is_integer() else float(num_series.max()))
            mean_val = round(float(num_series.mean()), 4)
            median_val = float(num_series.median())
            std_dev_val = round(float(num_series.std()), 4) if len(num_series) > 1 else 0.0

            # IQR Outliers
            q1 = num_series.quantile(0.25)
            q3 = num_series.quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                outliers = num_series[(num_series < lower_bound) | (num_series > upper_bound)]
                outlier_count = int(len(outliers))
                has_outliers = outlier_count > 0

    if effective_type in (FieldType.CATEGORICAL, FieldType.BOOLEAN, FieldType.INTEGER):
        if non_null_count > 0:
            top_counts = clean_series.astype(str).value_counts().head(10)
            mode_val = str(top_counts.index[0]) if len(top_counts) > 0 else None
            freq_table = [
                FrequencyItem(
                    value=str(k),
                    count=int(float(v)),
                    percentage=round(float((v / non_null_count) * 100), 2)
                ) for k, v in top_counts.items()
            ]

    if effective_type in (FieldType.DATE, FieldType.DATETIME):
        parsed_dates = pd.to_datetime(clean_series, errors='coerce').dropna()
        if len(parsed_dates) > 0:
            min_d = parsed_dates.min()
            max_d = parsed_dates.max()
            min_date_str = min_d.isoformat()
            max_date_str = max_d.isoformat()
            date_range_days = round(float((max_d - min_d).total_seconds() / 86400.0), 2)
            min_val = min_date_str
            max_val = max_date_str

    if effective_type in (FieldType.TEXT, FieldType.IDENTIFIER):
        if non_null_count > 0:
            sample_values = list(clean_series.astype(str).unique()[:5])

    return FieldProfile(
        name=column_name,
        detected_type=detected_type,
        override_type=override_type,
        effective_type=effective_type,
        row_count=row_count,
        non_null_count=non_null_count,
        missing_count=missing_count,
        missing_pct=missing_pct,
        unique_count=unique_count,
        min_value=min_val,
        max_value=max_val,
        mean=mean_val,
        median=median_val,
        std_dev=std_dev_val,
        mode=mode_val,
        frequency_table=freq_table,
        min_date=min_date_str,
        max_date=max_date_str,
        date_range_days=date_range_days,
        sample_values=sample_values,
        has_outliers=has_outliers,
        outlier_count=outlier_count,
        ambiguity_warning=ambiguity_warning
    )

def profile_dataframe(df: pd.DataFrame, overrides: Dict[str, FieldType] = None) -> List[FieldProfile]:
    overrides = overrides or {}
    profiles = []
    for col in df.columns:
        override = overrides.get(col)
        profiles.append(profile_column(df[col], col, override))
    return profiles
