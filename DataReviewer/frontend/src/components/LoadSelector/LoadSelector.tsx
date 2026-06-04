import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './LoadSelector.module.css';

function formatDate(raw: string): string {
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function LoadSelector() {
  const { loads, selectedBatchId, loadLoads, selectBatch, deleteBatch } = useAppStore();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLoads();
  }, []);

  const totalRows = loads.reduce((sum, l) => sum + l.record_count, 0);
  const q = filter.trim().toLowerCase();
  const visible = q
    ? loads.filter((l) => basename(l.filename).toLowerCase().includes(q))
    : loads;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Loads</div>

      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Filter loads…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button className={styles.clearBtn} onClick={() => setFilter('')} title="Clear">
            ✕
          </button>
        )}
      </div>

      {!q && (
        <button
          className={`${styles.allRow} ${selectedBatchId === null ? styles.active : ''}`}
          onClick={() => selectBatch(null)}
        >
          <span>All loads</span>
          <span className={styles.badge}>{totalRows} rows</span>
        </button>
      )}

      {visible.map((load) => (
        <div
          key={load.id}
          className={`${styles.loadRow} ${selectedBatchId === load.id ? styles.active : ''}`}
          onClick={() => selectBatch(load.id)}
        >
          <div className={styles.loadInfo}>
            <span className={styles.loadName} title={load.filename}>
              {basename(load.filename)}
            </span>
            <span className={styles.meta}>
              {formatDate(load.uploaded_at)} · {load.record_count} rows
            </span>
          </div>
          <button
            className={styles.deleteBtn}
            title="Delete this load"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${basename(load.filename)}"?`)) {
                deleteBatch(load.id);
              }
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {visible.length === 0 && (
        <div className={styles.empty}>
          {loads.length === 0 ? 'No loads yet — upload a CSV file.' : 'No loads match the filter.'}
        </div>
      )}
    </div>
  );
}
