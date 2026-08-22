# SkillLink — Backend

NestJS + PostgreSQL (via Prisma) REST API for SkillLink.

See the [repo root README](../README.md) for the full picture: what
SkillLink does, the complete API reference, demo accounts, and how to
deploy this alongside the frontend.

## Quick reference

```bash
npm install
npm run db:migrate    # create tables
npm run db:seed       # load demo data (20 users, listings, bookings, …)
npm run start:dev     # http://localhost:3000
```

Other useful scripts: `npm run db:studio` (Prisma's data browser),
`npm run test` (unit tests), `npm run lint`.

Environment variables are documented in `.env.example`.
