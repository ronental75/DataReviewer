"""
CSV parsing service for pathology report imports.

Each CSV row contains a patient ID, a visit date, and a free-text
pathology result.  The text often begins with a structured label
such as "Final Diagnosis-Dg:" or "Macroscopexam-Macro:".  This
module splits that prefix from the body so each segment can be
displayed and filtered individually in the UI.
"""

import pandas as pd
import io
from typing import List, Dict, Optional

# Labels used by the hospital system — matched exactly (case-sensitive)
KNOWN_LABELS = [
    "Final Diagnosis-Dg",
    "Macroscopexam-Macro",
    "Microscopexam-Micro",
    "FS-DIAGNOSIS",
    "Malignant",
]


def _extract_label(text: str) -> tuple[Optional[str], str]:
    """
    Split a pathology text string into (label, content).

    Tries known labels first (exact prefix match), then falls back to a
    heuristic: if the text starts with a short word followed by ':', treat
    that word as the label.  Returns (None, text) when no label is found.
    """
    for label in KNOWN_LABELS:
        prefix = label + ":"
        if text.startswith(prefix):
            return label, text[len(prefix):].strip()

    # Heuristic fallback for unlisted label prefixes
    colon_pos = text.find(":")
    if 0 < colon_pos < 40:
        candidate = text[:colon_pos].strip()
        if " " not in candidate or candidate.split()[0] in ("FS", "Final", "Macro", "Micro", "Malignant"):
            return candidate, text[colon_pos + 1:].strip()

    return None, text


def parse_csv(file_bytes: bytes, filename: str) -> List[Dict]:
    """
    Parse an uploaded CSV and return a list of segment records.

    Expected CSV columns: index (patient ID), date, text_result_anonymized.
    The file must be UTF-8 (with or without BOM).  Each row produces one
    record dict with keys: patient_id, report_date, segment_label,
    text_content, import_batch.

    Raises ValueError if required columns are missing.
    """
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig")

    # Strip BOM and whitespace from column names (common in Windows CSV exports)
    df.columns = [c.strip().lstrip("﻿") for c in df.columns]

    required = {"index", "date", "text_result_anonymized"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing columns: {missing}. Found: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        patient_id = str(row["index"]).strip()
        report_date = str(row["date"]).strip()
        raw_text = str(row["text_result_anonymized"]).strip()

        label, content = _extract_label(raw_text)
        records.append({
            "patient_id": patient_id,
            "report_date": report_date,
            "segment_label": label,
            "text_content": content,
            "import_batch": filename,
        })

    return records
