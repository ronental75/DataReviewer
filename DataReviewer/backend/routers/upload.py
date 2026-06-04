"""
Upload router — POST /api/upload

Accepts a multipart CSV file, delegates parsing to csv_parser,
and inserts the records as a new isolated batch in import_batches.
Each upload is fully independent; re-uploading the same file creates
a second batch rather than overwriting the first.
"""

import duckdb
from fastapi import APIRouter, UploadFile, File, HTTPException
from database import get_db
from models import UploadResponse
from services.csv_parser import parse_csv

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    content = await file.read()
    try:
        records = parse_csv(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    with get_db() as conn:
        # Register the new batch; use RETURNING to reliably get the generated id
        row = conn.execute(
            "INSERT INTO import_batches (id, filename, record_count) "
            "VALUES (nextval('seq_batches'), ?, ?) RETURNING id",
            [file.filename, len(records)],
        ).fetchone()
        batch_id = row[0]

        # Insert records tagged with this batch.
        # Use try/except instead of ON CONFLICT DO NOTHING because expression-based
        # unique indexes (COALESCE) are not compatible with DuckDB's conflict target
        # resolution for bare ON CONFLICT clauses.
        inserted = 0
        for r in records:
            try:
                conn.execute(
                    """
                    INSERT INTO pathology_reports
                        (id, batch_id, patient_id, report_date,
                         segment_label, text_content, import_batch)
                    VALUES (nextval('seq_reports'), ?, ?, ?, ?, ?, ?)
                    """,
                    [batch_id, r["patient_id"], r["report_date"],
                     r["segment_label"], r["text_content"], r["import_batch"]],
                )
                inserted += 1
            except duckdb.ConstraintException:
                pass  # duplicate row within the same batch

        patients_count = conn.execute(
            "SELECT COUNT(DISTINCT patient_id) FROM pathology_reports WHERE batch_id = ?",
            [batch_id],
        ).fetchone()[0]

    return UploadResponse(
        status="ok",
        rows_imported=inserted,
        patients_found=patients_count,
        filename=file.filename,
        batch_id=batch_id,
    )
