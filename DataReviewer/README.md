# Pathology Report Reviewer

A web application for reviewing pathology reports and extracting structured data from free text.

Doctors can load a CSV export from a hospital system, read all pathology segments for each patient visit in a clean readable view, and annotate extracted findings into a structured table — which can be exported as a flat CSV for analysis.

---

## Features

- **CSV import** — upload a pathology CSV; rows are parsed into labelled segments and stored in DuckDB
- **Patient/visit browser** — sidebar lists all patients; clicking a patient expands its visits; the first visit loads automatically
- **Report viewer** — all text segments for the selected visit shown as labelled cards with automatic RTL support for Hebrew text
- **Data extraction table** — define custom fields (free text or choose-from-list); fill in values per visit; auto-saved on blur
- **Export** — download all extracted data as a wide-format CSV (one row per patient/visit, one column per field)

---

## Prerequisites

- Python 3.10 or later
- Node.js 18 or later and npm

---

## Quick start

### First-time setup

Run this once to create the Python virtual environment and install all dependencies:

```bat
setup_env.bat
```

### Starting the app

```bat
start.bat
```

This kills any existing servers on ports 8000/5173, starts the backend and frontend in separate windows, and opens the browser automatically.

- **Frontend:** http://localhost:5173
- **Backend API:** http://127.0.0.1:8000
- **Swagger docs:** http://127.0.0.1:8000/docs

---

## Project structure

```
DataReviewer/
├── backend/                    # Python / FastAPI
│   ├── main.py                 # App entry point, CORS, router registration
│   ├── database.py             # DuckDB connection, schema init, WAL recovery
│   ├── models.py               # Pydantic request/response models
│   ├── routers/
│   │   ├── upload.py           # POST /api/upload — CSV import
│   │   ├── patients.py         # GET /api/patients, /api/patients/{id}/visits
│   │   ├── reports.py          # GET /api/reports/{patient_id}/{date}
│   │   └── extraction.py       # Fields CRUD, extracted data CRUD, CSV export
│   ├── services/
│   │   └── csv_parser.py       # CSV parsing and segment label splitting
│   ├── requirements.txt
│   └── data/
│       └── pathology.duckdb    # Database file (auto-created on first run)
│
├── frontend/                   # React / TypeScript / Vite
│   └── src/
│       ├── App.tsx             # Root component, auto-selection effects
│       ├── api/client.ts       # Typed Axios wrappers for all endpoints
│       ├── store/appStore.ts   # Zustand global state and actions
│       ├── types/index.ts      # TypeScript interfaces
│       ├── utils/rtl.ts        # Hebrew Unicode range detector
│       └── components/
│           ├── FileUpload/     # Drag-and-drop CSV uploader
│           ├── PatientList/    # Sidebar: patients → visits hierarchy
│           ├── ReportViewer/   # Text segment cards with RTL awareness
│           └── ExtractionTable/# Editable extraction table + AddFieldModal
│
├── start.bat                   # Launch both servers
└── setup_env.bat               # One-time Python venv setup
```

---

## CSV format

The input CSV must have exactly these columns:

| Column | Description |
|--------|-------------|
| `index` | Patient identifier (anonymised hash or ID) |
| `date` | Visit date/time in format `YY/MM/DD HH:MM` |
| `text_result_anonymized` | Pathology free text, optionally prefixed with a segment label |

Multiple rows with the same `index` + `date` are grouped into a single visit. Each row becomes one text segment.

**Recognised segment label prefixes** (stripped from the text and stored separately):
- `Final Diagnosis-Dg:`
- `Macroscopexam-Macro:`
- `Microscopexam-Micro:`
- `FS-DIAGNOSIS:`
- `Malignant:`

---

## Database schema

Three tables stored in `backend/data/pathology.duckdb`:

| Table | Purpose |
|-------|---------|
| `pathology_reports` | Raw imported rows — one row per segment per visit |
| `extraction_fields` | Schema of fields the doctor wants to extract (name, type, options) |
| `extracted_data` | Doctor's extracted values — one row per patient/visit/field |

The database file persists between restarts. If the process is killed hard (e.g. power loss), a WAL checkpoint is applied automatically on next startup to recover cleanly.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload CSV, parse and store |
| GET | `/api/patients` | List all patients with visit count |
| GET | `/api/patients/{id}/visits` | List visits for a patient |
| GET | `/api/reports/{id}/{date}` | Get all text segments for a visit |
| GET | `/api/fields` | List extraction field definitions |
| POST | `/api/fields` | Add a new field (text or select type) |
| DELETE | `/api/fields/{name}` | Remove a field definition |
| GET | `/api/extraction/{id}/{date}` | Get extracted values for a visit |
| PUT | `/api/extraction/{id}/{date}` | Save extracted values for a visit |
| GET | `/api/extraction/export` | Download all extracted data as CSV |

Full interactive documentation is available at http://127.0.0.1:8000/docs when the backend is running.

---

## Extraction field types

When adding a field via "+ Add Field":

- **Free text** — the doctor types a value directly into the cell
- **Choose from list** — the doctor defines a comma-separated list of valid values (e.g. `Positive, Negative, Equivocal`); the cell renders as a dropdown

---

## Hebrew / RTL support

The report viewer detects Hebrew characters (Unicode range U+0590–U+05FF) and sets `dir="auto"` on each text block. This lets the browser's Unicode Bidirectional Algorithm render Hebrew paragraphs right-to-left and English paragraphs left-to-right automatically, including mixed-language segments.

---

## Development notes

- Re-uploading the same CSV is safe — existing records are replaced, no duplicates are created.
- Deleting an extraction field does not delete the values already recorded for that field, preserving historical data.
- The backend must be restarted manually after changes to Python files (no hot-reload by default).
- The frontend hot-reloads automatically via Vite HMR.
- On Windows, `localhost` resolves to IPv6 (`::1`) before IPv4. The frontend is configured to call the backend at `127.0.0.1:8000` (explicit IPv4) to avoid this.
