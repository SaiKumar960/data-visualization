# Offline Excel Data Visualization Platform

A **fully offline, locally-hosted, schema-agnostic Excel data visualization application** — a lightweight local Power BI / Tableau alternative. 

The system analyzes *any* uploaded Excel file (`.xlsx` or `.xls`), infers semantic field types purely from value inspection (never from column names or hardcoded assumptions), and dynamically exposes only the visualizations that are statistically and logically valid for that data.

---

## Key Guarantees & Constraints

- **Zero Hard-coded Domain Knowledge:** Works identically across commercial sales, HR personnel records, scientific measurements, student marks, or financial ledger data without any dataset-specific logic or column name assumptions.
- **Zero-Network Privacy:** 100% local computation running on `127.0.0.1`. No internet access at runtime, no telemetry, no AI/LLM API calls, no cloud dependencies.
- **Deterministic Recommendation Engine:** Recommendations are generated strictly via explicit decision rules based on effective field types — never labeled as "AI insights".
- **Backend Aggregation Engine:** Charts consume server-side group-by and aggregation queries. The frontend never receives raw unaggregated datasets for chart rendering.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| **Backend** | Python 3.11+, FastAPI | Async Uvicorn server bound strictly to `127.0.0.1:8000` |
| **Data Processing** | Pandas, NumPy, openpyxl, xlrd, scipy | Vectorized operations for speed |
| **Frontend** | React 18 + Vite + TypeScript | Strongly-typed React client |
| **Charts** | Recharts (primary), Custom SVG / Grid renderers | Matrix Heatmap, Correlation Matrix, Box Plot |
| **Styling** | Tailwind CSS + CSS Variables | Dark / Light theme toggle |

---

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point & CORS configuration
│   │   ├── core/
│   │   │   ├── type_classifier.py    # Value-based semantic type detection
│   │   │   ├── profiler.py           # Column statistical profiler & IQR outlier detection
│   │   │   ├── recommendation_engine.py # Deterministic chart rule engine & unavailable reasons
│   │   │   └── quality_checker.py    # Health score & data quality audit logs
│   │   ├── routers/
│   │   │   ├── upload.py             # File upload & workbook inspection
│   │   │   ├── fields.py             # Field profiles & live type overrides
│   │   │   ├── charts.py             # Aggregated chart data & recommendations
│   │   │   ├── table.py              # Server-side paginated data table & CSV export
│   │   │   ├── quality.py            # Data quality report endpoint
│   │   │   └── reset.py              # Session management
│   │   ├── services/
│   │   │   ├── excel_parser.py       # Excel parser (.xlsx/.xls) & header disambiguation
│   │   │   ├── aggregator.py         # Server-side group-by & chart aggregation engine
│   │   │   └── session_store.py      # In-memory session state management
│   │   └── models/
│   │       └── schemas.py            # Pydantic data schemas & Enums
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx            # Navigation, upload, sheet selector, theme toggle
│   │   │   ├── FieldExplorer.tsx     # Expandable field statistics & type override controls
│   │   │   ├── RecommendedCharts.tsx # Auto-generated recommendation grid
│   │   │   ├── ChartBuilder.tsx      # Interactive custom chart builder
│   │   │   ├── FilterPanel.tsx       # Global multi-field AND filters
│   │   │   ├── DataTable.tsx         # Server-side table with search, sort & CSV export
│   │   │   ├── DataQualityPanel.tsx  # Health score & data audit report
│   │   │   ├── Footer.tsx            # Offline security guarantee badge
│   │   │   └── Charts/               # Chart renderers (Bar, Line, Pie, Scatter, Heatmap, etc.)
│   │   ├── api/apiClient.ts          # Typed REST API client
│   │   ├── types/index.ts            # Shared TypeScript interface definitions
│   │   ├── App.tsx                   # Main React dashboard layout
│   │   ├── index.css                 # Styling & theme variables
│   │   └── main.tsx                  # React DOM entry point
│   ├── vite.config.ts
│   └── package.json
├── sample_data/
│   ├── Dataset_A_Sales.xlsx          # Date, Region, Category, Amount, Quantity
│   ├── Dataset_B_Employees.xlsx      # Employee_ID, Department, Age, Salary, Joining_Date, Rating
│   └── Dataset_C_Students.xlsx       # Student_ID, Student_Name, Course, Marks, Attendance, Gender
├── generate_sample_datasets.py      # Sample data generator script
├── test_platform.py                 # Automated unit test suite
├── start_local.bat                  # One-click launcher for Windows
├── start_local.sh                   # One-click launcher for Unix / macOS
└── README.md
```

---

## Quick Start Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**

### 1. One-Click Launcher (Recommended)

#### Windows:
Double-click `start_local.bat` or run in terminal:
```cmd
start_local.bat
```

#### macOS / Linux:
```bash
chmod +x start_local.sh
./start_local.sh
```

The script will automatically start the FastAPI backend server on `http://127.0.0.1:8000`, launch the Vite React frontend on `http://127.0.0.1:5173`, and open your default browser.

---

### 2. Manual Installation & Execution

#### Step A: Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Step B: Frontend Setup
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://localhost:5173` in your browser.

---

## Validation Against Sample Datasets

Run the automated test suite to verify field inference, recommendation generation, and data quality audits across three distinct datasets:

```bash
python test_platform.py
```

### Dataset Test Matrix:

1. **Dataset A (`sample_data/Dataset_A_Sales.xlsx`):**
   - Inferred types: `Transaction_Date` (Date), `Region` (Categorical), `Category` (Categorical), `Amount` (Decimal), `Quantity` (Integer).
   - Generates line trends, cumulative area charts, regional bar charts, category donut charts, grouped bars, and 2D heatmaps.
   - Quality audit flags duplicate rows and missing values.

2. **Dataset B (`sample_data/Dataset_B_Employees.xlsx`):**
   - Inferred types: `Employee_ID` (Identifier), `Department` (Categorical), `Age` (Integer), `Salary` (Decimal), `Joining_Date` (Date), `Performance_Rating` (Integer).
   - `Employee_ID` is classified as Identifier and excluded from quantitative chart measures.
   - Low cardinality rating `Performance_Rating` (1-5) surfaces an ambiguity warning with user override support.
   - Quality audit flags high salary outliers (IQR-based).

3. **Dataset C (`sample_data/Dataset_C_Students.xlsx`):**
   - Inferred types: `Student_ID` (Identifier), `Student_Name` (Identifier), `Course` (Categorical), `Marks` (Decimal), `Attendance_Pct` (Decimal), `Gender` (Categorical).
   - Automatically detects that no date column exists and marks time-series line charts as unavailable with explicit explanations.

---

## Architecture Details

### 1. Dynamic Field Type Classifier
Inspects actual column values to infer one of 8 semantic types:
- `Identifier`: High cardinality ratio (≥85%) with monotonic sequences or alphanumeric code patterns. (Numeric IDs are explicitly prevented from being treated as quantitative measures).
- `Boolean`: Subsets of `{Yes/No}`, `{True/False}`, `{0/1}`, `{Y/N}`, `{T/F}`.
- `Date` / `DateTime`: High-confidence ISO or localized date format parsing.
- `Integer` / `Decimal`: Numeric values with or without fractional components.
- `Categorical`: Non-numeric or low-cardinality values below 5% unique ratio.
- `Text`: High cardinality free-form text strings (avg length > 20 chars).

Users can override any inferred type directly in the **Field Explorer**, immediately updating downstream recommendations and chart queries.

### 2. Context-Aware Chart Builder & Recommendation Engine
Chart types supported:
- **Bar / Column / Horizontal Bar / Top-N Bar:** Categorical × Numeric (with custom ranking cutoff).
- **Line / Area:** Date/DateTime × Numeric (sorted chronologically).
- **Scatter Plot:** Numeric × Numeric (includes linear regression trendline readout slope & R²).
- **Histogram:** Numeric distribution (binned via Sturges' rule or custom slider).
- **Box Plot:** Five-number summary (Min, Q1, Median, Q3, Max) + IQR outliers.
- **Pie / Donut:** Low cardinality Categorical (≤7 categories) × Numeric.
- **Grouped Bar:** Categorical × Categorical × Numeric.
- **2D Heatmap:** Categorical × Categorical 2D intensity grid.
- **Correlation Matrix:** Multi-select Numeric Pearson correlation matrix.

### 3. Global Filter Engine
Supports multi-select categorical search, dual-handle numeric range inputs, date-range pickers, and global text search. All filters combine with AND logic server-side.

### 4. Data Quality Audit Panel
Surfaces an overall Health Score (0–100) alongside audit logs for:
- Missing value counts & percentages.
- Completely empty or constant-value (zero variance) columns.
- Duplicate rows (with interactive sample preview).
- Suspected identifier columns and mixed-type columns.
- Statistical outliers detected via IQR bounds (`Q1 - 1.5*IQR` / `Q3 + 1.5*IQR`).

---

## Offline Security Notice
This application makes **zero network requests** to external servers. All npm and Python dependencies are bundled locally. It contains no analytics, telemetry, tracking, or cloud SDKs.
