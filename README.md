# UW GitRank

**Waterloo student GitHub rankings** — scored by stars, PRs, commits, and peer endorsements. See who’s making an impact in open source across UW faculties.

---

## How the ranking works

### Score formula

Rank score is computed per time window (see below), then **endorsement points** are added:

```
rankScore = (stars × 10) + (merged PRs × 5) + (commits × 1) + (endorsements × 3)
```

| Metric | Weight | Notes |
|--------|--------|--------|
| **Stars** | ×10 | On non-forked repos you own; always **all-time**. |
| **Merged PRs** | ×5 | Counted in the selected time window. |
| **Commits** | ×1 | Counted in the selected time window. |
| **Endorsements** | ×3 | Peer endorsements from verified UW students; **all-time**, not windowed. |

Stars and endorsements are **always all-time**; PRs and commits use the chosen period (7 days, 30 days, 1 year, or all time). GitHub stats are refreshed on a schedule; endorsements update in real time.

---

## Features

- **Leaderboard** — Ranked list with podium (top 3) and table; time windows: 7d, 30d, 1y, all time.
- **Faculty filter** — Filter by Faculty of Engineering, Mathematics, Environment, Health, or Other.
- **Search** — By name or GitHub username.
- **Verification** — Sign in with GitHub; verify UW identity to appear and to endorse others.
- **Endorsements** — Verified students can endorse others (one per person); each endorsement adds 3 points.
- **Profile tooltips** — Hover on a contributor (podium or table) for score breakdown, GitHub link, and LinkedIn (if set).
- **Join flow** — Sign up, add name/program, verify; then get synced to the leaderboard.

---

## Tech stack

- **Next.js** (App Router) — UI and API
- **Supabase** — Auth (GitHub OAuth) and optional viewer tracking
- **Prisma** — DB access (PostgreSQL via Supabase)
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations
- **Radix UI** — Accessible components (e.g. tooltips)

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/donghaxkim/UWGitRank.git
cd UWGitRank
npm install
```

### 2. Environment variables

Create `.env.local` and set:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Supabase pooler) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GITHUB_TOKEN` | GitHub personal access token (for API / sync) |
| `NEXT_PUBLIC_SITE_URL` | Site base URL (e.g. `http://localhost:3000` or production URL) |
| `CRON_SECRET` | Secret for cron-triggered jobs (e.g. GitHub sync) |

Optional (e.g. for email): `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

### 3. Database (Supabase)

If you use Supabase’s connection pooler, the **username must include the project ref**:

- **Correct:** `postgres.[PROJECT_REF]` (e.g. `postgres.htnzmjxayxdeqrtispvf`)
- **Wrong:** `postgres` alone

Use the **Session** or **Transaction** connection string from **Supabase → Project Settings → Database** (e.g. port **5432** for Session, **6543** for Transaction) and set it as `DATABASE_URL`.

### 4. Database schema

```bash
npx prisma generate
npx prisma db push   # or migrate, depending on your workflow
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the leaderboard and “Join” flow to sign in with GitHub and (optionally) verify.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Prisma generate + Next.js build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run remove-user -- <githubUsername>` | Remove a user (via `scripts/remove-user.ts`) |

---

## Deploy

The app is set up to run on **Vercel**. Configure the same env vars in the Vercel project and use the Supabase **pooler** connection string for `DATABASE_URL` (with `postgres.[PROJECT_REF]` as the username). See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.

---

## Learn more

- [How the ranking system works](/about) — In-app breakdown of the formula and metrics.
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
