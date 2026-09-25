from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, fields, charts, table, quality, reset

app = FastAPI(
    title="Offline Excel Data Visualization Platform",
    description="Locally-hosted, schema-agnostic Excel analytics engine. Zero telemetry, zero AI/LLM, 100% deterministic local computation.",
    version="1.0.0"
)

# CORS configuration restricted strictly to local origin endpoints
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local development flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(fields.router, prefix="/api", tags=["Fields"])
app.include_router(charts.router, prefix="/api", tags=["Charts"])
app.include_router(table.router, prefix="/api", tags=["Table"])
app.include_router(quality.router, prefix="/api", tags=["Data Quality"])
app.include_router(reset.router, prefix="/api", tags=["Session Reset"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "mode": "100% Offline Local Engine"}
