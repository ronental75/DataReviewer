import { create } from 'zustand';
import type { ImportBatch, PatientSummary, VisitSummary, Segment, ExtractionField, BatchConfig } from '../types';
import {
  fetchLoads,
  deleteLoad as apiDeleteLoad,
  fetchPatients,
  fetchVisits,
  fetchReport,
  fetchFields,
  fetchExtraction,
  saveExtraction,
  addField as apiAddField,
  deleteField as apiDeleteField,
  fetchBatchColumns,
  fetchBatchConfig,
  saveBatchConfig as apiSaveBatchConfig,
} from '../api/client';

interface AppState {
  dataLoaded: boolean;
  selectedPatientId: string | null;
  selectedReportDate: string | null;
  patients: PatientSummary[];
  visitsByPatient: Record<string, VisitSummary[]>;
  currentSegments: Segment[];
  currentExtraData: Record<string, string>;
  fields: ExtractionField[];
  currentValues: Record<string, string>;
  saving: boolean;
  loadingReport: boolean;
  loads: ImportBatch[];
  selectedBatchId: number | null;
  batchColumns: string[];
  batchConfig: BatchConfig | null;

  loadLoads: () => Promise<void>;
  selectBatch: (batchId: number | null) => Promise<void>;
  deleteBatch: (batchId: number) => Promise<void>;
  loadPatients: () => Promise<void>;
  selectPatient: (id: string) => Promise<void>;
  selectVisit: (patientId: string, date: string) => Promise<void>;
  updateFieldValue: (fieldName: string, value: string) => void;
  saveCurrentValues: () => Promise<void>;
  addField: (name: string, fieldType?: 'text' | 'select', options?: string[]) => Promise<void>;
  deleteField: (name: string) => Promise<void>;
  refreshVisits: (patientId: string) => Promise<void>;
  saveBatchConfig: (config: BatchConfig) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  dataLoaded: false,
  selectedPatientId: null,
  selectedReportDate: null,
  patients: [],
  visitsByPatient: {},
  currentSegments: [],
  currentExtraData: {},
  fields: [],
  currentValues: {},
  saving: false,
  loadingReport: false,
  loads: [],
  selectedBatchId: null,
  batchColumns: [],
  batchConfig: null,

  loadLoads: async () => {
    const loads = await fetchLoads();
    set({ loads });
  },

  selectBatch: async (batchId: number | null) => {
    set({
      selectedBatchId: batchId,
      selectedPatientId: null,
      selectedReportDate: null,
      currentSegments: [],
      currentExtraData: {},
      currentValues: {},
      patients: [],
      visitsByPatient: {},
      dataLoaded: false,
      batchColumns: [],
      batchConfig: null,
    });

    const [patients] = await Promise.all([fetchPatients(batchId ?? undefined)]);
    set({ patients, dataLoaded: patients.length > 0 });

    if (batchId != null) {
      const [columns, config] = await Promise.all([
        fetchBatchColumns(batchId),
        fetchBatchConfig(batchId),
      ]);
      set({ batchColumns: columns, batchConfig: config });
    }
  },

  deleteBatch: async (batchId: number) => {
    await apiDeleteLoad(batchId);
    set((s) => ({ loads: s.loads.filter((l) => l.id !== batchId) }));
    if (get().selectedBatchId === batchId) {
      await get().selectBatch(null);
    }
  },

  loadPatients: async () => {
    const { selectedBatchId } = get();
    const [patients, fields] = await Promise.all([
      fetchPatients(selectedBatchId ?? undefined),
      fetchFields(),
    ]);
    set({ patients, fields, dataLoaded: patients.length > 0 });

    if (selectedBatchId != null) {
      const [columns, config] = await Promise.all([
        fetchBatchColumns(selectedBatchId),
        fetchBatchConfig(selectedBatchId),
      ]);
      set({ batchColumns: columns, batchConfig: config });
    }
  },

  selectPatient: async (id: string) => {
    const { selectedBatchId } = get();
    set({ selectedPatientId: id, selectedReportDate: null, currentSegments: [], currentExtraData: {}, currentValues: {} });
    const visits = await fetchVisits(id, selectedBatchId ?? undefined);
    set((s) => ({ visitsByPatient: { ...s.visitsByPatient, [id]: visits } }));
  },

  selectVisit: async (patientId: string, date: string) => {
    set({ selectedPatientId: patientId, selectedReportDate: date, loadingReport: true });
    const [report, extraction] = await Promise.all([
      fetchReport(patientId, date),
      fetchExtraction(patientId, date),
    ]);
    set({
      currentSegments: report.segments,
      currentExtraData: report.extra_data ?? {},
      currentValues: extraction.values,
      loadingReport: false,
    });
  },

  updateFieldValue: (fieldName: string, value: string) => {
    set((s) => ({ currentValues: { ...s.currentValues, [fieldName]: value } }));
  },

  saveCurrentValues: async () => {
    const { selectedPatientId, selectedReportDate, currentValues, selectedBatchId } = get();
    if (!selectedPatientId || !selectedReportDate) return;
    set({ saving: true });
    await saveExtraction(selectedPatientId, selectedReportDate, currentValues);
    set({ saving: false });
    const visits = await fetchVisits(selectedPatientId, selectedBatchId ?? undefined);
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
    const { selectedBatchId } = get();
    const visits = await fetchVisits(patientId, selectedBatchId ?? undefined);
    set((s) => ({ visitsByPatient: { ...s.visitsByPatient, [patientId]: visits } }));
  },

  saveBatchConfig: async (config: BatchConfig) => {
    const { selectedBatchId } = get();
    if (selectedBatchId == null) return;
    await apiSaveBatchConfig(selectedBatchId, config);
    set({ batchConfig: config });
  },
}));
