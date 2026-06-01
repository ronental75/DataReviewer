"""
Extraction router — field schema management and data CRUD.

Fields:
  GET    /api/fields                   — list all defined fields
  POST   /api/fields                   — add a field (text or select type)
  DELETE /api/fields/{name}            — remove a field definition
  PUT    /api/fields/reorder           — reorder fields by drag-and-drop

Extracted data:
  GET    /api/extraction/{id}/{date}   — get values for a patient visit
  PUT    /api/extraction/{id}/{date}   — save (upsert) values for a visit

Export:
  GET    /api/extraction/export        — download all data as wide CSV

Upsert strategy: DELETE + INSERT rather than ON CONFLICT UPDATE, because
DuckDB's conflict handling requires the conflicting row to already exist.
Options for select-type fields are stored as a comma-separated string.
"""

import io
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from database import get_connection
from models import (
    ExtractionField,
    AddFieldRequest,
    ReorderFieldsRequest,
    ExtractionValues,
    SaveExtractionRequest,
)

router = APIRouter()


# ── Fields ──────────────────────────────────────────────────────────────────

@router.get("/fields", response_model=list[ExtractionField])
def list_fields():
    conn = get_connection()
    rows = conn.execute(
        "SELECT field_name, field_order, field_type, options FROM extraction_fields ORDER BY field_order, id"
    ).fetchall()
    return [
        ExtractionField(
            field_name=r[0],
            field_order=r[1],
            field_type=r[2] or "text",
            options=[o.strip() for o in (r[3] or "").split(",") if o.strip()],
        )
        for r in rows
    ]


@router.post("/fields", response_model=ExtractionField, status_code=201)
def add_field(body: AddFieldRequest):
    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM extraction_fields WHERE field_name = ?", [body.field_name]
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Field already exists")

    max_order = conn.execute(
        "SELECT COALESCE(MAX(field_order), 0) FROM extraction_fields"
    ).fetchone()[0]
    new_order = max_order + 1
    options_str = ",".join(body.options)

    conn.execute(
        "INSERT INTO extraction_fields (id, field_name, field_type, options, field_order) VALUES (nextval('seq_fields'), ?, ?, ?, ?)",
        [body.field_name, body.field_type, options_str, new_order],
    )
    return ExtractionField(field_name=body.field_name, field_order=new_order, field_type=body.field_type, options=body.options)


@router.delete("/fields/{field_name}")
def delete_field(field_name: str):
    conn = get_connection()
    conn.execute("DELETE FROM extraction_fields WHERE field_name = ?", [field_name])
    return {"deleted": True}


@router.put("/fields/reorder")
def reorder_fields(body: ReorderFieldsRequest):
    conn = get_connection()
    for i, name in enumerate(body.ordered_fields):
        conn.execute(
            "UPDATE extraction_fields SET field_order = ? WHERE field_name = ?",
            [i + 1, name],
        )
    return {"status": "ok"}


# ── Extracted data ───────────────────────────────────────────────────────────

@router.get("/extraction/{patient_id}/{report_date:path}", response_model=ExtractionValues)
def get_extraction(patient_id: str, report_date: str):
    conn = get_connection()
    rows = conn.execute("""
        SELECT field_name, field_value
        FROM extracted_data
        WHERE patient_id = ? AND report_date = ?
    """, [patient_id, report_date]).fetchall()
    values = {r[0]: r[1] or "" for r in rows}
    return ExtractionValues(patient_id=patient_id, report_date=report_date, values=values)


@router.put("/extraction/{patient_id}/{report_date:path}")
def save_extraction(patient_id: str, report_date: str, body: SaveExtractionRequest):
    conn = get_connection()
    for field_name, field_value in body.values.items():
        # Upsert via delete + insert
        conn.execute("""
            DELETE FROM extracted_data
            WHERE patient_id = ? AND report_date = ? AND field_name = ?
        """, [patient_id, report_date, field_name])
        conn.execute("""
            INSERT INTO extracted_data (id, patient_id, report_date, field_name, field_value, updated_at)
            VALUES (nextval('seq_extracted'), ?, ?, ?, ?, now())
        """, [patient_id, report_date, field_name, field_value])
    return {"status": "ok"}


# ── Export ───────────────────────────────────────────────────────────────────

@router.get("/extraction/export")
def export_extraction():
    conn = get_connection()

    fields = [
        r[0]
        for r in conn.execute(
            "SELECT field_name FROM extraction_fields ORDER BY field_order, id"
        ).fetchall()
    ]

    rows = conn.execute("""
        SELECT DISTINCT patient_id, report_date
        FROM pathology_reports
        ORDER BY patient_id, report_date
    """).fetchall()

    records = []
    for patient_id, report_date in rows:
        record = {"patient_id": patient_id, "report_date": report_date}
        values = conn.execute("""
            SELECT field_name, field_value FROM extracted_data
            WHERE patient_id = ? AND report_date = ?
        """, [patient_id, report_date]).fetchall()
        val_map = {v[0]: v[1] or "" for v in values}
        for f in fields:
            record[f] = val_map.get(f, "")
        records.append(record)

    df = pd.DataFrame(records, columns=["patient_id", "report_date"] + fields)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=extracted_data.csv"},
    )
