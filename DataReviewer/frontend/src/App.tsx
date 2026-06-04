import { useEffect } from 'react';
import { FileUpload } from './components/FileUpload/FileUpload';
import { PatientList } from './components/PatientList/PatientList';
import { ReportViewer } from './components/ReportViewer/ReportViewer';
import { ExtractionTable } from './components/ExtractionTable/ExtractionTable';
import { LoadSelector } from './components/LoadSelector/LoadSelector';
import { useAppStore } from './store/appStore';
import './App.css';

export default function App() {
  const {
    loadPatients,
    dataLoaded,
    patients,
    selectedPatientId,
    selectedReportDate,
    visitsByPatient,
    selectPatient,
    selectVisit,
  } = useAppStore();

  // Initial data load
  useEffect(() => {
    loadPatients();
  }, []);

  // Auto-select first patient when list first populates
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      selectPatient(patients[0].patient_id);
    }
  }, [patients.length]);

  // Auto-select first visit when visits arrive for the selected patient
  useEffect(() => {
    if (!selectedPatientId || selectedReportDate) return;
    const visits = visitsByPatient[selectedPatientId];
    if (visits && visits.length > 0) {
      selectVisit(selectedPatientId, visits[0].report_date);
    }
  }, [selectedPatientId, visitsByPatient]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">Pathology Report Reviewer</div>
        <FileUpload />
      </header>

      <div className="layout">
        <aside className="sidebar">
          <LoadSelector />
          <PatientList />
        </aside>

        <main className="main-panel">
          {dataLoaded ? (
            <>
              <div className="report-section">
                <ReportViewer />
              </div>
              <div className="extraction-section">
                <ExtractionTable />
              </div>
            </>
          ) : (
            <div className="welcome">
              <h2>Welcome to Pathology Report Reviewer</h2>
              <p>
                Upload a CSV file to get started. The CSV should have columns:{' '}
                <code>index</code>, <code>date</code>, <code>text_result_anonymized</code>.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
