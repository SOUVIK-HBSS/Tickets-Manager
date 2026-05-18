# Changelog

## v1.1.0 — Static HTML/JS + Supabase Migration

### Architecture Change
- **Migrated from Flask (Python) to static HTML/JS** — no more Python server required
- **Database moved to Supabase PostgreSQL** from local JSON files
- **Hosting**: Deploy to any static host (Netlify, GitHub Pages, InfinityFree)
- All client-side JS modules created under `js/` directory

### New: Import Preview & Selective Update
- When uploading a CSV/Excel file, a **diff preview table** appears before any data is saved
- See exactly which tickets would be created vs updated
- **Global column toggles** — uncheck any field (e.g. Title) to skip updating that field for ALL tickets
- **Per-ticket checkboxes** — override at the row level to include/exclude specific tickets or fields
- **Summary bar**: shows counts of new, changed, and unchanged tickets
- Apply, Cancel, Select All, Deselect All, Invert controls

### Changed: Raw Data Tab (Old + New Methods)
- **Old Method** preserved — paste text, auto-extract Status/Env/ETA/Issue Type
- **New Method** added — select exactly which columns to update with custom regex patterns
- "Load Preset" button pre-fills common patterns

### Fixed: Title Preserved on Re-import
- When re-importing tickets, the existing `Title` field is now preserved (like Environment, ETA, and Project already were)
- Previously, re-importing would overwrite the Title with the sheet's value

### Other
- Report generation now runs entirely in the browser (no server needed)
- Google Sheets import: paste CSV export URL
- Column resizing and filter state saved to localStorage
