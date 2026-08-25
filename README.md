# DSA Revision Tracker

A full-stack **spaced-repetition revision system for DSA/coding problems**, built with Next.js.

> Solve a problem today → register it → the app automatically schedules it for revision at
> +3 / +7 / +15 / +21 / +60 / +90 days → revise it on the day it's due → record how well you
> remembered it.

## Features

- **Automatic revision scheduling** — registering a problem instantly generates its entire
  revision schedule (calendar dates computed server-side in your timezone, never on the client).
- **Today's dashboard** — overdue first, then due today, then upcoming (tomorrow / next 7 days),
  with daily goal and completion progress.
- **Active-recall revision flow** — attempt from memory, optionally reveal notes/solution, then
  record `Forgot / Hard / Good / Easy` plus an optional note ("What did you forget?").
- **Overdue handling** — missed revisions never disappear; they stay flagged with
  "Overdue by N days" until completed.
- **Problem library** — search + filters (status, platform, difficulty, topic), sorting,
  per-problem detail page with revision progress, timeline and full history.
- **Calendar view** — monthly grid of scheduled/completed revisions with per-date details.
- **Statistics** — totals, recall rate (easy/hard/forgot), weekly/monthly activity.
- **Streaks** — current & longest daily revision streak.
- **Configurable intervals** — edit your schedule (e.g. `1, 3, 7, 14, 30, 60`); existing problems
  are never silently rescheduled — an explicit opt-in button rebuilds them.
- **Keyboard shortcuts** — `A` add problem · `R` start recall · `S` reveal solution ·
  `F/H/G/E` forgot/hard/good/easy.
- Dark/light mode, responsive layout, per-user data isolation, server-side authorization.

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js (App Router) + React + TypeScript           |
| UI         | Tailwind CSS v4, lucide-react                       |
| Backend    | Server Actions + Route Handlers                     |
| Database   | PostgreSQL                                          |
| ORM        | Prisma 7 (`prisma-client` generator + pg adapter)   |
| Auth       | Auth.js / NextAuth v5 (credentials, JWT sessions)   |
| Dates      | luxon (IANA-timezone-correct calendar math)         |
| Tests      | Vitest (unit) + integration tests against PostgreSQL|
| Validation | Zod                                                 |

## Getting started

### 1. Prerequisites

- Node.js >= 20.9
- PostgreSQL (local install or Docker)

### 2. Install and configure

```bash
npm install
cp .env.example .env
# then set DATABASE_URL and AUTH_SECRET in .env
```

With Docker:

```bash
docker run -d --name dsa-revision-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=dsa_revision \
  -p 5433:5432 postgres:17-alpine
```

### 3. Migrate, seed, run

```bash
npx prisma migrate dev     # apply schema
npm run db:seed            # optional demo data
npm run dev                # http://localhost:3000
```

Demo login (after seeding): `dev@dsarevise.app` / `password123`

## Scripts

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the dev server                      |
| `npm run build`     | Production build                          |
| `npm start`         | Run the production build                  |
| `npm test`          | Unit tests (scheduling engine, schemas)   |
| `npm run test:int`  | Integration tests (requires DATABASE_URL) |
| `npm run lint`      | ESLint                                    |
| `npm run typecheck` | TypeScript strict check                   |
| `npm run db:migrate`| Prisma migrate dev                        |
| `npm run db:seed`   | Seed demo data                            |

## Architecture

```
UI (app router pages + client components)
        |
Server Actions / Route Handlers    src/app/actions, src/app/api
        |
Service layer                      src/services/{problems,revisions,statistics,settings}
        |
Scheduling engine (pure)           src/lib/scheduling  <- all date math lives here
        |
Prisma client (pg adapter)         src/lib/db
        |
PostgreSQL
```

Key rules enforced throughout:

- Intervals are **always relative to the registration date**, never chained between revisions.
- All revision dates are stored as UTC instants representing local midnight in the user's IANA
  timezone; day boundaries ("today") are computed server-side with luxon.
- Every query is scoped by `userId`; IDs from the client are never trusted without an ownership check.
- Changing interval settings never mutates existing schedules unless explicitly requested.

## Database schema

See `prisma/schema.prisma`: `User`, `Problem`, `RevisionSchedule`, `RevisionSettings`
plus Auth.js tables (`Account`, `Session`, `VerificationToken`).

## Deployment (Vercel + managed Postgres)

1. Create a PostgreSQL database (Neon, Supabase, Vercel Postgres, RDS...).
2. Set env vars in your host: `DATABASE_URL`, `AUTH_SECRET`.
   On Vercel also set `AUTH_TRUST_HOST=true` (or set `trustHost: true` in the auth config).
3. Apply migrations during deploy: add `prisma migrate deploy` to the build step, e.g.
   `"build": "prisma migrate deploy && next build"`.
4. Deploy.

## Future roadmap

The schema and service layer are designed to support: adaptive intervals based on recall results,
difficulty-aware scheduling, notifications, AI hints/questions, weak-topic detection, and
multiple attempts per problem.
