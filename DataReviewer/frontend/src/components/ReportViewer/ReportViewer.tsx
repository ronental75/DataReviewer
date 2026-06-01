import { useAppStore } from '../../store/appStore';
import { hasHebrew } from '../../utils/rtl';
import styles from './ReportViewer.module.css';

const LABEL_COLORS: Record<string, string> = {
  'Final Diagnosis-Dg': '#1a5276',
  'Macroscopexam-Macro': '#6e2fa0',
  'Microscopexam-Micro': '#1a7a4a',
  'FS-DIAGNOSIS': '#7d3c00',
  Malignant: '#c0392b',
};

export function ReportViewer() {
  const { currentSegments, selectedPatientId, selectedReportDate, loadingReport } = useAppStore();

  if (!selectedPatientId) {
    return (
      <div className={styles.placeholder}>
        Select a patient and visit from the sidebar to view the report.
      </div>
    );
  }

  if (loadingReport) {
    return <div className={styles.placeholder}>Loading report…</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.patientLabel} title={selectedPatientId}>
          Patient: <strong>{selectedPatientId.slice(0, 16)}…</strong>
        </span>
        <span className={styles.dateLabel}>Visit: {selectedReportDate}</span>
      </div>
      {currentSegments.map((seg, i) => {
        const label = seg.segment_label ?? 'Note';
        const color = LABEL_COLORS[label] ?? '#444';
        const isRtl = hasHebrew(seg.text_content);
        return (
          <div key={i} className={styles.segment}>
            <div className={styles.segmentLabel} style={{ color }}>
              {label}
            </div>
            <div
              className={styles.segmentText}
              dir="auto"
              style={{ textAlign: isRtl ? 'right' : 'left' }}
            >
              {seg.text_content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
