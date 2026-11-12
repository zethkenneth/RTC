import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// Shared server-side client for database access and admin auth calls.
// The service role key bypasses RLS, so it must never reach the browser.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: authOptions,
});

// A fresh, throwaway client for calls that create a user session (sign in, refresh).
// Signing in on the shared client would make its later database calls run as that user.
export const createAuthClient = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: authOptions });
