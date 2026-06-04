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
from typing import Optional
import duckdb

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "pathology.duckdb")

_conn: Optional[duckdb.DuckDBPyConnection] = None
_lock = threading.RLock()


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
    conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_reports START 1")

    # Each CSV upload is stored as a separate named batch
    conn.execute("""
        CREATE TABLE IF NOT EXISTS import_batches (
            id           INTEGER PRIMARY KEY,
            filename     VARCHAR NOT NULL,
            uploaded_at  TIMESTAMP DEFAULT now(),
            record_count INTEGER DEFAULT 0
        )
    """)
    conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_batches START 1")

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

    # Migration: add batch_id column to pathology_reports
    try:
        conn.execute("ALTER TABLE pathology_reports ADD COLUMN batch_id INTEGER")
    except Exception:
        pass  # column already exists

    # Migration: update unique index to include batch_id so different batches
    # can contain the same patient/date/segment without colliding
    try:
        conn.execute("DROP INDEX IF EXISTS idx_reports_unique")
    except Exception:
        pass
    try:
        conn.execute("""
            CREATE UNIQUE INDEX idx_reports_unique
                ON pathology_reports (
                    COALESCE(batch_id, 0),
                    patient_id,
                    report_date,
                    COALESCE(segment_label, '')
                )
        """)
    except Exception:
        pass  # index already updated

    # Migration: assign pre-batch records (batch_id IS NULL) to a legacy batch
    try:
        orphan_count = conn.execute(
            "SELECT COUNT(*) FROM pathology_reports WHERE batch_id IS NULL"
        ).fetchone()[0]
        if orphan_count > 0:
            legacy = conn.execute(
                "SELECT id FROM import_batches WHERE filename = 'Legacy Data'"
            ).fetchone()
            if legacy:
                legacy_id = legacy[0]
            else:
                conn.execute(
                    "INSERT INTO import_batches (id, filename, record_count) "
                    "VALUES (nextval('seq_batches'), 'Legacy Data', ?)",
                    [orphan_count],
                )
                legacy_id = conn.execute("SELECT currval('seq_batches')").fetchone()[0]
            conn.execute(
                "UPDATE pathology_reports SET batch_id = ? WHERE batch_id IS NULL",
                [legacy_id],
            )
    except Exception:
        pass
