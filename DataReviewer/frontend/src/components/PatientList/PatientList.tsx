import { useAppStore } from '../../store/appStore';
import { getExportUrl } from '../../api/client';
import styles from './PatientList.module.css';

function truncateId(id: string) {
  return id.length > 14 ? id.slice(0, 14) + '…' : id;
}

export function PatientList() {
  const {
    patients,
    selectedPatientId,
    selectedReportDate,
    visitsByPatient,
    dataLoaded,
    selectPatient,
    selectVisit,
  } = useAppStore();

  if (!dataLoaded) {
    return <div className={styles.empty}>Upload a CSV to begin</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>Patients ({patients.length})</div>
      <ul className={styles.list}>
        {patients.map((p) => {
          const isExpanded = selectedPatientId === p.patient_id;
          const visits = visitsByPatient[p.patient_id] ?? [];
          return (
            <li key={p.patient_id}>
              <button
                className={`${styles.patientBtn} ${isExpanded ? styles.active : ''}`}
                title={p.patient_id}
                onClick={() => selectPatient(p.patient_id)}
              >
                <span className={styles.id}>{truncateId(p.patient_id)}</span>
                <span className={styles.badge}>{p.visit_count}</span>
              </button>
              {isExpanded && visits.length > 0 && (
                <ul className={styles.visitList}>
                  {visits.map((v) => (
                    <li key={v.report_date}>
                      <button
                        className={`${styles.visitBtn} ${
                          selectedReportDate === v.report_date ? styles.visitActive : ''
                        }`}
                        onClick={() => selectVisit(p.patient_id, v.report_date)}
                      >
                        {v.has_extraction && <span className={styles.dot} title="Has extraction" />}
                        <span>{v.report_date}</span>
                        <span className={styles.segCount}>{v.segment_count} seg.</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className={styles.footer}>
        <a className={styles.exportBtn} href={getExportUrl()} download="extracted_data.csv">
          Export CSV
        </a>
      </div>
    </div>
  );
}
