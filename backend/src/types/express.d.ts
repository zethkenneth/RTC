import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth for authenticated requests.
      user?: User;
    }
  }
}

export {};
