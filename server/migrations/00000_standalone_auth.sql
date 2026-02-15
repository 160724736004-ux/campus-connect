-- Standalone PostgreSQL auth (no Supabase)
-- Run this BEFORE all other migrations. Creates auth.users table that Supabase migrations expect.
-- Our server uses this for login instead of Supabase GoTrue.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  encrypted_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create app_role enum (migrations may create it - handle both)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'hod', 'faculty', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- auth.uid() for RLS - returns current user from session variable (set by API)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- Create authenticated role for RLS (if not exists)
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
