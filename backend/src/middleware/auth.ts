import type { RequestHandler } from "express";
import { createAuthClient, supabase } from "../lib/supabase.js";
import { HttpError } from "../lib/errors.js";
import { ACCESS_COOKIE, clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from "../lib/session.js";

// Lets the request through only with a valid session.
// If the access token has expired, it is silently renewed with the refresh token.
export const requireAuth: RequestHandler = async (req, res, next) => {
  const access: string | undefined = req.cookies?.[ACCESS_COOKIE];
  const refresh: string | undefined = req.cookies?.[REFRESH_COOKIE];

  if (access) {
    const { data, error } = await supabase.auth.getUser(access);
    if (!error && data.user) {
      req.user = data.user;
      return next();
    }
  }

  if (refresh) {
    const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session && data.user) {
      setSessionCookies(res, data.session);
      req.user = data.user;
      return next();
    }
  }

  clearSessionCookies(res);
  throw new HttpError(401, "Not authenticated");
};
