"""
Upload router — POST /api/upload

Accepts a multipart CSV file, delegates parsing to csv_parser,
and upserts the resulting records into pathology_reports.
Re-uploading the same file is safe: existing rows are replaced.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from database import get_connection
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

    conn = get_connection()

    # Upsert each record using DELETE + INSERT (DuckDB safe approach)
    for r in records:
        conn.execute(
            """
            DELETE FROM pathology_reports
            WHERE patient_id = ? AND report_date = ? AND COALESCE(segment_label, '') = COALESCE(?, '')
            """,
            [r["patient_id"], r["report_date"], r["segment_label"]],
        )
        conn.execute(
            """
            INSERT INTO pathology_reports (id, patient_id, report_date, segment_label, text_content, import_batch)
            VALUES (nextval('seq_reports'), ?, ?, ?, ?, ?)
            """,
            [r["patient_id"], r["report_date"], r["segment_label"], r["text_content"], r["import_batch"]],
        )

    patients_count = conn.execute(
        "SELECT COUNT(DISTINCT patient_id) FROM pathology_reports"
    ).fetchone()[0]

    return UploadResponse(
        status="ok",
        rows_imported=len(records),
        patients_found=patients_count,
        filename=file.filename,
    )
