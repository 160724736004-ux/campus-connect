-- Alter profiles to reference auth_users (run after base migrations)
-- Use: psql -f this file (after modifying base migration to use auth_users)

-- If profiles already exists with auth.users FK, we need to:
-- 1. Drop FK 2. Add FK to auth_users
-- This is for fresh install - base migration should create profiles referencing auth_users

-- For existing Supabase schema: add password to profiles for standalone mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
