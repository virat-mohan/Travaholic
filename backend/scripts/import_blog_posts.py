"""
One-time import of the 5 launch blog posts into MongoDB (Atlas).

Usage:
    MONGO_URL="mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
    DB_NAME="travaholic" \
    python3 import_blog_posts.py

Reads MONGO_URL/DB_NAME from the environment (or a .env file in this
directory) - never hardcode credentials into this file or commit them.
Safe to re-run: upserts by slug, so running it twice won't create duplicates.
Posts are inserted with status="published" so they show up on /blog immediately.
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")
load_dotenv(SCRIPT_DIR.parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    print("ERROR: Set MONGO_URL and DB_NAME environment variables before running this script.")
    sys.exit(1)

with open(SCRIPT_DIR / "blog_posts_data.json") as f:
    data = json.load(f)

posts = data["posts"]
now = datetime.now(timezone.utc).isoformat()

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

upserted = 0
for post in posts:
    set_fields = {
        "status": "published",
        "related_villa_ids": [],
        "canonical_url": None,
        "updated_at": now,
        **post,
    }
    result = db.blog_posts.update_one(
        {"slug": post["slug"]},
        {
            "$set": set_fields,
            "$setOnInsert": {
                "post_id": f"post_{uuid.uuid4().hex[:12]}",
                "created_at": now,
            },
        },
        upsert=True,
    )
    upserted += 1
    print(f"  {'inserted' if result.upserted_id else 'updated'}: {post['title']} ({post['slug']})")

print(f"\nDone. {upserted} blog posts upserted into '{DB_NAME}.blog_posts'.")
client.close()
