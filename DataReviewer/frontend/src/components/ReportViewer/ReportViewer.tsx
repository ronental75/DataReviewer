import { useAppStore } from '../../store/appStore';
import { processReportText } from '../../utils/rtl';
import type { TextChunk } from '../../utils/rtl';
import styles from './ReportViewer.module.css';

const LABEL_COLORS: Record<string, string> = {
  'Final Diagnosis-Dg': '#1a5276',
  'Macroscopexam-Macro': '#6e2fa0',
  'Microscopexam-Micro': '#1a7a4a',
  'FS-DIAGNOSIS': '#7d3c00',
  Malignant: '#c0392b',
};

function paragraphDir(chunks: TextChunk[]): 'rtl' | 'ltr' {
  return chunks.some((c) => c.isHebrew) ? 'rtl' : 'ltr';
}

function SegmentBlock({ label, text, color }: { label: string; text: string; color: string }) {
  const paragraphs = processReportText(text);
  return (
    <div className={styles.segment}>
      <h3 className={styles.segmentHeader} style={{ color, borderLeftColor: color }}>
        {label}
      </h3>
      <div className={styles.segmentText}>
        {paragraphs.map((chunks, pi) => {
          const dir = paragraphDir(chunks);
          return (
            <p key={pi} className={styles.paragraph} dir={dir} style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {chunks.map((chunk, ci) => (
                <span key={ci} dir={chunk.isHebrew ? 'rtl' : 'ltr'} className={chunk.isHebrew ? styles.rtlChunk : styles.ltrChunk}>
                  {chunk.text}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function ReportViewer() {
  const {
    currentSegments,
    selectedPatientId,
    selectedReportDate,
    loadingReport,
    batchConfig,
    currentExtraData,
  } = useAppStore();

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

  const textCols = batchConfig?.textCols ?? [];

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
        return <SegmentBlock key={i} label={label} text={seg.text_content} color={color} />;
      })}

      {textCols.map((col) => {
        const val = currentExtraData?.[col];
        if (!val) return null;
        return <SegmentBlock key={col} label={col} text={val} color="#555" />;
      })}
    </div>
  );
}
