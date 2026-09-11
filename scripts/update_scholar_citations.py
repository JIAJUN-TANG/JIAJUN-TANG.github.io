#!/usr/bin/env python3
"""Fetch Google Scholar citation data with `scholarly` and write data/scholar.json.

Designed to run inside GitHub Actions. The script only overwrites the output file
when it successfully retrieves data, so a failed run (Google rate-limits the CI
IP, HTML layout changed, etc.) just keeps the previous snapshot.

Environment variables:
    GOOGLE_SCHOLAR_ID   Scholar user id, e.g. cXJ2lKAAAAAJ (default: read from .github/workflows)
    SCHOLAR_PROXY       "scraper" to route requests through ScraperAPI, "none" (default)
    SCRAPERAPI_KEY      Required when SCHOLAR_PROXY=scraper
"""

import datetime as dt
import json
import os
import sys
import time

OUTPUT_FILE = os.path.join("data", "scholar.json")
SCHOLAR_ID = os.environ.get("GOOGLE_SCHOLAR_ID", "").strip()
PROXY_MODE = os.environ.get("SCHOLAR_PROXY", "none").strip().lower()
MAX_ATTEMPTS = int(os.environ.get("SCHOLAR_ATTEMPTS", "3"))


def log(msg):
    print(msg, flush=True)


def build_scholarly():
    from scholarly import scholarly

    scholarly.set_timeout(30)
    scholarly.set_retries(5)

    if PROXY_MODE == "scraper":
        from scholarly import ProxyGenerator

        key = os.environ.get("SCRAPERAPI_KEY", "").strip()
        if not key:
            log("SCHOLAR_PROXY=scraper but SCRAPERAPI_KEY is empty - continuing without proxy.")
        else:
            pg = ProxyGenerator()
            ok = pg.ScraperAPI(key)
            if ok:
                scholarly.use_proxy(pg)
                log("Using ScraperAPI proxy.")
            else:
                log("ScraperAPI proxy setup failed - continuing without proxy.")
    elif PROXY_MODE not in ("none", ""):
        log(f"Unknown SCHOLAR_PROXY={PROXY_MODE!r} - continuing without proxy.")

    return scholarly


def fetch(scholarly, scholar_id):
    author = scholarly.search_author_id(scholar_id)
    if not author:
        raise RuntimeError(f"No Scholar profile found for id {scholar_id!r}")
    author = scholarly.fill(author, sections=["basics", "indices", "publications"])
    return author


def to_int(value, default=0):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def transform(author, scholar_id):
    publications = []
    for pub in author.get("publications", []) or []:
        bib = pub.get("bib") or {}
        publications.append(
            {
                "pub_id": pub.get("author_pub_id") or "",
                "title": (bib.get("title") or "").strip(),
                "authors": (bib.get("author") or "").strip(),
                "venue": (bib.get("venue") or bib.get("journal") or bib.get("publisher") or "").strip(),
                "year": to_int(bib.get("pub_year"), 0),
                "citations": to_int(pub.get("num_citations"), 0),
                "url": pub.get("pub_url") or pub.get("citedby_url") or "",
            }
        )

    publications = [p for p in publications if p["title"]]
    if not publications:
        raise RuntimeError("Scholar returned zero publications - refusing to overwrite good data.")

    cites_per_year = {str(k): v for k, v in (author.get("cites_per_year") or {}).items()}

    return {
        "updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "scholar_id": scholar_id,
        "profile": {
            "name": author.get("name") or "",
            "affiliation": author.get("affiliation") or "",
            "total_citations": to_int(author.get("citedby")),
            "h_index": to_int(author.get("hindex")),
            "i10_index": to_int(author.get("i10index")),
            "citations_per_year": cites_per_year,
        },
        "publications": publications,
    }


def main():
    if not SCHOLAR_ID:
        log("ERROR: GOOGLE_SCHOLAR_ID is not set.")
        return 1

    try:
        scholarly = build_scholarly()
    except Exception as exc:
        log(f"ERROR: cannot initialise scholarly: {exc}")
        return 1

    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            log(f"Fetching Scholar profile {SCHOLAR_ID} (attempt {attempt}/{MAX_ATTEMPTS})...")
            data = transform(fetch(scholarly, SCHOLAR_ID), SCHOLAR_ID)
            break
        except Exception as exc:
            last_error = exc
            log(f"Attempt {attempt} failed: {type(exc).__name__}: {exc}")
            if attempt < MAX_ATTEMPTS:
                time.sleep(15 * attempt)
    else:
        log(f"ERROR: all attempts failed. Last error: {last_error}")
        log("Keeping the existing scholar.json untouched.")
        return 1

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    log(
        f"OK: wrote {OUTPUT_FILE} - {len(data['publications'])} publications, "
        f"{data['profile']['total_citations']} total citations, h-index {data['profile']['h_index']}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
