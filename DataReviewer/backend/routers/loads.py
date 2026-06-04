"""
Loads router — manage CSV import batches.

GET    /api/loads          — list all import batches, newest first
DELETE /api/loads/{id}     — delete a batch and all its pathology records
"""

from fastapi import APIRouter
from database import get_db
from models import ImportBatch

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
        conn.execute("DELETE FROM import_batches WHERE id = ?", [batch_id])
    return {"deleted": True}
