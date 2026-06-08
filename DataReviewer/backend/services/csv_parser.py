"""
CSV parsing service for pathology report imports.

Supports flexible column detection (old `index`/`date`/`text_result_anonymized`
format and new `hashed_id`/`biopsy_date`/`raw.anonymize.a_Result` format).

When the text column contains multiple sections joined by |||, each section
is stored as a separate segment with its own label.  Labels may be followed
by either ':' (old format) or a space (new format).

All non-ID, non-date column values are preserved in extra_data JSON.
"""

import json
import pandas as pd
import io
from typing import List, Dict, Optional

KNOWN_LABELS = [
    "Final Diagnosis-Dg",
    "Macroscopexam-Macro",
    "Microscopexam-Micro",
    "FS-DIAGNOSIS",
    "Malignant",
]

_ID_CANDIDATES   = ["index", "hashed_id", "patient_id", "id"]
_DATE_CANDIDATES = ["date", "biopsy_date", "Biopsy date", "report_date",
                    "Request Date", "date_bdika"]
_TEXT_CANDIDATES = ["text_result_anonymized", "raw.anonymize.a_Result",
                    "result", "text_content"]


def _pick(columns: list[str], candidates: list[str], fallback_idx: int = 0) -> str:
    for c in candidates:
        if c in columns:
            return c
    keywords = [c.lower().split("_")[0] for c in candidates]
    for col in columns:
        if any(kw in col.lower() for kw in keywords):
            return col
    return columns[fallback_idx]


def detect_columns(file_bytes: bytes) -> dict:
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig", nrows=0)
    df.columns = [c.strip().lstrip("﻿") for c in df.columns]
    cols = list(df.columns)
    return {
        "id_col":   _pick(cols, _ID_CANDIDATES, 0),
        "date_col": _pick(cols, _DATE_CANDIDATES, 1),
        "text_col": _pick(cols, _TEXT_CANDIDATES, 2 if len(cols) > 2 else 0),
        "all_cols": cols,
    }


def _extract_label(text: str) -> tuple[Optional[str], str]:
    """
    Split a section into (label, content).
    Handles both 'Label:content' and 'Label content' separators.
    """
    for label in KNOWN_LABELS:
        # Colon separator: "LabelName:content"
        if text.startswith(label + ":"):
            return label, text[len(label) + 1:].strip()
        # Space separator: "LabelName content" (new CSV format)
        if text.startswith(label + " ") or text == label:
            return label, text[len(label):].strip()

    # Heuristic: short word before ':'
    colon_pos = text.find(":")
    if 0 < colon_pos < 40:
        candidate = text[:colon_pos].strip()
        if " " not in candidate or candidate.split()[0] in ("FS", "Final", "Macro", "Micro", "Malignant"):
            return candidate, text[colon_pos + 1:].strip()

    return None, text


def _split_sections(raw_text: str) -> list[str]:
    """
    Split a text field on ||| delimiters into individual sections.
    Strips leading commas/whitespace from each part.
    Returns the original text as a single-element list when no ||| is present.
    """
    parts = raw_text.split("|||")
    sections = []
    for part in parts:
        cleaned = part.strip().lstrip(",").strip()
        if cleaned:
            sections.append(cleaned)
    return sections or [raw_text]


def parse_csv(
    file_bytes: bytes,
    filename: str,
    id_col: Optional[str] = None,
    date_col: Optional[str] = None,
    text_col: Optional[str] = None,
) -> tuple[List[Dict], List[str]]:
    """
    Parse an uploaded CSV and return (records, all_columns).

    Each ||| section inside the text column becomes a separate segment record.
    """
    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig", dtype=str)
    df.columns = [c.strip().lstrip("﻿") for c in df.columns]
    df = df.fillna("")

    cols = list(df.columns)

    id_col   = id_col   or _pick(cols, _ID_CANDIDATES, 0)
    date_col = date_col or _pick(cols, _DATE_CANDIDATES, 1 if len(cols) > 1 else 0)
    text_col = text_col or _pick(cols, _TEXT_CANDIDATES, 2 if len(cols) > 2 else 0)

    if id_col not in df.columns:
        raise ValueError(f"ID column '{id_col}' not found. Available: {cols}")
    if date_col not in df.columns:
        raise ValueError(f"Date column '{date_col}' not found. Available: {cols}")
    if text_col not in df.columns:
        raise ValueError(f"Text column '{text_col}' not found. Available: {cols}")

    extra_cols = [c for c in cols if c not in (id_col, date_col, text_col)]

    records = []
    for _, row in df.iterrows():
        patient_id  = str(row[id_col]).strip()
        report_date = str(row[date_col]).strip()
        raw_text    = str(row[text_col]).strip()

        extra = {c: str(row[c]) for c in extra_cols if str(row[c]).strip()}
        extra_json = json.dumps(extra, ensure_ascii=False)

        for section in _split_sections(raw_text):
            label, content = _extract_label(section)
            records.append({
                "patient_id":    patient_id,
                "report_date":   report_date,
                "segment_label": label,
                "text_content":  content,
                "import_batch":  filename,
                "extra_data":    extra_json,
            })

    return records, cols
