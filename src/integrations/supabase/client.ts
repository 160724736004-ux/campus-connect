// API client - PostgreSQL backend | Supabase | Offline (IndexedDB)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { localSupabase } from "@/lib/localSupabase";
import { localDb } from "@/lib/localDb";
import { seedOfflineDatabase } from "@/lib/seedData";
import pgApi from "@/integrations/api/client";

const USE_POSTGRES_API = import.meta.env.VITE_USE_POSTGRES_API === "true";
const USE_OFFLINE_DB = import.meta.env.VITE_USE_OFFLINE_DB === "true";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let _supabase: ReturnType<typeof createClient> | typeof localSupabase | typeof pgApi;

let offlineInitPromise: Promise<void> | null = null;
async function initOffline() {
  if (offlineInitPromise) return offlineInitPromise;
  offlineInitPromise = (async () => {
    await localDb.open();
    await seedOfflineDatabase();
  })();
  return offlineInitPromise;
}

if (USE_POSTGRES_API) {
  _supabase = pgApi as any;
} else if (USE_OFFLINE_DB) {
  _supabase = localSupabase as any;
  initOffline().catch(console.error);
} else {
  _supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = _supabase;
