import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { BatchConfig } from '../../types';
import styles from './ColumnConfig.module.css';

export function ColumnConfigButton() {
  const { selectedBatchId, batchColumns } = useAppStore();
  const [open, setOpen] = useState(false);

  if (selectedBatchId == null || batchColumns.length === 0) return null;

  return (
    <>
      <button className={styles.trigger} onClick={() => setOpen(true)} title="Configure columns">
        ⚙ Columns
      </button>
      {open && <ColumnConfigModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ColumnConfigModal({ onClose }: { onClose: () => void }) {
  const { batchColumns, batchConfig, saveBatchConfig } = useAppStore();

  const [sidebarCols, setSidebarCols] = useState<string[]>(batchConfig?.sidebarCols ?? []);
  const [textCols, setTextCols] = useState<string[]>(batchConfig?.textCols ?? []);
  const [saving, setSaving] = useState(false);

  function toggleSidebar(col: string) {
    setSidebarCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function toggleText(col: string) {
    setTextCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  async function handleSave() {
    setSaving(true);
    const config: BatchConfig = { sidebarCols, textCols };
    await saveBatchConfig(config);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span>Configure Columns</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.legend}>
            <span className={styles.legendSidebar}>Sidebar</span>
            <span className={styles.legendText}>Text data</span>
          </div>

          <div className={styles.columnList}>
            {batchColumns.map((col) => (
              <div key={col} className={styles.columnRow}>
                <span className={styles.colName} title={col}>{col}</span>
                <label className={styles.check} title="Show in sidebar">
                  <input
                    type="checkbox"
                    checked={sidebarCols.includes(col)}
                    onChange={() => toggleSidebar(col)}
                  />
                  <span className={styles.sidebarLabel}>Sidebar</span>
                </label>
                <label className={styles.check} title="Show as text in report">
                  <input
                    type="checkbox"
                    checked={textCols.includes(col)}
                    onChange={() => toggleText(col)}
                  />
                  <span className={styles.textLabel}>Text</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
