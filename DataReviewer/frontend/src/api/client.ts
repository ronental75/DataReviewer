/**
 * Typed Axios wrappers for every backend endpoint.
 *
 * All requests target 127.0.0.1 (explicit IPv4) because on Windows,
 * "localhost" resolves to ::1 (IPv6) first, which the backend does not
 * bind to by default.
 */

import axios from 'axios';
import type {
  ImportBatch,
  PatientSummary,
  VisitSummary,
  ReportResponse,
  ExtractionField,
  ExtractionValues,
  UploadResponse,
  BatchConfig,
} from '../types';

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });

export const uploadCsv = (file: File): Promise<UploadResponse> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<UploadResponse>('/upload', form).then((r) => r.data);
};

export const fetchLoads = (): Promise<ImportBatch[]> =>
  api.get<ImportBatch[]>('/loads').then((r) => r.data);

export const deleteLoad = (batchId: number): Promise<void> =>
  api.delete(`/loads/${batchId}`).then(() => undefined);

export const fetchBatchColumns = (batchId: number): Promise<string[]> =>
  api.get<string[]>(`/loads/${batchId}/columns`).then((r) => r.data);

export const fetchBatchConfig = (batchId: number): Promise<BatchConfig> =>
  api
    .get<{ sidebar_cols: string[]; text_cols: string[] }>(`/loads/${batchId}/config`)
    .then((r) => ({ sidebarCols: r.data.sidebar_cols, textCols: r.data.text_cols }));

export const saveBatchConfig = (batchId: number, config: BatchConfig): Promise<void> =>
  api
    .post(`/loads/${batchId}/config`, {
      sidebar_cols: config.sidebarCols,
      text_cols: config.textCols,
    })
    .then(() => undefined);

export const fetchPatients = (batchId?: number): Promise<PatientSummary[]> =>
  api
    .get<PatientSummary[]>('/patients', {
      params: batchId != null ? { batch_id: batchId } : {},
    })
    .then((r) => r.data);

export const fetchVisits = (patientId: string, batchId?: number): Promise<VisitSummary[]> =>
  api
    .get<VisitSummary[]>(`/patients/${encodeURIComponent(patientId)}/visits`, {
      params: batchId != null ? { batch_id: batchId } : {},
    })
    .then((r) => r.data);

export const fetchReport = (patientId: string, reportDate: string): Promise<ReportResponse> =>
  api
    .get<ReportResponse>(`/reports/${encodeURIComponent(patientId)}/${encodeURIComponent(reportDate)}`)
    .then((r) => r.data);

export const fetchFields = (): Promise<ExtractionField[]> =>
  api.get<ExtractionField[]>('/fields').then((r) => r.data);

export const addField = (
  fieldName: string,
  fieldType: 'text' | 'select' = 'text',
  options: string[] = []
): Promise<ExtractionField> =>
  api
    .post<ExtractionField>('/fields', { field_name: fieldName, field_type: fieldType, options })
    .then((r) => r.data);

export const deleteField = (fieldName: string): Promise<void> =>
  api.delete(`/fields/${encodeURIComponent(fieldName)}`).then(() => undefined);

export const fetchExtraction = (patientId: string, reportDate: string): Promise<ExtractionValues> =>
  api
    .get<ExtractionValues>(
      `/extraction/${encodeURIComponent(patientId)}/${encodeURIComponent(reportDate)}`
    )
    .then((r) => r.data);

export const saveExtraction = (
  patientId: string,
  reportDate: string,
  values: Record<string, string>
): Promise<void> =>
  api
    .put(`/extraction/${encodeURIComponent(patientId)}/${encodeURIComponent(reportDate)}`, { values })
    .then(() => undefined);

export const getExportUrl = () => 'http://127.0.0.1:8000/api/extraction/export';
