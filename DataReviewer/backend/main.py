"""
Pathology Report Reviewer — FastAPI application entry point.

Registers all routers, configures CORS (open for local use),
and initialises the DuckDB schema on startup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_schema
from routers import upload, patients, reports, extraction, loads


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()
    yield


app = FastAPI(title="Pathology Report Reviewer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")
app.include_router(loads.router, prefix="/api")
