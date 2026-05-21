# HomeBase

AI-powered multi-agent real estate intelligence for Portland Metro first-time homebuyers.

## Structure

- `server/` — Express API, mock Portland data, agent orchestration, scoring
- `client/` — Next.js + Tailwind dashboard (search → processing → report)

## Quick start

```bash
npm run install:all
npm run dev
```

- API: http://localhost:4000
- App: http://localhost:3001

Optional: copy `server/.env.example` to `server/.env` and set `ANTHROPIC_API_KEY` for Claude synthesis summaries.

## Demo addresses

| Address | Profile |
|---------|---------|
| 4521 SE Hawthorne Blvd, Portland, OR 97215 | Clean starter home |
| 2847 SW Patton Rd, Portland, OR 97201 | West Hills landslide/liquefaction |
| 4321 NE Alberta St, Portland, OR 97213 | Unpermitted basement + mechanics lien |
