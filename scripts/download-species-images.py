#!/usr/bin/env python3
"""
Download species images from Wikimedia Commons.

Strategy:
  1. Batch-resolve filenames via MediaWiki API (50 per call, 8s between batches)
  2. Download from direct CDN URLs (2s between each)
  3. For files not found, fallback to search by scientific name
  4. Validate all downloaded images
"""
import json
import os
import time
import random
import urllib.request
import urllib.parse
import urllib.error

SPECIES_JSON = "public/data/species/icmbio-brazil.json"
IMAGES_DIR = "public/images/species"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "EG-Maps/1.0 (https://github.com/anomalyco/EG-Maps; data enrichment)"
BATCH_SLEEP = 8.0
DOWNLOAD_SLEEP = 2.0
MAX_RETRIES = 10
BATCH_SIZE = 50

IMAGE_SIGNATURES = [
    b"\xff\xd8\xff",
    b"\x89PNG",
    b"GIF",
    b"RIFF",
    b"\x49\x49",
    b"\x4d\x4d",
    b"BM",
]


def is_valid_image(path):
    try:
        with open(path, "rb") as f:
            header = f.read(8)
        return any(header.startswith(sig) for sig in IMAGE_SIGNATURES)
    except Exception:
        return False


def is_valid_image_from_bytes(data):
    return any(data[:len(sig)] == sig for sig in IMAGE_SIGNATURES)


def needs_download(filepath):
    if not os.path.exists(filepath):
        return True
    return not is_valid_image(filepath)


def api_query(params, retry_on_429=True):
    params["format"] = "json"
    url = API_URL + "?" + urllib.parse.urlencode(params)
    for attempt in range(MAX_RETRIES):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and retry_on_429:
                wait = 2.0 * (2 ** attempt) + random.uniform(0, 3)
                print(f"      [RATE-LIMITED API] retry in {wait:.0f}s (attempt {attempt+1})")
                time.sleep(wait)
                continue
            return None
        except Exception as e:
            return None
    return None


def resolve_filenames(filenames):
    """Resolve a list of filenames to direct URLs via batched API query."""
    # Build unique mapping: filename -> result
    file_titles = ["File:" + f for f in filenames]
    result = {}

    for i in range(0, len(file_titles), BATCH_SIZE):
        batch = file_titles[i:i + BATCH_SIZE]
        batch_fnames = filenames[i:i + BATCH_SIZE]

        if i > 0:
            time.sleep(BATCH_SLEEP + random.uniform(0, 2))

        params = {
            "action": "query",
            "titles": "|".join(batch),
            "prop": "imageinfo",
            "iiprop": "url",
        }
        data = api_query(params)
        if not data:
            for f in batch_fnames:
                result[f] = None
            continue

        # Map title -> direct url
        url_by_title = {}
        pages = data.get("query", {}).get("pages", {})
        for pid, info in pages.items():
            if pid == "-1":
                continue
            title = info.get("title", "")
            imginfo = info.get("imageinfo", [])
            if imginfo:
                url_by_title[title] = imginfo[0].get("url")

        for fname, title in zip(batch_fnames, batch):
            result[fname] = url_by_title.get(title)

    return result


def search_commons(scientific_name):
    """Search Commons by scientific name as fallback."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": scientific_name,
        "srnamespace": 6,
        "srlimit": 5,
    }
    data = api_query(params)
    if not data:
        return None
    results = data.get("query", {}).get("search", [])
    if not results:
        return None
    for r in results:
        title = r["title"]
        fp = {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
        }
        fd = api_query(fp)
        if not fd:
            continue
        pages = fd.get("query", {}).get("pages", {})
        for pid, pi in pages.items():
            if pid == "-1":
                continue
            ii = pi.get("imageinfo", [])
            if ii:
                return ii[0].get("url")
    return None


def download_file(url, filepath):
    """Download from direct CDN url to filepath."""
    for attempt in range(MAX_RETRIES):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                ct = resp.headers.get("Content-Type", "")
                if "image" not in ct and "octet-stream" not in ct:
                    body = resp.read(500)
                    return False
                data = resp.read()
            if len(data) < 200:
                return False
            if not is_valid_image_from_bytes(data):
                return False
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "wb") as f:
                f.write(data)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 2.0 * (2 ** attempt) + random.uniform(0, 2)
                print(f"      [RATE-LIMITED DL] retry in {wait:.0f}s")
                time.sleep(wait)
                continue
            return False
        except Exception:
            return False
    return False


def main():
    json_path = os.path.join(BASE_DIR, SPECIES_JSON)
    with open(json_path, "r") as f:
        species_list = json.load(f)

    # Collect species needing download
    pending = []
    for s in species_list:
        url = s["imageUrl"] or ""
        if not url.startswith("http"):
            continue
        if "Special:FilePath/" in url:
            filename = url.split("Special:FilePath/")[1]
        elif "upload.wikimedia.org" in url:
            filename = os.path.basename(urllib.parse.urlparse(url).path)
        else:
            continue
        if not filename:
            continue
        filepath = os.path.join(BASE_DIR, IMAGES_DIR, filename)
        if needs_download(filepath):
            pending.append((s, filename, filepath))

    already_ok = len(species_list) - len(pending)
    print(f"Total species: {len(species_list)}")
    print(f"Already valid local images: {already_ok}")
    print(f"Need download: {len(pending)}")
    print()

    if not pending:
        print("Nothing to download!")
        return

    # --- PHASE 1: Batch-resolve filenames via API ---
    all_fnames = list(dict.fromkeys([f for _, f, _ in pending]))
    print(f"Resolving {len(all_fnames)} unique filenames via API (batches of {BATCH_SIZE})...")
    resolve_map = resolve_filenames(all_fnames)
    not_found = [f for f, url in resolve_map.items() if url is None]
    found_count = len(all_fnames) - len(not_found)
    print(f"  Resolved: {found_count}, Not found: {len(not_found)}")
    print()

    # --- PHASE 2: Download resolved files ---
    stats = {"downloaded": 0, "not_found": 0, "failed": 0}

    dl_queue = [(s, fn, fp) for s, fn, fp in pending if fn in resolve_map and resolve_map[fn] is not None]
    search_queue = [(s, fn, fp) for s, fn, fp in pending if fn in not_found]

    print(f"Downloading {len(dl_queue)} resolved images...")
    for idx, (species, filename, filepath) in enumerate(dl_queue):
        sid = species["id"]
        sci_name = species["scientificName"]
        url = resolve_map[filename]

        print(f"  [{idx+1}/{len(dl_queue)}] [{sid}] {sci_name}")
        print(f"    {url}")

        time.sleep(DOWNLOAD_SLEEP + random.uniform(0, 1))
        success = download_file(url, filepath)

        if success and is_valid_image(filepath):
            size = os.path.getsize(filepath)
            print(f"    OK ({size} bytes)")
            stats["downloaded"] += 1
        else:
            if os.path.exists(filepath) and not is_valid_image(filepath):
                os.remove(filepath)
            print(f"    FAILED download")
            stats["failed"] += 1
            search_queue.append((species, filename, filepath))

        print()

    # --- PHASE 3: Fallback search for not-found files ---
    if search_queue:
        print(f"FALLBACK: Searching Commons by scientific name for {len(search_queue)} species...")
        print()

        for idx, (species, filename, filepath) in enumerate(search_queue):
            sid = species["id"]
            sci_name = species["scientificName"]

            print(f"  [{idx+1}/{len(search_queue)}] [{sid}] {sci_name}")

            time.sleep(BATCH_SLEEP + random.uniform(0, 2))
            print(f"    Searching...")
            url = search_commons(sci_name)

            if not url:
                print(f"    NOT FOUND on Commons")
                stats["not_found"] += 1
                print()
                continue

            print(f"    Found: {url}")
            time.sleep(DOWNLOAD_SLEEP + random.uniform(0, 1))
            success = download_file(url, filepath)

            if success and is_valid_image(filepath):
                size = os.path.getsize(filepath)
                print(f"    DOWNLOADED ({size} bytes)")
                stats["downloaded"] += 1
            else:
                print(f"    FAILED download")
                stats["failed"] += 1

            print()

    print("=" * 60)
    print("FINAL SUMMARY")
    print(f"  Already valid before:    {already_ok}")
    print(f"  Downloaded this run:     {stats['downloaded']}")
    print(f"  Not found on Commons:    {stats['not_found']}")
    print(f"  Failed download:         {stats['failed']}")
    total = already_ok + stats["downloaded"]
    print(f"  Total valid images:      {total}/200")
    remaining = stats["failed"] + stats["not_found"]
    if remaining > 0:
        print(f"  Remaining to fix:        {remaining}")


if __name__ == "__main__":
    main()
