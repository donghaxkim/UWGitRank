CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT UNIQUE,
  github_username  TEXT,
  full_name        TEXT,
  avatar_url       TEXT,
  email            TEXT,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  program          TEXT
);

-- Index: middleware & sync route filter on is_verified
CREATE INDEX IF NOT EXISTS profiles_is_verified_idx
  ON public.profiles (is_verified);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$ BEGIN
  CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own profile
DO $$ BEGIN
  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role (used by Supabase API with service key)
DO $$ BEGIN
  CREATE POLICY "Service role full access"
    ON public.profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backend/Prisma direct connection: allow full access so server-side
-- profile upsert (e.g. after OTP verification) succeeds. Required when
-- DATABASE_URL uses a role that does NOT have BYPASSRLS (e.g. pooler or
-- custom Prisma user without bypassrls).
DO $$ BEGIN
  CREATE POLICY "Backend full access to profiles"
    ON public.profiles FOR ALL
    TO postgres
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Auto-create profile on sign-up ────────────────────────────────────
-- Trigger function that creates a profiles row when a new auth.users row
-- is inserted (i.e. first GitHub OAuth sign-in).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, github_username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'user_name',
    NEW.raw_user_meta_data ->> 'user_name',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─── 3. GitHub Metrics ────────────────────────────────────────────────────
-- One row per verified user. Upserted by the /api/sync cron route.

CREATE TABLE IF NOT EXISTS public.github_metrics (
  user_id      UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars        INTEGER NOT NULL DEFAULT 0,
  commits      INTEGER NOT NULL DEFAULT 0,
  merged_prs   INTEGER NOT NULL DEFAULT 0,
  rank_score   DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_synced  TIMESTAMPTZ,

  -- Time-scoped commit counts
  commits_7d   INTEGER NOT NULL DEFAULT 0,
  commits_30d  INTEGER NOT NULL DEFAULT 0,
  commits_1y   INTEGER NOT NULL DEFAULT 0,

  -- Time-scoped PR counts
  prs_7d       INTEGER NOT NULL DEFAULT 0,
  prs_30d      INTEGER NOT NULL DEFAULT 0,
  prs_1y       INTEGER NOT NULL DEFAULT 0,

  -- Time-scoped composite scores
  score_7d     DOUBLE PRECISION NOT NULL DEFAULT 0,
  score_30d    DOUBLE PRECISION NOT NULL DEFAULT 0,
  score_1y     DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- Index: leaderboard sorting by score (descending)
CREATE INDEX IF NOT EXISTS github_metrics_rank_score_desc_idx
  ON public.github_metrics (rank_score DESC);

-- Index: sync freshness
CREATE INDEX IF NOT EXISTS github_metrics_last_synced_idx
  ON public.github_metrics (last_synced);

-- RLS (Prisma bypasses RLS via direct connection, but keep policies for
-- any Supabase-client access)
ALTER TABLE public.github_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own metrics"
    ON public.github_metrics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access"
    ON public.github_metrics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── 4. Leaderboard Viewers ──────────────────────────────────────────────
-- Tracks GitHub-authenticated users who view the rankings but are not
-- verified Waterloo contributors.

CREATE TABLE IF NOT EXISTS public.leaderboard_viewers (
  github_username  TEXT PRIMARY KEY,
  avatar_url       TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leaderboard_viewers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow insert for authenticated users"
    ON public.leaderboard_viewers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow update own row"
    ON public.leaderboard_viewers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── 5. Leaderboard Materialized View ────────────────────────────────────
-- Joins verified profiles with their metrics for fast leaderboard reads.
-- Refreshed by the sync cron via refresh_leaderboard().

DROP MATERIALIZED VIEW IF EXISTS public.leaderboard;

CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
  p.github_username AS username,
  p.is_verified,
  p.program,
  m.stars,
  m.commits       AS commits_all,
  m.merged_prs    AS prs_all,
  m.rank_score    AS score_all,
  m.commits_7d,
  m.prs_7d,
  m.score_7d,
  m.commits_30d,
  m.prs_30d,
  m.score_30d,
  m.commits_1y,
  m.prs_1y,
  m.score_1y
FROM public.profiles p
JOIN public.github_metrics m ON p.id = m.user_id
WHERE p.is_verified = true;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_username_idx
  ON public.leaderboard (username);

-- Allow unauthenticated reads on the leaderboard
GRANT SELECT ON public.leaderboard TO anon;
GRANT SELECT ON public.leaderboard TO authenticated;


-- ─── 6. Refresh Function ─────────────────────────────────────────────────
-- Called by the /api/sync cron route via prisma.$executeRaw.

CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard;
$$;
