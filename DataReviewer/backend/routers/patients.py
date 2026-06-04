"""
Patients router — navigation endpoints.

GET /api/patients              — distinct patients ordered by most recent visit.
GET /api/patients/{id}/visits  — visits for one patient with extraction status.

Both endpoints accept an optional ?batch_id=N query parameter to restrict
results to a single import batch.
"""

from typing import Optional
from fastapi import APIRouter, Query
from database import get_db
from models import PatientSummary, VisitSummary

router = APIRouter()


@router.get("/patients", response_model=list[PatientSummary])
def list_patients(batch_id: Optional[int] = Query(default=None)):
    with get_db() as conn:
        if batch_id is not None:
            rows = conn.execute("""
                SELECT
                    patient_id,
                    COUNT(DISTINCT report_date) AS visit_count,
                    MAX(report_date)            AS latest_date
                FROM pathology_reports
                WHERE batch_id = ?
                GROUP BY patient_id
                ORDER BY MAX(report_date) DESC
            """, [batch_id]).fetchall()
        else:
            rows = conn.execute("""
                SELECT
                    patient_id,
                    COUNT(DISTINCT report_date) AS visit_count,
                    MAX(report_date)            AS latest_date
                FROM pathology_reports
                GROUP BY patient_id
                ORDER BY MAX(report_date) DESC
            """).fetchall()
    return [
        PatientSummary(patient_id=r[0], visit_count=r[1], latest_date=r[2])
        for r in rows
    ]


@router.get("/patients/{patient_id}/visits", response_model=list[VisitSummary])
def list_visits(patient_id: str, batch_id: Optional[int] = Query(default=None)):
    with get_db() as conn:
        if batch_id is not None:
            rows = conn.execute("""
                SELECT
                    pr.report_date,
                    COUNT(*)          AS segment_count,
                    COUNT(ed.id) > 0  AS has_extraction
                FROM pathology_reports pr
                LEFT JOIN extracted_data ed
                    ON ed.patient_id = pr.patient_id AND ed.report_date = pr.report_date
                WHERE pr.patient_id = ? AND pr.batch_id = ?
                GROUP BY pr.report_date
                ORDER BY pr.report_date DESC
            """, [patient_id, batch_id]).fetchall()
        else:
            rows = conn.execute("""
                SELECT
                    pr.report_date,
                    COUNT(*)          AS segment_count,
                    COUNT(ed.id) > 0  AS has_extraction
                FROM pathology_reports pr
                LEFT JOIN extracted_data ed
                    ON ed.patient_id = pr.patient_id AND ed.report_date = pr.report_date
                WHERE pr.patient_id = ?
                GROUP BY pr.report_date
                ORDER BY pr.report_date DESC
            """, [patient_id]).fetchall()
    return [
        VisitSummary(report_date=r[0], segment_count=r[1], has_extraction=bool(r[2]))
        for r in rows
    ]
