# SkillLink — Frontend

Vue 3 + Pinia + Tailwind CSS v4 single-page app for SkillLink.

See the [repo root README](../README.md) for the full picture: what
SkillLink does, demo accounts to log in with, and how to deploy this
alongside the backend.

## Quick reference

```bash
npm install
npm run dev       # http://localhost:5173 — expects the backend on :3000
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

`VITE_API_URL` (see `.env.example`) controls which backend this talks to —
change it and rebuild when pointing at a deployed backend instead of
localhost.
