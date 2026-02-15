import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://wodwlbpxvvqppwvohtfu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZHdsYnB4dnZxcHB3dm9odGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDcxOTgsImV4cCI6MjA4NjYyMzE5OH0.k4RX5YW5lwIa47yH12jWmHFbWy5sRJNNP64xKeEmizg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
