"""
Reports router — GET /api/reports/{patient_id}/{report_date}

Returns all text segments for a patient visit, sorted in a canonical
display order (Final Diagnosis first, then Macro, Micro, FS, Malignant).
The report_date path parameter uses :path so slashes and spaces are
preserved after URL-decoding.
"""

from fastapi import APIRouter, HTTPException
from database import get_connection
from models import ReportResponse, Segment

router = APIRouter()

SEGMENT_ORDER = [
    "Final Diagnosis-Dg",
    "Macroscopexam-Macro",
    "Microscopexam-Micro",
    "FS-DIAGNOSIS",
    "Malignant",
]


def _segment_sort_key(label: str | None) -> int:
    if label in SEGMENT_ORDER:
        return SEGMENT_ORDER.index(label)
    return len(SEGMENT_ORDER)


@router.get("/reports/{patient_id}/{report_date:path}", response_model=ReportResponse)
def get_report(patient_id: str, report_date: str):
    conn = get_connection()
    rows = conn.execute("""
        SELECT segment_label, text_content
        FROM pathology_reports
        WHERE patient_id = ? AND report_date = ?
    """, [patient_id, report_date]).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Report not found")

    segments = sorted(
        [Segment(segment_label=r[0], text_content=r[1]) for r in rows],
        key=lambda s: _segment_sort_key(s.segment_label),
    )
    return ReportResponse(patient_id=patient_id, report_date=report_date, segments=segments)
