/**
 * Global Zustand store.
 *
 * loadPatients() is intentionally kept simple — it only fetches data and
 * updates the store.  Auto-selection of the first patient and first visit
 * is handled by useEffect hooks in App.tsx, which react to store changes
 * and can fire independently without causing cascading async failures.
 */

import { create } from 'zustand';
import type { PatientSummary, VisitSummary, Segment, ExtractionField } from '../types';
import {
  fetchPatients,
  fetchVisits,
  fetchReport,
  fetchFields,
  fetchExtraction,
  saveExtraction,
  addField as apiAddField,
  deleteField as apiDeleteField,
} from '../api/client';

interface AppState {
  dataLoaded: boolean;
  selectedPatientId: string | null;
  selectedReportDate: string | null;
  patients: PatientSummary[];
  visitsByPatient: Record<string, VisitSummary[]>;
  currentSegments: Segment[];
  fields: ExtractionField[];
  currentValues: Record<string, string>;
  saving: boolean;
  loadingReport: boolean;

  loadPatients: () => Promise<void>;
  selectPatient: (id: string) => Promise<void>;
  selectVisit: (patientId: string, date: string) => Promise<void>;
  updateFieldValue: (fieldName: string, value: string) => void;
  saveCurrentValues: () => Promise<void>;
  addField: (name: string, fieldType?: 'text' | 'select', options?: string[]) => Promise<void>;
  deleteField: (name: string) => Promise<void>;
  refreshVisits: (patientId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  dataLoaded: false,
  selectedPatientId: null,
  selectedReportDate: null,
  patients: [],
  visitsByPatient: {},
  currentSegments: [],
  fields: [],
  currentValues: {},
  saving: false,
  loadingReport: false,

  loadPatients: async () => {
    const [patients, fields] = await Promise.all([fetchPatients(), fetchFields()]);
    set({ patients, fields, dataLoaded: patients.length > 0 });
  },

  selectPatient: async (id: string) => {
    set({ selectedPatientId: id, selectedReportDate: null, currentSegments: [], currentValues: {} });
    const visits = await fetchVisits(id);
    set((s) => ({ visitsByPatient: { ...s.visitsByPatient, [id]: visits } }));
  },

  selectVisit: async (patientId: string, date: string) => {
    set({ selectedPatientId: patientId, selectedReportDate: date, loadingReport: true });
    const [report, extraction] = await Promise.all([
      fetchReport(patientId, date),
      fetchExtraction(patientId, date),
    ]);
    set({ currentSegments: report.segments, currentValues: extraction.values, loadingReport: false });
  },

  updateFieldValue: (fieldName: string, value: string) => {
    set((s) => ({ currentValues: { ...s.currentValues, [fieldName]: value } }));
  },

  saveCurrentValues: async () => {
    const { selectedPatientId, selectedReportDate, currentValues } = get();
    if (!selectedPatientId || !selectedReportDate) return;
    set({ saving: true });
    await saveExtraction(selectedPatientId, selectedReportDate, currentValues);
    set({ saving: false });
    // Refresh visit list so has_extraction indicator updates
    const visits = await fetchVisits(selectedPatientId);
    set((s) => ({ visitsByPatient: { ...s.visitsByPatient, [selectedPatientId]: visits } }));
  },

  addField: async (name: string, fieldType: 'text' | 'select' = 'text', options: string[] = []) => {
    const field = await apiAddField(name, fieldType, options);
    set((s) => ({ fields: [...s.fields, field] }));
  },

  deleteField: async (name: string) => {
    await apiDeleteField(name);
    set((s) => ({ fields: s.fields.filter((f) => f.field_name !== name) }));
  },

  refreshVisits: async (patientId: string) => {
    const visits = await fetchVisits(patientId);
    set((s) => ({ visitsByPatient: { ...s.visitsByPatient, [patientId]: visits } }));
  },
}));
