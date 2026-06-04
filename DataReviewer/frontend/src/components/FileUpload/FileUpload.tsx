import { useRef, useState } from 'react';
import { uploadCsv } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import type { UploadResponse } from '../../types';
import styles from './FileUpload.module.css';

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { loadLoads, selectBatch } = useAppStore();

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadCsv(file);
      setResult(res);
      await loadLoads();
      await selectBatch(res.batch_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={styles.dropzone}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      {uploading ? (
        <span className={styles.status}>Uploading...</span>
      ) : result ? (
        <span className={styles.success}>
          Imported {result.rows_imported} rows · {result.patients_found} patients
        </span>
      ) : error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        <span className={styles.hint}>Drop a CSV file here or click to upload</span>
      )}
    </div>
  );
}
