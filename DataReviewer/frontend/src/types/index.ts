export interface ImportBatch {
  id: number;
  filename: string;
  uploaded_at: string;
  record_count: number;
}

export interface UploadResponse {
  status: string;
  rows_imported: number;
  patients_found: number;
  filename: string;
  batch_id: number;
  columns: string[];
}

export interface PatientSummary {
  patient_id: string;
  visit_count: number;
  latest_date: string;
}

export interface VisitSummary {
  report_date: string;
  segment_count: number;
  has_extraction: boolean;
  extra_data: Record<string, string>;
}

export interface Segment {
  segment_label: string | null;
  text_content: string;
}

export interface ReportResponse {
  patient_id: string;
  report_date: string;
  segments: Segment[];
  extra_data: Record<string, string>;
}

export interface ExtractionField {
  field_name: string;
  field_order: number;
  field_type: 'text' | 'select';
  options: string[];
}

export interface ExtractionValues {
  patient_id: string;
  report_date: string;
  values: Record<string, string>;
}

export interface BatchConfig {
  sidebarCols: string[];
  textCols: string[];
}
