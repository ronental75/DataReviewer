"""
Upload router — POST /api/upload

Accepts a multipart CSV file plus optional column-mapping form fields
(id_col, date_col, text_col).  Delegates parsing to csv_parser and
inserts the records as a new isolated batch in import_batches.
"""

import json
import duckdb
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from database import get_db
from models import UploadResponse
from services.csv_parser import parse_csv

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    id_col:   Optional[str] = Form(default=None),
    date_col: Optional[str] = Form(default=None),
    text_col: Optional[str] = Form(default=None),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    content = await file.read()
    try:
        records, all_columns = parse_csv(content, file.filename, id_col, date_col, text_col)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    columns_json = json.dumps(all_columns, ensure_ascii=False)

    with get_db() as conn:
        row = conn.execute(
            "INSERT INTO import_batches (id, filename, record_count, columns_json) "
            "VALUES (nextval('seq_batches'), ?, ?, ?) RETURNING id",
            [file.filename, len(records), columns_json],
        ).fetchone()
        batch_id = row[0]

        inserted = 0
        for r in records:
            try:
                conn.execute(
                    """
                    INSERT INTO pathology_reports
                        (id, batch_id, patient_id, report_date,
                         segment_label, text_content, import_batch, extra_data)
                    VALUES (nextval('seq_reports'), ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [batch_id, r["patient_id"], r["report_date"],
                     r["segment_label"], r["text_content"], r["import_batch"],
                     r["extra_data"]],
                )
                inserted += 1
            except duckdb.ConstraintException:
                pass

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
        columns=all_columns,
    )
