import type { Response, CookieOptions } from "express";
import type { Session } from "@supabase/supabase-js";
import { isProduction } from "./env.js";

export const ACCESS_COOKIE = "rtc_access";
export const REFRESH_COOKIE = "rtc_refresh";

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// httpOnly: page scripts can't read the tokens. sameSite=lax: blocks cross-site form posts.
const base: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export function setSessionCookies(res: Response, session: Session) {
  res.cookie(ACCESS_COOKIE, session.access_token, { ...base, maxAge: session.expires_in * 1000 });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { ...base, maxAge: REFRESH_MAX_AGE_MS });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
