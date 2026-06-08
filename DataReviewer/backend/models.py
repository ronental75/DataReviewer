from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    status: str
    rows_imported: int
    patients_found: int
    filename: str
    batch_id: int
    columns: list[str] = []


class ImportBatch(BaseModel):
    id: int
    filename: str
    uploaded_at: str
    record_count: int


class PatientSummary(BaseModel):
    patient_id: str
    visit_count: int
    latest_date: str


class VisitSummary(BaseModel):
    report_date: str
    segment_count: int
    has_extraction: bool
    extra_data: dict = {}


class Segment(BaseModel):
    segment_label: Optional[str]
    text_content: str


class ReportResponse(BaseModel):
    patient_id: str
    report_date: str
    segments: list[Segment]
    extra_data: dict = {}


class ExtractionField(BaseModel):
    field_name: str
    field_order: int
    field_type: str = "text"
    options: list[str] = []


class AddFieldRequest(BaseModel):
    field_name: str
    field_type: str = "text"
    options: list[str] = []


class ReorderFieldsRequest(BaseModel):
    ordered_fields: list[str]


class ExtractionValues(BaseModel):
    patient_id: str
    report_date: str
    values: dict[str, str]


class SaveExtractionRequest(BaseModel):
    values: dict[str, str]


class BatchConfig(BaseModel):
    sidebar_cols: list[str] = []
    text_cols: list[str] = []
