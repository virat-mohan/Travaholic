"""
One-time import of the real villa data recovered from the old Emergent-hosted
site's public /api/villas endpoint into a fresh MongoDB (Atlas) database.

Usage:
    MONGO_URL="mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
    DB_NAME="travaholic" \
    python3 import_real_villas.py

Reads MONGO_URL/DB_NAME from the environment (or a .env file in this
directory) - never hardcode credentials into this file or commit them.
Safe to re-run: upserts by slug, so running it twice won't create duplicates.
"""
import json
import os
import sys
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

with open(SCRIPT_DIR / "real_villas_data.json") as f:
    data = json.load(f)

villas = data["villas"]

# The exported data predates a field rename: older entries use "min_nights"
# instead of the current "minimum_nights" that the frontend actually reads.
for villa in villas:
    if "min_nights" in villa and "minimum_nights" not in villa:
        villa["minimum_nights"] = villa.pop("min_nights")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

upserted = 0
for villa in villas:
    result = db.villas.update_one(
        {"slug": villa["slug"]},
        {"$set": villa},
        upsert=True,
    )
    upserted += 1
    print(f"  {'inserted' if result.upserted_id else 'updated'}: {villa['name']} ({villa['slug']})")

print(f"\nDone. {upserted} villas upserted into '{DB_NAME}.villas'.")
client.close()
