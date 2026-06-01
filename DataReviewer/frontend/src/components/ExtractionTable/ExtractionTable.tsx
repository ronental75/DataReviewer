import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { AddFieldModal } from './AddFieldModal';
import styles from './ExtractionTable.module.css';

export function ExtractionTable() {
  const {
    fields,
    currentValues,
    selectedPatientId,
    selectedReportDate,
    saving,
    updateFieldValue,
    saveCurrentValues,
    addField,
    deleteField,
  } = useAppStore();

  const [showModal, setShowModal] = useState(false);

  const isActive = !!(selectedPatientId && selectedReportDate);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Extracted Data</span>
        <div className={styles.actions}>
          {isActive && (
            <button className={styles.saveBtn} onClick={saveCurrentValues} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            + Add Field
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className={styles.empty}>
          No fields defined. Click "+ Add Field" to start extracting data.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.field_name} className={styles.th}>
                    <span>{f.field_name}</span>
                    {f.field_type === 'select' && (
                      <span className={styles.typeBadge}>list</span>
                    )}
                    <button
                      className={styles.deleteFieldBtn}
                      title={`Delete field "${f.field_name}"`}
                      onClick={() => deleteField(f.field_name)}
                    >
                      ×
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {fields.map((f) => (
                  <td key={f.field_name} className={styles.td}>
                    {f.field_type === 'select' ? (
                      <select
                        className={styles.cellSelect}
                        value={currentValues[f.field_name] ?? ''}
                        disabled={!isActive}
                        onChange={(e) => {
                          updateFieldValue(f.field_name, e.target.value);
                          if (isActive) saveCurrentValues();
                        }}
                      >
                        <option value="">— select —</option>
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={styles.cellInput}
                        value={currentValues[f.field_name] ?? ''}
                        disabled={!isActive}
                        placeholder={isActive ? 'Enter value…' : ''}
                        onChange={(e) => updateFieldValue(f.field_name, e.target.value)}
                        onBlur={isActive ? saveCurrentValues : undefined}
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddFieldModal onAdd={addField} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
