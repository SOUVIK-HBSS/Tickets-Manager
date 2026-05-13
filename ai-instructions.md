# AI Instructions for Recreating Tickets Manager

## Project Overview

A Flask web application for managing tickets from various sources (CSV, Excel, Google Sheets) with report generation capabilities.

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML + Tailwind CSS + Vanilla JS
- **Data Storage**: JSON files (no database required)
- **Dependencies**: Flask, Werkzeug, openpyxl

## File Structure

```
Tickets-Manager/
├── ticket_app.py          # Main Flask application
├── templates/
│   └── index.html         # Frontend UI
├── requirements.txt       # Python dependencies
├── README.md             # Documentation
├── ai-instructions.md    # This file
├── ticket_db.json        # Auto-generated: ticket data
├── gsheet_links.json     # Auto-generated: saved Google Sheet links
├── ppt_output.txt        # Auto-generated: plain text report
├── ppt_output.html       # Auto-generated: HTML report
└── ppt_output_all.html   # Auto-generated: full HTML report
```

## Core Functionality

### 1. Data Import
- **File formats**: CSV, Excel (.xlsx, .xls)
- **Google Sheets**: Public URLs (exported as CSV)
- **Fields extracted**: ID, Title, Status, Issue Type, Environment, ETA, Severity, Owner, Project

### 2. Color Mapping
```python
STATUS_COLORS = {
    "open": "#4dabf7",
    "se-wip": "#ffc078",
    "l1-wip": "#9775fa",
    "l3": "#51cf66",
    "need info": "#ffd43b",
    "resolved": "#868e96",
    "closed": "#868e96"
}

SEVERITY_COLORS = {
    "blocker": "#ff6b6b",
    "critical": "#ff8c00",
    "high": "#ff6347",
    "medium": "#ffa94d",
    "low": "#69db7c"
}

ENV_COLORS = {
    "STG": "#da77f2",
    "staging": "#da77f2",
    "live": "#40c057",
    "production": "#40c057"
}

ISSUE_COLORS = {
    "Bug": "#ff6b6b",
    "Feature": "#4dabf7",
    "Enhancement": "#69db7c"
}
```

### 3. Report Formats
```python
PRESETS = {
    "default": "[Sn]. [ID] | [Title] | [Issue Type] | [Status] | [Env] | [ETA]",
    "simple": "[Sn]. [ID] - [Title] - [Status]",
    "detailed": "[Sn]. [ID] | [Title] | [Severity] | [Status] | [Owner] | [Env] | [ETA] | [Issue Type]",
    "title_only": "[Sn]. [ID] | [Title]"
}
```

### 4. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main UI |
| `/api/import` | POST | Import file (multipart/form-data) |
| `/api/gsheet/import` | POST | Import from Google Sheet (JSON) |
| `/api/gsheet/links` | GET/POST | Manage sheet links |
| `/api/tickets` | GET | Get all tickets |
| `/api/ticket/<id>` | GET/POST/DELETE | CRUD operations |
| `/api/generate/ppt` | POST | Generate report |
| `/api/download/<type>` | GET | Download report |
| `/api/settings` | GET/POST | App settings |

### 5. UI Views (SPA)
- **All Tickets**: Main table view with color-coded badges
- **Import**: File upload and Google Sheet import forms
- **Generate**: Report format, filter, and download options
- **Google Sheets**: Link management and sync
- **Settings**: Default format and data management

## Implementation Notes

1. Google Sheet parsing: Convert edit URLs to CSV export format
2. ID extraction: Check columns "ID", "#", "Ticket ID" or regex match
3. Project detection: From "Project" column or ID prefix
4. File handling: Save uploaded files to /tmp before processing
5. JSON database: Keys are ticket IDs, special keys starting with "_" are settings

## Running

```bash
pip install -r requirements.txt
python ticket_app.py
# Open http://localhost:5000
```