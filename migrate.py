import json, sys, requests

SUPABASE_URL = "https://myvumtjkzkduhaiiemwd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dnVtdGpremtkdWhhaWllbXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTUwNjksImV4cCI6MjA5NDY3MTA2OX0.SjZDm4_VCBASf4QCYx58Nh_nYUBt0ivFK_8Hguf4qeU"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

def main():
    json_file = sys.argv[1] if len(sys.argv) > 1 else "ticket_db.json"

    try:
        with open(json_file, encoding="utf-8") as f:
            db = json.load(f)
    except FileNotFoundError:
        print(f"File not found: {json_file}")
        return

    tickets = [(k, v) for k, v in db.items() if not k.startswith("_")]
    print(f"Found {len(tickets)} tickets")

    success = 0
    for tid, data in tickets:
        row = {
            "id": tid,
            "title": data.get("title") or data.get("Title") or "",
            "status": data.get("status") or data.get("Status") or "",
            "issue_type": data.get("issue_type") or data.get("Issue Type") or "",
            "environment": data.get("environment") or data.get("Environment") or "",
            "eta": data.get("eta") or data.get("ETA") or "",
            "severity": data.get("severity") or data.get("Severity") or "",
            "owner": data.get("owner") or data.get("Owner") or "",
            "project": data.get("project") or data.get("Project") or "default",
        }
        r = requests.post(f"{SUPABASE_URL}/rest/v1/tickets", json=row, headers=HEADERS)
        if r.status_code in (200, 201):
            success += 1
            print(f"  {tid} OK")
        else:
            print(f"  {tid} ERROR {r.status_code}: {r.text[:100]}")

    settings = db.get("_settings", {})
    if settings:
        r = requests.post(f"{SUPABASE_URL}/rest/v1/app_data",
            json={"key": "_settings", "value": settings}, headers=HEADERS)
        print(f"Settings: {'OK' if r.status_code in (200,201) else r.status_code}")

    print(f"\nDone: {success}/{len(tickets)} tickets migrated")

if __name__ == "__main__":
    main()
