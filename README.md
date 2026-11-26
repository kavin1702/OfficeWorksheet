# WorkPulse

A daily work log and VR simulation tracker. Log what you worked on each day,
track progress across 12 "worked" and 7 "tested" training simulations, and keep
everything in a Google Sheet you own.

**Live:** https://office-worksheet.vercel.app

## Features

- Add, edit, duplicate, carry forward and delete daily work logs
- Filters: search, date presets (today, yesterday, this week, this month), status, priority
- Views: table, simulation matrix (12 + 7), calendar with day inspector, analytics
- Daily standup report you can copy
- Excel export (logs + both simulation matrices) and JSON backup / import
- Google Sheets storage through a free Apps Script web app
- Password login, light and dark theme, works on phones

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, lucide-react |
| Backend | Next.js route handlers in `src/app/api` |
| Storage | Google Sheets through Google Apps Script (`apps-script/Code.gs`); falls back to browser storage when not configured |
| Auth | One password, HMAC-signed HttpOnly session cookie |
| Export | SheetJS (`xlsx`) |
| Hosting | Vercel |

## How it works

```
Browser (React)
  │  fetch /api/entries  (cookie: wp_session)
  ▼
Next.js API routes ── checks login, validates every field
  │  POST {action, entry, secret}
  ▼
Apps Script web app ── checks secret, locks, reads/writes rows
  ▼
Google Sheet, tab "WorkEntries" (one row per work log)
```

Folder layout:

```
src/
  app/                 pages (/ , /admin, /login) and API routes (/api/...)
  middleware.ts        sends signed-out visitors to /login
  server/              server-only code: config, session cookies, Sheets client
  shared/              types, validation, utils, UI components used everywhere
  modules/<feature>/   one folder per feature: *.service.ts (logic) + components/
apps-script/Code.gs    the Google Apps Script backend (paste into your sheet)
tests/                 Apps Script unit tests and browser end-to-end tests
legacy/v2/             the old plain HTML/JS version, kept for reference only
```

## Run it locally

Requires Node.js 18.17 or newer.

```bash
npm install
cp .env.example .env.local   # optional: fill in to use Google Sheets
npm run dev                  # http://localhost:3000
```

Without `.env.local` the app runs in **local mode**: no login, data saved in your browser only.

To use Google Sheets, follow **[docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md)** (free, about 5 minutes).

## Environment variables

| Name | Required for Sheets | Purpose |
| --- | --- | --- |
| `APP_PASSWORD` | Yes | Password to open the app. Sheets storage stays off until it is set. |
| `SESSION_SECRET` | Recommended | Signs the login cookie. |
| `GOOGLE_SCRIPT_URL` | Yes | Apps Script web app URL ending in `/exec`. |
| `GOOGLE_SCRIPT_SECRET` | Yes | Same value as the script's `API_SECRET` property. |
| `APP_USER_NAME`, `APP_USER_EMAIL` | No | Name and email written on each new log. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript check (strict) |
| `npm run lint` | ESLint |
| `npm test` | Runs `apps-script/Code.gs` against a fake Google Sheet |

Browser end-to-end tests: see [tests/e2e/README.md](tests/e2e/README.md).

## API

All `/api/entries*` routes need a signed-in session and Google Sheets configured.

| Method and path | Does |
| --- | --- |
| `GET /api/session` | Who is signed in and where data is stored (no secrets) |
| `POST /api/auth/login` · `POST /api/auth/logout` | Sign in with `{ "password": "..." }` / sign out |
| `GET /api/entries` | List all work logs, newest first |
| `POST /api/entries` | Create a log |
| `PUT /api/entries/:id` · `DELETE /api/entries/:id` | Update / delete a log |
| `POST /api/entries/import` | `{ entries, mode: "append" \| "replace" }` |
| `GET /api/sheets/status` | Ping the Google Sheet, returns the row count |
