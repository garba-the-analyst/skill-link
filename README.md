# SkillLink

**A campus marketplace where students and local professionals trade paid
services and volunteer hours — with an escrow engine that holds payment
until both sides confirm the job is actually done.**

Built for Newgate University Minna. SkillLink solves a simple trust problem:
when you hire a fellow student or local artisan for a paid gig, how do you
know they'll deliver before you pay — and how do they know they'll get paid
once they do? SkillLink locks the payment in escrow the moment a booking is
made, and only releases it once the provider marks the job done and the
student confirms it with a one-time code. The same platform also runs a
volunteering board for campus organizations, with admin-verified hour
tracking and tamper-evident digital certificates.

---

## Table of contents

- [What it does](#what-it-does)
- [How it's built](#how-its-built)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Demo accounts](#demo-accounts--seed-data)
- [API reference](#api-reference)
- [Deploying to Render](#deploying-to-render)
- [Known limitations](#known-limitations--what-id-build-next)

---

## What it does

### 🛒 Marketplace & escrow (the core feature)
Paid providers list a service (title, description, hourly rate, skill tags).
A student books it, which immediately **locks the payment in escrow** —
nobody can touch it yet. From there:

1. **`LOCKED`** — funds are held; the provider hasn't started.
2. **`IN_PROGRESS`** — the provider marks the job as started.
3. **`RELEASE_READY`** — the provider marks the job done. The server
   generates a random 6-digit code and shows it to the provider, who reads
   it out to the student in person (or over a call/chat).
4. **`COMPLETED`** — the student enters that code in the app. If it
   matches, the funds release: the provider's balance is credited (minus a
   10% platform fee), the booking closes, and the code is invalidated so it
   can't be reused.

This is the same trust mechanism escrow services use everywhere — the
difference is the "confirmation" step is a human handshake (a spoken code)
rather than a delivery tracking number, which fits in-person student
services (tutoring, repairs, photography) better than a shipping API would.

### 🙋 Volunteering
Organizations (student unions, clubs) post volunteer opportunities.
Students apply, complete the work, and log their hours. Logged hours sit
**pending** until an admin verifies them — at which point they're added to
the volunteer's public hour total. Once a volunteer has verified hours,
they can generate a certificate: a SHA-256 hash of their id, their total
verified hours, and a server-side secret, so the certificate can be
independently checked without a database lookup, and can't be forged by
someone who doesn't know the secret.

### 🛠️ Admin console
A `SUPER_ADMIN` account can see everything happening on the platform in one
place: every user, every booking regardless of status, live platform stats
(user/listing/booking/opportunity counts), and a queue of pending volunteer
hour logs to approve with one click.

### 🔐 Accounts
Email/password auth with bcrypt (12 salt rounds) and JWTs (7-day expiry).
Every account can independently toggle being a **paid provider** and/or a
**volunteer** — the same person can offer a paid tutoring service and also
volunteer for a river cleanup.

---

## How it's built

**Backend** — NestJS 11 (Express) REST API, PostgreSQL via Prisma ORM,
JWT auth via a custom `JwtAuthGuard` + role-based `RolesGuard`/`@Roles()`
decorator pair, request validation via `class-validator` DTOs and a global
`ValidationPipe`, password hashing via `bcrypt`.

**Frontend** — Vue 3 (Composition API, `<script setup>`), Pinia for state,
Vue Router for navigation, Tailwind CSS v4 (CSS-first `@theme` design
tokens — see `src/style.css`) for a Material Design 3–inspired dark theme,
Axios for API calls, built with Vite.

**Why a monorepo, two package.jsons:** the backend and frontend are
independently deployable services (see [Deploying to
Render](#deploying-to-render)) that happen to live in one repo for
convenience during development. Each has its own dependencies, its own
`.env`, and its own build.

**Why PostgreSQL instead of SQLite:** this project originally used SQLite
for local simplicity. It was moved to PostgreSQL because most low-cost
hosting (including Render's free tier, see below) doesn't give a web
service a persistent disk — a SQLite file would be silently wiped on every
redeploy or restart. Postgres, run as its own managed service, survives
that.

**Design decisions worth knowing about:**
- The provider-completion OTP is returned directly to the provider in the
  API response rather than emailed/texted to the student, because no
  email/SMS provider is wired up. In a real deployment, `providerComplete`
  in `escrow.service.ts` is the one place you'd hook in that integration.
- Certificate and JWT secrets live in environment variables
  (`CERT_SIGNING_SECRET`, `JWT_SECRET`), never in source — see
  `.env.example`.
- All monetary values are stored as integer cents (`amountCents`,
  `hourlyRateCents`) to avoid floating-point rounding bugs, and formatted
  for display only in the frontend.

---

## Project structure

```
skill-link/
├── render.yaml                  # Render Blueprint (see Deploying to Render)
├── skilllink-backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data model (User, ServiceListing, Booking, …)
│   │   └── seed.ts              # Demo data — 20 users, listings, bookings, etc.
│   └── src/
│       ├── auth/                # Register/login, JWT guard, roles guard
│       ├── marketplace/         # Service listings
│       ├── escrow/               # Bookings + the 4-stage escrow lifecycle
│       ├── volunteer/            # Opportunities, applications, hour logs, certificates
│       ├── admin/                # Platform-wide activity views (SUPER_ADMIN only)
│       └── prisma/               # PrismaService (global DB connection)
└── skilllink-frontend/
    └── src/
        ├── stores/                # Pinia stores — one per backend module, plus admin.ts
        ├── views/                 # One component per route
        ├── components/            # EscrowHandshake.vue (the OTP handshake UI)
        └── router/                # Route definitions
```

---

## Running it locally

### Prerequisites
- Node.js 20+ and npm
- A PostgreSQL database. The easiest way to get one locally is Docker:
  ```bash
  docker run --name skilllink-postgres -e POSTGRES_USER=skilllink -e POSTGRES_PASSWORD=skilllink -e POSTGRES_DB=skilllink -p 5433:5432 -d postgres
  ```
  This uses host port **5433** (mapped to Postgres's normal 5432 inside the
  container) rather than 5432 directly, since a lot of machines already
  have something bound to 5432 — a system Postgres install, or another
  project's container — and this way you don't need to check first. This
  matches the `DATABASE_URL` already in `.env` — no further config needed
  if you use it as-is.
  If you already have your own PostgreSQL running locally and know its
  credentials, you can skip Docker entirely — just create a `skilllink`
  database and point `DATABASE_URL` in `.env` at it instead.

### 1. Backend
```bash
cd skilllink-backend
npm install
npm run db:migrate     # creates the database tables (also generates the Prisma Client)
npm run db:generate    # regenerates the Prisma Client — safe to re-run any time the schema changes
npm run db:seed        # loads the 20-user demo dataset (see below)
npm run start:dev      # http://localhost:3000
```

### 2. Frontend
```bash
cd skilllink-frontend
npm install
npm run dev             # http://localhost:5173
```

Open `http://localhost:5173` — the frontend is already configured
(`skilllink-frontend/.env`) to talk to the backend on `localhost:3000`.

### Environment variables
Both `skilllink-backend/.env` and `skilllink-frontend/.env` are already
filled in with working local-dev values (a real generated `JWT_SECRET`, a
local Postgres URL, etc.) so the steps above work with zero configuration.
`.env.example` in each folder documents every variable if you need to
change something. **Neither `.env` file is committed to git** — see each
folder's `.gitignore`.

### Troubleshooting

**`Error: Environment variable not found: DATABASE_URL` when running a
`prisma`/`db:*` command.** The Prisma CLI looks for `.env` in whatever
directory you run the command from — make sure you're inside
`skilllink-backend` (not the repo root) before running `npm run db:migrate`,
`npm run db:seed`, etc.

**TypeScript errors about a field "not existing" on a Prisma model that's
clearly in `schema.prisma`.** The generated Prisma Client
(`node_modules/.prisma/client`) is out of sync with the schema — this
happens if `prisma migrate dev` never successfully completed (it
regenerates the client as a side effect) or if you edited `schema.prisma`
without regenerating afterward. Fix: `npm run db:generate`.

**`P1000: Authentication failed against database server`.** Unlike a
"connection refused" error, this means *something* answered on that host
and port — just not with the credentials in `DATABASE_URL`. Run
`docker ps -a` and check whether `skilllink-postgres` is actually there
and running. If it isn't, something else (a system-level Postgres
install, or another project's container) already owns that port, and
`docker run` either was never started or is fighting over the same port.
Easiest fix: run the container on a different host port
(`-p 5433:5432` instead of `-p 5432:5432`) and update the port in
`DATABASE_URL` in `.env` to match.

**Render deploy fails with `Cannot find module '.../dist/main'` even
though the build logs say "Build successful".** `nest build` compiles
whatever `.ts` files it finds under the backend folder unless told
otherwise. Without a `prisma/` exclusion, `prisma/seed.ts` — a sibling of
`src/`, not part of the Nest app — gets swept into the same compilation,
so TypeScript nests the output one level deeper (`dist/src/main.js`)
instead of `dist/main.js`, which is what `start:prod` (`node dist/main`)
expects. Fixed in `tsconfig.build.json` by excluding `prisma` and pinning
`rootDir` to `./src`; only relevant if you add more root-level `.ts`
files later.

---

## Demo accounts & seed data

`npm run db:seed` (from `skilllink-backend`) wipes and repopulates the
database with:

| Role | Count | Login |
|---|---|---|
| Super Admin | 1 | `admin@skilllink.demo` / `ChangeThisPassword123!` (or your `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` if set in `.env`) |
| Professionals (paid listings) | 8 | e.g. `malik@newgate.test`, `amaka@newgate.test` — full list in `prisma/seed.ts` |
| Everyday users (volunteers, orgs, plain members) | 12 | e.g. `grace.okonkwo@newgate.test`, `fcite_union@newgate.test` |

**Every seeded account except the super admin uses the password
`password123`.**

The seed also creates four bookings, one at each stage of the escrow
lifecycle, so you can demo the whole flow without clicking through it
live:
- A `LOCKED` booking (Suleiman → the plumber)
- An `IN_PROGRESS` booking (Tunde → the designer)
- A `RELEASE_READY` booking (Musa → the electrician) — **its confirmation
  code is `482913`**, so you can log in as `musa.garba@newgate.test`,
  open that booking, and release the payment on the spot
- A `COMPLETED` booking (Grace → the tutor), with the provider's earnings
  already credited

It also seeds 4 volunteer opportunities and 3 pending hour logs, so the
admin console's review queue has real work in it the moment you log in as
the super admin.

> Re-running `npm run db:seed` wipes all data and starts over — don't run
> it against a database you care about.

---

## API reference

All routes are prefixed with the backend's base URL (`http://localhost:3000`
locally). Routes marked 🔒 require an `Authorization: Bearer <token>`
header. Roles in parentheses are additionally required on top of being
logged in.

| Method | Route | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Get a JWT |
| GET 🔒 | `/auth/me` | Current user |
| PUT 🔒 | `/auth/profile/toggles` | Toggle paid-provider / volunteer status |
| GET | `/marketplace/feed` | All service listings |
| POST 🔒 | `/marketplace/listings` | Create a listing |
| POST 🔒 | `/escrow/bookings` | Book a listing (locks funds) |
| GET 🔒 | `/escrow/bookings/mine` | Your bookings, as student or provider |
| GET 🔒 | `/escrow/bookings/:id` | One booking's detail |
| POST 🔒 | `/escrow/bookings/:id/start` | Provider: mark job started |
| POST 🔒 | `/escrow/bookings/:id/complete` | Provider: mark job done, generates the OTP |
| POST 🔒 | `/escrow/bookings/:id/release` | Student: submit the OTP, releases funds |
| GET | `/volunteer/opportunities` | All open opportunities |
| POST 🔒 | `/volunteer/opportunities` | Post one (organizations only) |
| POST 🔒 | `/volunteer/opportunities/:id/apply` | Apply to one |
| POST 🔒 | `/volunteer/log-hours` | Log hours (unverified until reviewed) |
| GET 🔒 | `/volunteer/hour-logs/pending` | (ADMIN) Review queue |
| POST 🔒 | `/volunteer/verify-hours/:logId` | (ADMIN) Approve a log |
| POST 🔒 | `/volunteer/certificates/generate` | Issue your certificate |
| GET 🔒 | `/admin/users` | (SUPER_ADMIN) Every user |
| GET 🔒 | `/admin/bookings` | (SUPER_ADMIN) Every booking |
| GET 🔒 | `/admin/stats` | (SUPER_ADMIN) Platform stat counts |

---

## Deploying to Render

Render's free tier is enough to host this for a presentation, with two
things worth knowing going in:

- **Free web services spin down after 15 minutes of no traffic**, and take
  ~30-60 seconds to wake back up on the next request. Open your live URL a
  minute or two before you present so it's already warm.
- **Free Postgres databases expire 30 days after creation** (with a grace
  period after that). Fine for a presentation happening soon; if you need
  it to keep running long-term, you'll want to upgrade that one piece
  later.

### Option A — Blueprint (recommended, does all 3 services at once)

1. Push this repo to GitHub (see the next section if you haven't yet).
2. In the [Render Dashboard](https://dashboard.render.com), click **New >
   Blueprint** and connect this repo. Render reads `render.yaml` at the
   repo root and proposes a Postgres database, the backend, and the
   frontend together.
3. When prompted, it'll ask you to fill in `SEED_ADMIN_EMAIL` and
   `SEED_ADMIN_PASSWORD` (marked `sync: false` in the Blueprint so they're
   never committed to git) — set your own super admin login here, or leave
   them blank to use the same demo defaults as local dev.
4. Click through to deploy. Render provisions all three resources and
   wires the database connection string and CORS settings between them
   automatically.
5. **Service names must be globally unique on Render.** If
   `skilllink-backend` or `skilllink-frontend` is already taken, Render
   assigns a different one — if that happens, open the backend service's
   environment variables and update `CORS_ORIGIN` to the frontend's actual
   URL, and update the frontend's `VITE_API_URL` to the backend's actual
   URL, then redeploy both.
6. **Seed the database once**, after the first successful deploy — the
   build step deliberately does *not* run the seed script automatically,
   since it wipes existing data and you don't want that happening on every
   future push. The simplest way: copy the Postgres instance's *External
   Database URL* from the Render dashboard, put it in
   `skilllink-backend/.env` locally as `DATABASE_URL`, then run
   `npm run db:seed` from your machine. (Alternatively, use the backend
   service's **Shell** tab in the Render dashboard to run
   `npm run db:seed` directly on the deployed instance.)

### Option B — Manual, one service at a time

If you'd rather see each piece explicitly, or the Blueprint hits a snag:

1. **Database**: New > PostgreSQL. Free plan. Once it's up, copy the
   *Internal Database URL*.
2. **Backend**: New > Web Service, connect this repo, set **Root
   Directory** to `skilllink-backend`. Build command:
   `npm install && npm run build && npx prisma migrate deploy`. Start
   command: `npm run start:prod`. Add environment variables: `DATABASE_URL`
   (the Internal Database URL from step 1), `JWT_SECRET` and
   `CERT_SIGNING_SECRET` (any long random strings), and `CORS_ORIGIN` (fill
   this in after step 3, once you know the frontend's URL).
3. **Frontend**: New > Static Site, same repo, **Root Directory**
   `skilllink-frontend`. Build command: `npm install && npm run build`.
   Publish directory: `dist`. Environment variable: `VITE_API_URL` set to
   the backend's URL from step 2. Add a rewrite rule `/*` → `/index.html`
   so Vue Router's client-side routes work on refresh.
4. Go back to the backend service and set `CORS_ORIGIN` to the frontend's
   URL, then redeploy the backend.
5. Seed the database as described in step 6 of Option A.

### Pushing this repo to GitHub

```bash
cd skill-link
git remote add origin https://github.com/garba-the-analyst/skill-link.git
git branch -M main
git push -u origin main
```

---

## Known limitations & what I'd build next

Being upfront about this for anyone reviewing the project:

- **No real payment gateway.** Escrow amounts are tracked as integer cents
  in the database, and a provider's balance genuinely accrues on release —
  but no money actually moves in or out of the platform. Wiring in a real
  processor (Paystack is the natural fit for a Nigerian audience) would
  replace `createBooking`'s "lock funds" step with a real payment capture,
  and give providers a way to withdraw `availableCents` to a bank account.
- **No email/SMS delivery.** The escrow confirmation code and any
  notifications currently surface only inside the app.
- **No automated dispute resolution.** "Something's not right" on a
  booking currently just files a placeholder support alert — there's no
  schema or workflow yet for an admin to actually adjudicate a dispute.
- **Limited automated test coverage.** A few unit tests exist for the
  admin module; the rest of the API is currently verified by manual
  testing rather than an automated suite.
- **Identity verification is data-only.** The `identityStatus` field on
  each user exists and is seeded, but there's no document-upload/admin-review
  flow yet to actually change it — right now it's descriptive, not
  enforced anywhere.
