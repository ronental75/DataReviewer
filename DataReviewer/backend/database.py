"""
DuckDB connection management and schema initialisation.

A single persistent connection is reused across all requests.
On startup, a CHECKPOINT is issued so that any write-ahead log
left over from a previous hard kill is flushed before queries run.
If the WAL file is corrupt, it is removed and the connection retried.
"""

import os
import threading
from contextlib import contextmanager
import duckdb

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "pathology.duckdb")

_conn: duckdb.DuckDBPyConnection | None = None
_lock = threading.Lock()


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return the shared DuckDB connection, opening it on first call."""
    global _conn
    if _conn is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        try:
            _conn = duckdb.connect(DB_PATH)
            _conn.execute("CHECKPOINT")  # flush any leftover WAL from hard kills
        except Exception:
            # WAL may be corrupt — remove it and retry once
            wal = DB_PATH + ".wal"
            if os.path.exists(wal):
                os.remove(wal)
            _conn = duckdb.connect(DB_PATH)
    return _conn


@contextmanager
def get_db():
    """Yield the shared connection under a lock so concurrent requests don't interleave."""
    with _lock:
        yield get_connection()


def init_schema() -> None:
    """
    Create all tables and sequences if they do not already exist.
    Also runs lightweight migrations (ALTER TABLE ADD COLUMN IF NOT EXISTS)
    so existing databases gain new columns without data loss.
    """
    conn = get_connection()

    # Raw pathology text segments imported from CSV
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pathology_reports (
            id            INTEGER PRIMARY KEY,
            patient_id    VARCHAR NOT NULL,
            report_date   VARCHAR NOT NULL,
            segment_label VARCHAR,
            text_content  VARCHAR NOT NULL,
            import_batch  VARCHAR,
            created_at    TIMESTAMP DEFAULT now()
        )
    """)
    # Prevents duplicate segments when the same CSV is re-uploaded
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique
            ON pathology_reports (patient_id, report_date, COALESCE(segment_label, ''))
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_reports START 1")

    # Doctor-defined fields to extract (name, display order, type, options)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS extraction_fields (
            id          INTEGER PRIMARY KEY,
            field_name  VARCHAR NOT NULL UNIQUE,
            field_type  VARCHAR DEFAULT 'text',
            options     VARCHAR DEFAULT '',
            field_order INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT now()
        )
    """)
    # Migration: add columns introduced after initial release
    for col, definition in [
        ("field_type", "VARCHAR DEFAULT 'text'"),
        ("options",    "VARCHAR DEFAULT ''"),
    ]:
        try:
            conn.execute(f"ALTER TABLE extraction_fields ADD COLUMN {col} {definition}")
        except Exception:
            pass  # column already exists

    conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_fields START 1")

    # Extracted values entered by the doctor (one row per patient/visit/field)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS extracted_data (
            id          INTEGER PRIMARY KEY,
            patient_id  VARCHAR NOT NULL,
            report_date VARCHAR NOT NULL,
            field_name  VARCHAR NOT NULL,
            field_value VARCHAR,
            updated_at  TIMESTAMP DEFAULT now()
        )
    """)
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_extracted_unique
            ON extracted_data (patient_id, report_date, field_name)
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_extracted START 1")
