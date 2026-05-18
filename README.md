# Tickets Manager

A static HTML/JS web application for managing tickets, backed by Supabase PostgreSQL.

## Features

- **Import Tickets**: Import from CSV or Excel files with **preview & selective update** — see a diff before committing, choose which tickets/fields to update
- **Multi-Project Support**: Manage tickets across multiple projects
- **Raw Data Processing**: Two methods — auto-extract (old) or regex column mapping (new)
- **Report Generation**: Download HTML or plain text reports with customizable formats
- **Ticket Management**: View, edit, and delete tickets with color-coded statuses
- **Column Filters**: Filter by any field, resize columns, sort by project

## Setup

No Python server needed. This is a purely static app.

### 1. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Run this SQL in the SQL Editor:

```sql
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    issue_type TEXT,
    environment TEXT,
    eta TEXT,
    severity TEXT,
    owner TEXT,
    project TEXT DEFAULT 'default',
    imported BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_data (
    key TEXT PRIMARY KEY,
    value JSONB
);

CREATE INDEX idx_tickets_project ON tickets(project);
CREATE INDEX idx_tickets_status ON tickets(status);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_app_data" ON app_data FOR ALL USING (true) WITH CHECK (true);
```

3. Copy your **Project URL** and **anon key** from Settings → API

### 2. Connect the App

1. Open `index.html` or `js/db.js`
2. Update these variables at the top of `js/db.js`:
   ```js
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_KEY = 'your-anon-key';
   ```

### 3. Migrate Existing Data

1. Open `migrate.html` from the project folder (or upload it to your host)
2. Select your old `ticket_db.json` file
3. Click "Preview" then "Migrate to Supabase"

### 4. Hosting

Upload `index.html` and the `js/` folder to any static host:
- **Netlify**: Drag & drop the folder
- **GitHub Pages**: Push to a repo, enable Pages
- **InfinityFree**: Upload via FTP or File Manager

## Usage

### Importing with Preview

1. Go to **Import** tab
2. Select a CSV/Excel file
3. Click **Preview Import** — a diff table shows all tickets
4. Use **Global field toggles** at the top to exclude any column
5. Use **row checkboxes** to exclude specific tickets
6. Click **Apply Import** to save only your selected data

### Raw Data Processing

**Old Method**: Paste text containing ticket IDs + field values. Auto-extracts Status, Env, ETA, Issue Type.

**New Method**: Choose columns and write regex patterns:
- Check which columns to update
- Write a regex like `(open|resolved|closed)` for Status
- "Load Preset" fills common patterns automatically

### Report Generation

- Select format (default, simple, detailed, title_only, or custom)
- Filter by project
- Downloads HTML or plain text

### Color Coding

- **Status**: Open (blue), SE-WIP (orange), L1-WIP (purple), L3 (green), Resolved/Closed (gray)
- **Severity**: Blocker (red), Critical (orange), High (red-orange), Medium (orange), Low (green)
- **Environment**: STG (purple), Production (green), TBD (gray)

## File Structure

```
Tickets-Manager/
├── index.html          # Main application (SPA)
├── js/
│   ├── db.js           # Supabase client & database operations
│   ├── import.js       # File parsing + import preview & selective update
│   ├── reports.js      # Report generation (HTML/plain text)
│   └── rawdata.js      # Raw data processing (old + new methods)
├── migrate.html        # One-time data migration from JSON to Supabase
├── CHANGELOG.md
└── README.md
```

## Tech Stack

- **Frontend**: Vanilla JS + Tailwind CSS CDN + FontAwesome
- **Database**: Supabase PostgreSQL
- **Libraries**: SheetJS (Excel), PapaParse (CSV), Supabase JS SDK
- **Hosting**: Static file server (Netlify, GitHub Pages, InfinityFree, etc.)
