import json
import re

import requests

url = "https://www.meetup.com/find/events/?allMeetups=true&zip=98101"
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
pat = r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>'
m = re.search(pat, r.text, re.DOTALL)
print("next_data", bool(m), "html len", len(r.text))
if m:
    data = json.loads(m.group(1))
    found = []

    def walk(obj, depth=0):
        if depth > 15:
            return
        if isinstance(obj, dict):
            if "title" in obj and ("dateTime" in obj or "eventUrl" in obj):
                found.append(obj)
            for v in obj.values():
                walk(v, depth + 1)
        elif isinstance(obj, list):
            for i in obj:
                walk(i, depth + 1)

    walk(data)
    print("events found", len(found))
    for ev in found[:5]:
        print(ev.get("title"), ev.get("dateTime"), ev.get("eventUrl"))
