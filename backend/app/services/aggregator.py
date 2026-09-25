import math
import re
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from app.models.schemas import ChartType, FilterConfig, FieldProfile, FieldType, KpiMetric

def apply_filters(df: pd.DataFrame, filters: Optional[Dict[str, FilterConfig]], profiles_dict: Dict[str, FieldProfile]) -> pd.DataFrame:
    if not filters or df.empty:
        return df

    filtered_df = df.copy()
    for col_name, f_config in filters.items():
        if col_name not in filtered_df.columns or not f_config:
            continue
        
        prof = profiles_dict.get(col_name)
        if not prof:
            continue

        # 1. Categorical / Boolean selection
        if f_config.selected_values is not None and len(f_config.selected_values) > 0:
            str_selected = set(str(v) for v in f_config.selected_values)
            filtered_df = filtered_df[filtered_df[col_name].astype(str).isin(str_selected)]

        # 2. Numeric range filter
        if f_config.min_val is not None or f_config.max_val is not None:
            num_series = pd.to_numeric(filtered_df[col_name], errors='coerce')
            if f_config.min_val is not None:
                filtered_df = filtered_df[num_series >= f_config.min_val]
            if f_config.max_val is not None:
                filtered_df = filtered_df[num_series <= f_config.max_val]

        # 3. Date range filter
        if f_config.start_date is not None or f_config.end_date is not None:
            date_series = pd.to_datetime(filtered_df[col_name], errors='coerce')
            if f_config.start_date:
                filtered_df = filtered_df[date_series >= pd.to_datetime(f_config.start_date)]
            if f_config.end_date:
                filtered_df = filtered_df[date_series <= pd.to_datetime(f_config.end_date)]

        # 4. Text search filter
        if f_config.text_search:
            pattern = re.escape(f_config.text_search)
            filtered_df = filtered_df[filtered_df[col_name].astype(str).str.contains(pattern, case=False, na=False)]

    return filtered_df

def compute_aggregation(series: pd.Series, func_name: str) -> float:
    num_series = pd.to_numeric(series, errors='coerce').dropna()
    if num_series.empty:
        return 0.0
    func_map = {
        "sum": lambda s: float(s.sum()),
        "average": lambda s: float(s.mean()),
        "mean": lambda s: float(s.mean()),
        "count": lambda s: float(len(s)),
        "min": lambda s: float(s.min()),
        "max": lambda s: float(s.max()),
        "median": lambda s: float(s.median())
    }
    agg_fn = func_map.get(func_name.lower(), lambda s: float(s.sum()))
    val = agg_fn(num_series)
    return round(val, 4) if isinstance(val, float) else val

def build_kpi_summary(df: pd.DataFrame, profiles: List[FieldProfile], filters: Optional[Dict[str, FilterConfig]]) -> List[KpiMetric]:
    profiles_dict = {p.name: p for p in profiles}
    filtered_df = apply_filters(df, filters, profiles_dict)
    total_rows = len(df)
    filtered_rows = len(filtered_df)

    kpis: List[KpiMetric] = []

    # 1. Total Cases / Records
    pct_active = round((filtered_rows / total_rows * 100), 1) if total_rows > 0 else 100.0
    kpis.append(KpiMetric(
        id="kpi_total_cases",
        label="Total Cases",
        value=f"{filtered_rows:,}",
        subtext=f"{pct_active}% of dataset processed",
        icon_type="total",
        accent_color="indigo"
    ))

    # Numeric Metrics
    numeric_profs = [p for p in profiles if p.effective_type in (FieldType.INTEGER, FieldType.DECIMAL)]
    if numeric_profs and not filtered_df.empty:
        p1 = numeric_profs[0]
        s1 = pd.to_numeric(filtered_df[p1.name], errors='coerce').dropna()
        if not s1.empty:
            total_sum = s1.sum()
            avg_val = s1.mean()

            is_currency = any(k in p1.name.lower() for k in ["amount", "sales", "salary", "claim", "revenue", "price", "cost"])
            sum_str = f"₹{total_sum:,.2f}" if is_currency else f"{total_sum:,.2f}"
            avg_str = f"{avg_val:,.2f}"

            kpis.append(KpiMetric(
                id="kpi_sum_metric",
                label=f"Total {p1.name}",
                value=sum_str,
                subtext=f"Total sum across active records",
                icon_type="sum",
                accent_color="emerald"
            ))

            kpis.append(KpiMetric(
                id="kpi_avg_metric",
                label=f"Avg {p1.name}",
                value=avg_str,
                subtext=f"Mean average per case",
                icon_type="average",
                accent_color="amber"
            ))

    # Categorical Metric
    cat_profs = [p for p in profiles if p.effective_type in (FieldType.CATEGORICAL, FieldType.BOOLEAN)]
    if cat_profs and not filtered_df.empty:
        c1 = cat_profs[0]
        counts = filtered_df[c1.name].dropna().astype(str).value_counts()
        if not counts.empty:
            top_val = counts.index[0]
            top_cnt = int(counts.iloc[0])
            top_pct = round((top_cnt / filtered_rows) * 100, 1) if filtered_rows > 0 else 0.0
            kpis.append(KpiMetric(
                id="kpi_top_category",
                label=f"Top {c1.name}",
                value=str(top_val),
                subtext=f"{top_cnt:,} cases ({top_pct}%)",
                icon_type="top",
                accent_color="purple"
            ))

    return kpis[:4]

def build_chart_data(
    df: pd.DataFrame,
    chart_type: ChartType,
    fields: Dict[str, Any],
    aggregation: str,
    filters: Optional[Dict[str, FilterConfig]],
    profiles: List[FieldProfile],
    top_n: Optional[int] = None,
    sort_order: Optional[str] = "desc",
    bin_count: Optional[int] = None
) -> Tuple[List[Dict[str, Any]], Optional[List[str]], Dict[str, Any]]:
    
    profiles_dict = {p.name: p for p in profiles}
    filtered_df = apply_filters(df, filters, profiles_dict)
    
    metadata = {
        "total_rows": len(df),
        "filtered_rows": len(filtered_df)
    }

    if filtered_df.empty:
        return [], None, metadata

    x_field = fields.get("x")
    y_field = fields.get("y")
    group_field = fields.get("group")

    # 1. BAR / COLUMN / HORIZONTAL BAR / GROUPED BAR / STACKED BAR / TOP N BAR
    if chart_type in (ChartType.BAR, ChartType.COLUMN, ChartType.HORIZONTAL_BAR, ChartType.GROUPED_BAR, ChartType.STACKED_BAR, ChartType.TOP_N_BAR):
        if not x_field:
            return [], None, metadata
        
        # Grouped or Stacked bar chart (2 categoricals + 1 numeric)
        if group_field and group_field in filtered_df.columns:
            pivot = filtered_df.pivot_table(
                index=x_field,
                columns=group_field,
                values=y_field if y_field in filtered_df.columns else None,
                aggfunc='count' if aggregation == 'count' or not y_field else (lambda s: compute_aggregation(s, aggregation)),
                fill_value=0
            ).reset_index()
            
            series_keys = [str(c) for c in pivot.columns if c != x_field]
            records = pivot.to_dict(orient="records")
            formatted_records = []
            for r in records:
                formatted_records.append({str(k): (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()})
            return formatted_records, series_keys, metadata

        # Single category bar chart
        if y_field and y_field in filtered_df.columns:
            agg_df = filtered_df.groupby(x_field)[y_field].apply(lambda s: compute_aggregation(s, aggregation)).reset_index()
            agg_df.columns = [x_field, y_field]
        else:
            agg_df = filtered_df.groupby(x_field).size().reset_index(name="count")
            y_field = "count"

        # Sorting & Top-N ranking
        ascending = (sort_order == "asc")
        agg_df = agg_df.sort_values(by=y_field, ascending=ascending)
        
        if top_n or chart_type == ChartType.TOP_N_BAR:
            n_limit = top_n if top_n else 10
            agg_df = agg_df.head(n_limit)

        records = agg_df.to_dict(orient="records")
        formatted = [{x_field: str(r[x_field]), y_field: r[y_field]} for r in records]
        return formatted, [y_field], metadata

    # 2. LINE / AREA CHART
    if chart_type in (ChartType.LINE, ChartType.AREA):
        if not x_field or x_field not in filtered_df.columns:
            return [], None, metadata

        temp_df = filtered_df.copy()
        temp_df['__date_parsed'] = pd.to_datetime(temp_df[x_field], errors='coerce')
        temp_df = temp_df.dropna(subset=['__date_parsed']).sort_values('__date_parsed')
        temp_df['__date_str'] = temp_df['__date_parsed'].dt.strftime('%Y-%m-%d')

        if group_field and group_field in temp_df.columns:
            pivot = temp_df.pivot_table(
                index='__date_str',
                columns=group_field,
                values=y_field,
                aggfunc=lambda s: compute_aggregation(s, aggregation),
                fill_value=0
            ).reset_index()
            pivot.rename(columns={'__date_str': x_field}, inplace=True)
            series_keys = [str(c) for c in pivot.columns if c != x_field]
            records = pivot.to_dict(orient="records")
            return records, series_keys, metadata
        else:
            agg_df = temp_df.groupby('__date_str')[y_field].apply(lambda s: compute_aggregation(s, aggregation)).reset_index()
            agg_df.columns = [x_field, y_field]
            records = agg_df.to_dict(orient="records")
            return records, [y_field], metadata

    # 3. PIE / DONUT
    if chart_type in (ChartType.PIE, ChartType.DONUT):
        if not x_field or x_field not in filtered_df.columns:
            return [], None, metadata
        
        if y_field and y_field in filtered_df.columns:
            agg_df = filtered_df.groupby(x_field)[y_field].apply(lambda s: compute_aggregation(s, aggregation)).reset_index()
            agg_df.columns = ["name", "value"]
        else:
            agg_df = filtered_df.groupby(x_field).size().reset_index(name="value")
            agg_df.columns = ["name", "value"]

        agg_df = agg_df.sort_values(by="value", ascending=False)
        
        if len(agg_df) > 8:
            top7 = agg_df.head(7)
            other_val = agg_df.iloc[7:]["value"].sum()
            other_row = pd.DataFrame([{"name": "Other", "value": round(other_val, 4)}])
            agg_df = pd.concat([top7, other_row], ignore_index=True)

        records = agg_df.to_dict(orient="records")
        return records, ["value"], metadata

    # 4. SCATTER PLOT
    if chart_type == ChartType.SCATTER:
        if not x_field or not y_field or x_field not in filtered_df.columns or y_field not in filtered_df.columns:
            return [], None, metadata

        scatter_df = filtered_df[[x_field, y_field]].copy()
        scatter_df[x_field] = pd.to_numeric(scatter_df[x_field], errors='coerce')
        scatter_df[y_field] = pd.to_numeric(scatter_df[y_field], errors='coerce')
        scatter_df = scatter_df.dropna()

        if len(scatter_df) > 2000:
            scatter_df = scatter_df.sample(n=2000, random_state=42)

        x_vals = scatter_df[x_field].values
        y_vals = scatter_df[y_field].values

        trendline = None
        if len(x_vals) > 1:
            try:
                slope, intercept = np.polyfit(x_vals, y_vals, 1)
                r_matrix = np.corrcoef(x_vals, y_vals)
                r_squared = float(r_matrix[0, 1]**2) if not np.isnan(r_matrix[0, 1]) else 0.0
                trendline = {
                    "slope": round(float(slope), 4),
                    "intercept": round(float(intercept), 4),
                    "r_squared": round(r_squared, 4)
                }
            except Exception:
                trendline = None

        metadata["trendline"] = trendline
        records = scatter_df.to_dict(orient="records")
        return records, [x_field, y_field], metadata

    # 5. HISTOGRAM
    if chart_type == ChartType.HISTOGRAM:
        if not x_field or x_field not in filtered_df.columns:
            return [], None, metadata

        num_series = pd.to_numeric(filtered_df[x_field], errors='coerce').dropna()
        if num_series.empty:
            return [], None, metadata

        num_bins = bin_count or max(5, int(math.ceil(math.log2(len(num_series)) + 1)))
        counts, bin_edges = np.histogram(num_series, bins=num_bins)

        bin_data = []
        for i in range(len(counts)):
            bin_label = f"{round(bin_edges[i], 2)} - {round(bin_edges[i+1], 2)}"
            bin_data.append({
                "bin": bin_label,
                "count": int(counts[i]),
                "range_min": round(float(bin_edges[i]), 2),
                "range_max": round(float(bin_edges[i+1]), 2)
            })
        return bin_data, ["count"], metadata

    # 6. BOX PLOT
    if chart_type == ChartType.BOX_PLOT:
        target_y = y_field or x_field
        if not target_y or target_y not in filtered_df.columns:
            return [], None, metadata

        result = []
        if x_field and x_field != target_y and x_field in filtered_df.columns:
            grouped = filtered_df.groupby(x_field)
            for group_name, g_df in grouped:
                s = pd.to_numeric(g_df[target_y], errors='coerce').dropna()
                if len(s) > 0:
                    q1, med, q3 = s.quantile(0.25), s.median(), s.quantile(0.75)
                    iqr = q3 - q1
                    low, high = q1 - 1.5*iqr, q3 + 1.5*iqr
                    non_outliers = s[(s >= low) & (s <= high)]
                    outliers = s[(s < low) | (s > high)].tolist()
                    result.append({
                        "category": str(group_name),
                        "min": round(float(non_outliers.min()) if len(non_outliers) > 0 else float(s.min()), 4),
                        "q1": round(float(q1), 4),
                        "median": round(float(med), 4),
                        "q3": round(float(q3), 4),
                        "max": round(float(non_outliers.max()) if len(non_outliers) > 0 else float(s.max()), 4),
                        "outliers": [round(float(o), 4) for o in outliers]
                    })
        else:
            s = pd.to_numeric(filtered_df[target_y], errors='coerce').dropna()
            if len(s) > 0:
                q1, med, q3 = s.quantile(0.25), s.median(), s.quantile(0.75)
                iqr = q3 - q1
                low, high = q1 - 1.5*iqr, q3 + 1.5*iqr
                non_outliers = s[(s >= low) & (s <= high)]
                outliers = s[(s < low) | (s > high)].tolist()
                result.append({
                    "category": target_y,
                    "min": round(float(non_outliers.min()) if len(non_outliers) > 0 else float(s.min()), 4),
                    "q1": round(float(q1), 4),
                    "median": round(float(med), 4),
                    "q3": round(float(q3), 4),
                    "max": round(float(non_outliers.max()) if len(non_outliers) > 0 else float(s.max()), 4),
                    "outliers": [round(float(o), 4) for o in outliers]
                })

        return result, ["min", "q1", "median", "q3", "max"], metadata

    # 7. HEATMAP
    if chart_type == ChartType.HEATMAP:
        if not x_field or not y_field or x_field not in filtered_df.columns or y_field not in filtered_df.columns:
            return [], None, metadata
        val_col = fields.get("value")
        
        pivot = filtered_df.pivot_table(
            index=x_field,
            columns=y_field,
            values=val_col if val_col in filtered_df.columns else None,
            aggfunc='count' if not val_col or val_col not in filtered_df.columns else lambda s: compute_aggregation(s, aggregation),
            fill_value=0
        )
        
        y_categories = [str(c) for c in pivot.columns]
        matrix_data = []
        for x_val in pivot.index:
            row_dict = {"x": str(x_val)}
            for y_cat in pivot.columns:
                row_dict[str(y_cat)] = round(float(pivot.loc[x_val, y_cat]), 4)
            matrix_data.append(row_dict)

        return matrix_data, y_categories, metadata

    # 8. CORRELATION MATRIX
    if chart_type == ChartType.CORRELATION_MATRIX:
        raw_cols = fields.get("multi_numeric")
        if isinstance(raw_cols, str):
            num_cols = [c.strip() for c in raw_cols.split(",") if c.strip() in filtered_df.columns]
        elif isinstance(raw_cols, list):
            num_cols = [c for c in raw_cols if c in filtered_df.columns]
        else:
            num_cols = [p.name for p in profiles if p.effective_type in (FieldType.INTEGER, FieldType.DECIMAL)]

        if len(num_cols) < 2:
            return [], None, metadata

        num_df = filtered_df[num_cols].apply(pd.to_numeric, errors='coerce').dropna()
        if len(num_df) < 2:
            return [], None, metadata

        corr_matrix = num_df.corr().round(4)
        matrix_data = []
        for col1 in num_cols:
            row_dict = {"variable": col1}
            for col2 in num_cols:
                row_dict[col2] = float(corr_matrix.loc[col1, col2]) if col1 in corr_matrix.index and col2 in corr_matrix.columns else 0.0
            matrix_data.append(row_dict)

        return matrix_data, num_cols, metadata

    return [], None, metadata
