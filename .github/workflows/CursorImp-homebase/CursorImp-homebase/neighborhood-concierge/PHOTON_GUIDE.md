# How Photon Works — Neighborhood Concierge

## What you're building

A **local event marketplace for Seattle** that:

1. **Collects** events from Eventbrite, Meetup, and Luma (every 6 hours)
2. **Stores** them in ChromaDB (searchable by neighborhood, category, date)
3. **Shows** them on the dashboard as a marketplace (no Reddit in the UI)
4. **Messages you** via **Photon iMessage** (`+1 628 264 7704`) with digests and answers

You are **not** browsing Reddit or random APIs when you chat — the bot only uses **stored local events**.

## Your Photon number

**`+1 (628) 264-7704`** — this is your **Concierge line** on Photon.

| Direction | What happens |
|-----------|----------------|
| **Someone texts this number** | Photon → your app → vector search → Claude → reply via iMessage |
| **You send them a digest** | Dashboard or API sends **to their phone**, **from** your Photon line |

Set in `.env`:

```env
PHOTON_IMESSAGE_LINE_PHONE=+16282647704
```

Restart after changing: `python main.py`

## How to send messages (3 ways)

### 1. Text the Concierge line (easiest)

From your iPhone, send an iMessage to **+1 628 264 7704**:

```
What's happening in Capitol Hill this weekend?
```

The bot replies using only events already in the database.

### 2. Dashboard — send digest to a phone

1. Open http://localhost:8080/
2. Go to **Messages** tab
3. Enter **your personal phone** (who receives the text), e.g. `+12065550100`
4. Click **Send digest via Photon**

### 3. API (for testing)

```powershell
# Send a custom message to any phone
Invoke-RestMethod -Uri "http://localhost:8090/send" -Method POST `
  -ContentType "application/json" `
  -Body '{"to":"+1YOUR_PHONE","body":"Your Seattle picks: …"}'

# Or trigger digest from the app
Invoke-RestMethod -Uri "http://localhost:8080/api/digest/send?phone=%2B1YOURPHONE" -Method POST
```

**Important:** `to` = recipient's phone. Messages appear from your Photon line **628-264-7704**.

## Daily automatic digest

Users with a saved profile get a morning message at their `digest_time` (default 8:00 AM, `America/Los_Angeles`) if `python main.py` is running (cron thread).

Create a profile on the dashboard **Profile** tab or:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/profile" -Method PUT `
  -ContentType "application/json" `
  -Body '{"phone":"+1YOURPHONE","neighborhood":"Capitol Hill","interests":["music","food","tech"]}'
```

## Photon dashboard checklist

At [app.photon.codes](https://app.photon.codes/):

- [ ] iMessage enabled on project
- [ ] Line **+16282647704** active
- [ ] Project ID + Secret in `.env`

## Architecture (one picture)

```
Eventbrite / Meetup / Luma  →  ingest  →  ChromaDB (Seattle events)
                                              ↓
You text +16282647704  →  Photon  →  search + rank  →  Claude  →  iMessage reply
Dashboard marketplace  →  browse same stored events (no live scrape)
```
