"""
Pulls each villa's Airbnb "export calendar" iCal feed and mirrors its
booked dates into blocked_dates (reason=airbnb_sync), so Travaholic won't
accept a booking that overlaps an Airbnb reservation. Meant to run on a
schedule (see render.yaml's travaholic-airbnb-sync cron job) - this is the
same logic as POST /admin/villas/{id}/sync-airbnb-calendar in server.py,
duplicated here as a standalone script (direct DB access, no admin auth
needed) so a cron job can run it without a logged-in session.

Usage:
    MONGO_URL="mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
    DB_NAME="travaholic" \
    python3 sync_airbnb_calendars.py

Safe to re-run: replaces each villa's airbnb_sync blocks wholesale every
run, so cancellations on Airbnb's side correctly clear here too.
"""
import os
import re
import sys
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")
load_dotenv(SCRIPT_DIR.parent / ".env")  # fall back to backend/.env if present

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    print("ERROR: Set MONGO_URL and DB_NAME environment variables before running this script.")
    sys.exit(1)


def parse_ical_events(ics_text):
    """Minimal VEVENT extractor - pulls UID/DTSTART/DTEND out of raw iCal
    text with regex rather than pulling in a full icalendar dependency.
    Also pulls the "Reservation URL" out of DESCRIPTION when present, so
    the admin calendar can link back to the reservation on Airbnb's own
    host dashboard - Airbnb's export feed never includes guest name/
    phone/email (a platform privacy restriction), so this link is the
    closest thing to "more booking details" available from this feed."""
    unfolded = re.sub(r"\r?\n[ \t]", "", ics_text)  # RFC 5545 line unfolding
    events = []
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", unfolded, re.DOTALL):
        uid_m = re.search(r"UID:(.+)", block)
        start_m = re.search(r"DTSTART[^:]*:(\d{8})", block)
        end_m = re.search(r"DTEND[^:]*:(\d{8})", block)
        if not (uid_m and start_m and end_m):
            continue
        start_date = f"{start_m.group(1)[:4]}-{start_m.group(1)[4:6]}-{start_m.group(1)[6:8]}"
        end_dt = datetime.strptime(end_m.group(1), "%Y%m%d") - timedelta(days=1)  # DTEND is exclusive
        url_m = re.search(r"Reservation URL:\s*(\S+)", block)
        events.append({
            "uid": uid_m.group(1).strip(),
            "start_date": start_date,
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "reservation_url": url_m.group(1).strip() if url_m else None,
        })
    return events


client = MongoClient(MONGO_URL)
db = client[DB_NAME]

villas = list(db.villas.find({"airbnb_ical_url": {"$exists": True, "$nin": [None, ""]}}))

if not villas:
    print("No villas have an airbnb_ical_url configured - nothing to sync.")
    sys.exit(0)

for villa in villas:
    name = villa.get("name", villa.get("villa_id"))
    ical_url = villa["airbnb_ical_url"]
    try:
        req = urllib.request.Request(ical_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            ics_text = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  {name}: FAILED to fetch calendar - {e}")
        continue

    events = parse_ical_events(ics_text)

    db.blocked_dates.delete_many({"villa_id": villa["villa_id"], "reason": "airbnb_sync"})
    if events:
        docs = [{
            "block_id": f"block_{uuid.uuid4().hex[:12]}",
            "villa_id": villa["villa_id"],
            "start_date": e["start_date"],
            "end_date": e["end_date"],
            "reason": "airbnb_sync",
            "booking_id": None,
            "reservation_url": e.get("reservation_url"),
            "created_by": "airbnb_sync_cron",
            "created_at": datetime.now(timezone.utc).isoformat(),
        } for e in events]
        db.blocked_dates.insert_many(docs)

    print(f"  {name}: synced {len(events)} blocked date range(s)")

print(f"\nDone. Synced {len(villas)} villa(s) with an Airbnb calendar configured.")
client.close()
