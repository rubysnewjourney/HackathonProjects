import json
import re

import requests

url = "https://www.eventbrite.com/d/wa--seattle/events/"
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
print("status", r.status_code, len(r.text))
m = re.search(
    r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    r.text,
    re.DOTALL,
)
if m:
    print("has next data")
else:
    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>',
        r.text,
        re.DOTALL,
    )
    print("ld+json blocks", len(blocks))
    for b in blocks[:5]:
        try:
            data = json.loads(b)
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") == "Event":
                        print("EVENT", item.get("name"), item.get("startDate"))
            elif data.get("@type") == "Event":
                print("EVENT", data.get("name"))
            elif data.get("@type") == "ItemList":
                items = data.get("itemListElement", [])
                print("ItemList", len(items))
                for it in items[:2]:
                    print(" item", it)
        except json.JSONDecodeError:
            pass
    # event cards in HTML
    titles = re.findall(r'data-event-id="(\d+)"', r.text)
    print("data-event-id count", len(titles))
