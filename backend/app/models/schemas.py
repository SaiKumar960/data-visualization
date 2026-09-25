from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class FieldType(str, Enum):
    IDENTIFIER = "Identifier"
    BOOLEAN = "Boolean"
    DATE = "Date"
    DATETIME = "DateTime"
    INTEGER = "Integer"
    DECIMAL = "Decimal"
    CATEGORICAL = "Categorical"
    TEXT = "Text"

class ChartType(str, Enum):
    BAR = "bar"
    COLUMN = "column"
    HORIZONTAL_BAR = "horizontal_bar"
    LINE = "line"
    AREA = "area"
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    BOX_PLOT = "box_plot"
    PIE = "pie"
    DONUT = "donut"
    GROUPED_BAR = "grouped_bar"
    STACKED_BAR = "stacked_bar"
    HEATMAP = "heatmap"
    CORRELATION_MATRIX = "correlation_matrix"
    TOP_N_BAR = "top_n_bar"

class FrequencyItem(BaseModel):
    value: Any
    count: int
    percentage: float

class FieldProfile(BaseModel):
    name: str
    detected_type: FieldType
    override_type: Optional[FieldType] = None
    effective_type: FieldType
    row_count: int
    non_null_count: int
    missing_count: int
    missing_pct: float
    unique_count: int
    min_value: Optional[Union[float, int, str]] = None
    max_value: Optional[Union[float, int, str]] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    mode: Optional[Any] = None
    frequency_table: Optional[List[FrequencyItem]] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    date_range_days: Optional[float] = None
    sample_values: Optional[List[Any]] = None
    has_outliers: bool = False
    outlier_count: int = 0
    ambiguity_warning: Optional[str] = None

class Recommendation(BaseModel):
    id: str
    title: str
    description: str
    chart_type: ChartType
    fields: Dict[str, str]  # e.g., {"x": "col1", "y": "col2", "group": "col3"}
    default_aggregation: str = "sum"
    reasoning: str
    is_top_n_default: bool = False
    top_n: Optional[int] = None

class DynamicTypeOverrideRequest(BaseModel):
    new_type: FieldType

class UploadResponse(BaseModel):
    session_id: str
    filename: str
    sheets: List[str]
    active_sheet: str
    row_count: int
    column_count: int

class SelectSheetRequest(BaseModel):
    session_id: str
    sheet_name: str

class FilterConfig(BaseModel):
    selected_values: Optional[List[Any]] = None
    min_val: Optional[Union[float, int]] = None
    max_val: Optional[Union[float, int]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    text_search: Optional[str] = None

class ChartRequest(BaseModel):
    session_id: str
    chart_type: ChartType
    fields: Dict[str, Any]
    aggregation: str = "sum"
    filters: Optional[Dict[str, FilterConfig]] = None
    top_n: Optional[int] = None
    sort_order: Optional[str] = "desc"
    bin_count: Optional[int] = None

class ChartDataResponse(BaseModel):
    chart_type: ChartType
    data: List[Dict[str, Any]]
    series_keys: Optional[List[str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TableRequest(BaseModel):
    session_id: str
    filters: Optional[Dict[str, FilterConfig]] = None
    sort_field: Optional[str] = None
    sort_order: Optional[str] = "asc"
    global_search: Optional[str] = None
    page: int = 1
    page_size: int = 20

class TableResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    filtered_rows: int
    page: int
    page_size: int
    total_pages: int

class QualityIssue(BaseModel):
    field: Optional[str] = None
    issue_type: str
    severity: str
    description: str
    affected_count: int = 0
    affected_pct: float = 0.0
    details: Optional[Dict[str, Any]] = None

class DataQualityReport(BaseModel):
    total_rows: int
    total_cols: int
    health_score: int
    duplicate_rows_count: int
    duplicate_preview: List[Dict[str, Any]] = Field(default_factory=list)
    empty_columns: List[str] = Field(default_factory=list)
    constant_columns: List[str] = Field(default_factory=list)
    suspected_identifiers: List[str] = Field(default_factory=list)
    issues: List[QualityIssue] = Field(default_factory=list)

class UnavailableChartReason(BaseModel):
    chart_type: ChartType
    title: str
    available: bool
    reason: str

class KpiMetric(BaseModel):
    id: str
    label: str
    value: str
    subtext: str
    icon_type: str  # "total", "sum", "average", "top", "health"
    accent_color: str  # "indigo", "emerald", "amber", "purple", "blue"

class KpiSummaryResponse(BaseModel):
    kpis: List[KpiMetric]
