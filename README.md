# BlueScout · FRC 1086 Blue Cheese

Scouting + strategy platform for the **2026 REBUILT** season. One Next.js app:
lead-assigned match scouting, pit & super scouting, offline capture with QR
hand-off, a master strategic dashboard (efficiency + reliability), and
real-time collaborative picklists. Data blends your own scouting with **The
Blue Alliance** and **Statbotics**.

> Colors: team blue + yellow. Built to self-host next to your team's Postgres.

## Features

- **Accounts & roles** — email/password with scout-lead approval (Admin, Scout Lead, Scouter, Strategist, Viewer). First account becomes Admin.
- **Event data** — one-click sync of teams, schedule, results, rankings, OPRs (The Blue Alliance) and EPA (Statbotics).
- **Lead-assigned scouting** — assign each driver-station slot to a scouter for the whole event; live coverage grid.
- **Match scouting** — fast, touch-first REBUILT forms (auto/teleop fuel, tower climb, defense, reliability, notes).
- **Offline-first** — entries save on-device (IndexedDB) and auto-sync; a global indicator shows queued/offline state.
- **QR hand-off** — no network at all? Generate an (animated, multi-frame) QR the lead scans to import reports.
- **Pit & super scouting** — robot capability forms with photos, plus qualitative notes.
- **Strategic dashboard** — teams ranked by blended **efficiency** + **reliability**; team radar/trends, compare, alliance simulator & match predictor.
- **Real-time picklists** — collaborative drag-and-drop with presence, do-not-pick, comments, lock, and "seed from rankings".
- **Extras** — scout-accuracy tracking (scouted vs actual), public read-only share links, and AI assists (off by default).

### Demo login

After `npm run db:seed`, sign in with **`lead@1086.test` / `bluecheese`** (Admin) to explore. The seed also adds scouters and realistic match data for the active event.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) + custom **Socket.IO** server
- **PostgreSQL** + **Prisma 7** (driver adapter: `@prisma/adapter-pg`)
- **Tailwind CSS v4** + custom shadcn-style UI, **Recharts**, **dnd-kit**
- Custom **email + password** auth (server-side sessions, bcrypt, role-based)
- **Redis** for Socket.IO scaling (optional in dev)
- PWA + service worker + IndexedDB (Dexie) for offline; **QR** hand-off

## Prerequisites

- Node.js 20.9+ (24 recommended)
- A PostgreSQL database
- (Optional) Redis, for multi-instance realtime scaling
- A free [TBA read API key](https://www.thebluealliance.com/account)

## Setup

```bash
npm install
cp .env.example .env        # then edit values
npm run db:generate         # generate the Prisma client
npm run db:push             # create tables (dev) — or db:migrate for migrations
npm run dev                 # http://localhost:3000  (custom server + Socket.IO)
```

The **first account you register becomes an approved ADMIN**. Everyone else
signs up and waits for a scout lead to approve them under **People**.

### No local Postgres? (dev only)

Prisma 7 ships a local dev database:

```bash
npx prisma dev --db-port 5433        # starts Postgres on localhost:5433
# set DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres?sslmode=disable
npm run db:push
```

## Self-hosting (Docker)

```bash
docker compose up --build            # app + redis + a dev Postgres
docker compose run --rm app npm run db:deploy   # apply migrations
```

For production with your team's **remote** Postgres: remove the `db` service in
`docker-compose.yml` and set `DATABASE_URL` on the `app` service to your remote
connection string.

## Environment

See [`.env.example`](.env.example). Key vars: `DATABASE_URL`, `REDIS_URL`,
`AUTH_SECRET`, `TBA_AUTH_KEY`, `CURRENT_EVENT_KEY`.

**AI features** (natural-language Q&A, note summaries, picklist suggestions) are
built behind a flag and ship **off**. To enable: set `AI_ENABLED=true`,
`AI_PROVIDER=anthropic|openai|ollama`, and the matching key.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Next + Socket.IO) |
| `npm run build` / `start` | Production build / run |
| `npm run db:push` / `db:migrate` / `db:studio` | Prisma schema / migrations / GUI |
| `npm run typecheck` / `lint` / `format` | Quality |
| `npm test` / `e2e` | Vitest unit / Playwright e2e |

## Season config

All REBUILT-specific scoring and scouting fields live in
[`config/rebuilt-2026.ts`](config/rebuilt-2026.ts) — swap that one file for a
future season.
