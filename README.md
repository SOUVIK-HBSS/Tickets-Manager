# Tickets Manager

A Flask-based web application for managing tickets from CSV/Excel files or Google Sheets, with PPT report generation capabilities.

## Features

- **Import Tickets**: Import from CSV, Excel (.xlsx/.xls), or Google Sheets
- **Multi-Project Support**: Manage tickets across multiple projects
- **Google Sheets Integration**: Connect and sync with Google Sheets
- **Report Generation**: Generate HTML or plain text reports with customizable formats
- **Ticket Management**: View, edit, and delete tickets
- **Color-Coded Status**: Visual status indicators based on ticket state

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python ticket_app.py
   ```

3. Open browser at `http://localhost:5000`

## Usage

### Importing Data
- **File Import**: Go to Import tab, select CSV/Excel file, specify project name and environment
- **Google Sheets**: Enter the public sheet URL, project name, and import

### Generating Reports
- Select format preset (default, simple, detailed, title_only, or custom)
- Filter by project
- Download as HTML or plain text

### Color Coding
- **Status**: Open (blue), SE-WIP (orange), L1-WIP (purple), L3 (green), Need Info (yellow), Resolved/Closed (gray)
- **Severity**: Blocker (red), Critical (orange), High (red-orange), Medium (orange), Low (green), Info (gray)
- **Environment**: STG (purple), Production/Live (green), TBD (gray)

## Data Files

- `ticket_db.json` - Main ticket database
- `gsheet_links.json` - Saved Google Sheet links
- `ppt_output.txt` - Generated plain text report
- `ppt_output.html` - Generated HTML report
- `ppt_output_all.html` - Complete HTML report with all tickets