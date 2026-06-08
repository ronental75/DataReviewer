"""
Loads router — manage CSV import batches and per-batch column configuration.

GET    /api/loads                    — list all batches, newest first
DELETE /api/loads/{id}               — delete a batch and all its records
GET    /api/loads/{id}/columns       — CSV column names detected at upload time
GET    /api/loads/{id}/config        — display config (sidebar_cols, text_cols)
POST   /api/loads/{id}/config        — save display config
"""

import json
from fastapi import APIRouter, HTTPException
from database import get_db
from models import ImportBatch, BatchConfig

router = APIRouter()


@router.get("/loads", response_model=list[ImportBatch])
def list_loads():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, filename, uploaded_at::VARCHAR, record_count
            FROM import_batches
            ORDER BY uploaded_at DESC
        """).fetchall()
    return [
        ImportBatch(id=r[0], filename=r[1], uploaded_at=r[2], record_count=r[3])
        for r in rows
    ]


@router.delete("/loads/{batch_id}")
def delete_load(batch_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM pathology_reports WHERE batch_id = ?", [batch_id])
        conn.execute("DELETE FROM batch_config WHERE batch_id = ?", [batch_id])
        conn.execute("DELETE FROM import_batches WHERE id = ?", [batch_id])
    return {"deleted": True}


@router.get("/loads/{batch_id}/columns", response_model=list[str])
def get_batch_columns(batch_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT columns_json FROM import_batches WHERE id = ?", [batch_id]
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")
    raw = row[0]
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


@router.get("/loads/{batch_id}/config", response_model=BatchConfig)
def get_batch_config(batch_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT sidebar_cols, text_cols FROM batch_config WHERE batch_id = ?",
            [batch_id],
        ).fetchone()
    if not row:
        return BatchConfig()
    return BatchConfig(
        sidebar_cols=json.loads(row[0] or "[]"),
        text_cols=json.loads(row[1] or "[]"),
    )


@router.post("/loads/{batch_id}/config", response_model=BatchConfig)
def save_batch_config(batch_id: int, config: BatchConfig):
    sidebar_json = json.dumps(config.sidebar_cols)
    text_json    = json.dumps(config.text_cols)
    with get_db() as conn:
        existing = conn.execute(
            "SELECT batch_id FROM batch_config WHERE batch_id = ?", [batch_id]
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE batch_config SET sidebar_cols = ?, text_cols = ? WHERE batch_id = ?",
                [sidebar_json, text_json, batch_id],
            )
        else:
            conn.execute(
                "INSERT INTO batch_config (batch_id, sidebar_cols, text_cols) VALUES (?, ?, ?)",
                [batch_id, sidebar_json, text_json],
            )
    return config
