import { useState } from 'react';
import styles from './AddFieldModal.module.css';

interface Props {
  onAdd: (name: string, fieldType: 'text' | 'select', options: string[]) => Promise<void>;
  onClose: () => void;
}

export function AddFieldModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'select'>('text');
  const [optionsRaw, setOptionsRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const options = fieldType === 'select'
      ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean)
      : [];
    if (fieldType === 'select' && options.length === 0) {
      setError('Please enter at least one option.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(trimmed, fieldType, options);
      onClose();
    } catch {
      setError('Field already exists or could not be created.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Add Extraction Field</h3>

        <label className={styles.label}>Field name</label>
        <input
          className={styles.input}
          autoFocus
          placeholder="e.g. ER Status, Tumor Size"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        <label className={styles.label}>Input type</label>
        <div className={styles.typeRow}>
          <label className={styles.typeOption}>
            <input type="radio" name="fieldType" value="text" checked={fieldType === 'text'} onChange={() => setFieldType('text')} />
            <span>Free text</span>
          </label>
          <label className={styles.typeOption}>
            <input type="radio" name="fieldType" value="select" checked={fieldType === 'select'} onChange={() => setFieldType('select')} />
            <span>Choose from list</span>
          </label>
        </div>

        {fieldType === 'select' && (
          <>
            <label className={styles.label}>Options <span className={styles.hint}>(comma-separated)</span></label>
            <input
              className={styles.input}
              placeholder="e.g. Positive, Negative, Equivocal"
              value={optionsRaw}
              onChange={(e) => setOptionsRaw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            {optionsRaw && (
              <div className={styles.preview}>
                {optionsRaw.split(',').map(o => o.trim()).filter(Boolean).map(o => (
                  <span key={o} className={styles.chip}>{o}</span>
                ))}
              </div>
            )}
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={submit} disabled={loading || !name.trim()}>
            {loading ? 'Adding…' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
