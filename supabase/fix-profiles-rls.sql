-- Run this in Supabase SQL Editor if profile save fails after OTP verification.
-- It allows the backend (Prisma) to INSERT/UPDATE profiles when using a
-- direct DB connection that is subject to RLS.
--
-- If your DATABASE_URL uses a role other than "postgres", replace "postgres"
-- below with that role (e.g. the user from your connection string).

DO $$ BEGIN
  CREATE POLICY "Backend full access to profiles"
    ON public.profiles FOR ALL
    TO postgres
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
