/**
 * Typed Axios wrappers for every backend endpoint.
 *
 * All requests target 127.0.0.1 (explicit IPv4) because on Windows,
 * "localhost" resolves to ::1 (IPv6) first, which the backend does not
 * bind to by default.
 */

import axios from 'axios';
import type {
  PatientSummary,
  VisitSummary,
  ReportResponse,
  ExtractionField,
  ExtractionValues,
  UploadResponse,
} from '../types';

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' });

export const uploadCsv = (file: File): Promise<UploadResponse> => {
  const form = new FormData();
  form.append('file', file);
  return api.post<UploadResponse>('/upload', form).then((r) => r.data);
};

export const fetchPatients = (): Promise<PatientSummary[]> =>
  api.get<PatientSummary[]>('/patients').then((r) => r.data);

export const fetchVisits = (patientId: string): Promise<VisitSummary[]> =>
  api.get<VisitSummary[]>(`/patients/${encodeURIComponent(patientId)}/visits`).then((r) => r.data);

export const fetchReport = (patientId: string, reportDate: string): Promise<ReportResponse> =>
  api
    .get<ReportResponse>(`/reports/${encodeURIComponent(patientId)}/${encodeURIComponent(reportDate)}`)
    .then((r) => r.data);

export const fetchFields = (): Promise<ExtractionField[]> =>
  api.get<ExtractionField[]>('/fields').then((r) => r.data);

export const addField = (fieldName: string, fieldType: 'text' | 'select' = 'text', options: string[] = []): Promise<ExtractionField> =>
  api.post<ExtractionField>('/fields', { field_name: fieldName, field_type: fieldType, options }).then((r) => r.data);

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
