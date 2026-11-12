import { Router } from "express";
import { z } from "zod";
import { createAuthClient, supabase } from "../lib/supabase.js";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/errors.js";
import { ACCESS_COOKIE, clearSessionCookies, setSessionCookies } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";
import { parse } from "../middleware/validate.js";

const email = z.email().trim().toLowerCase();

const LoginBody = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});
const ForgotBody = z.object({ email });
const ResetBody = z.object({
  access_token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const auth = Router();

// POST /api/auth/login  { email, password }
auth.post("/login", async (req, res) => {
  const body = parse(LoginBody, req.body);
  const { data, error } = await createAuthClient().auth.signInWithPassword(body);

  if (error || !data.session) {
    if (error?.status === 429) throw new HttpError(429, "Too many attempts. Please wait and try again.");
    if (error?.code === "email_not_confirmed") throw new HttpError(403, "Please confirm your email first.");
    if (error?.code === "invalid_credentials" || error?.status === 400) {
      // Same message for unknown email and wrong password, so attackers can't probe accounts.
      throw new HttpError(401, "Invalid email or password");
    }
    console.error("signInWithPassword failed:", error);
    throw new HttpError(503, "Login is temporarily unavailable. Please try again.");
  }

  setSessionCookies(res, data.session);
  res.json({ data: { id: data.user.id, email: data.user.email } });
});

// POST /api/auth/logout
auth.post("/logout", async (req, res) => {
  const access: string | undefined = req.cookies?.[ACCESS_COOKIE];
  // Revoke the session on Supabase too, so a stolen refresh token stops working.
  if (access) await supabase.auth.admin.signOut(access, "local").catch(() => undefined);
  clearSessionCookies(res);
  res.status(204).end();
});

// GET /api/auth/me  -> the signed-in user
auth.get("/me", requireAuth, (req, res) => {
  res.json({ data: { id: req.user!.id, email: req.user!.email } });
});

// POST /api/auth/forgot-password  { email }
auth.post("/forgot-password", async (req, res) => {
  const { email } = parse(ForgotBody, req.body);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  });
  if (error?.status === 429) throw new HttpError(429, "Too many requests. Please wait and try again.");
  if (error) console.error("resetPasswordForEmail failed:", error.message);
  // Always the same answer, so this can't be used to find out which emails have accounts.
  res.json({ data: { message: "If an account exists for that email, a reset link has been sent." } });
});

// POST /api/auth/reset-password  { access_token, password }
// access_token comes from the link in the reset email.
auth.post("/reset-password", async (req, res) => {
  const { access_token, password } = parse(ResetBody, req.body);

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data.user) {
    throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
  }

  const update = await supabase.auth.admin.updateUserById(data.user.id, { password });
  if (update.error) {
    const status = update.error.status === 422 || update.error.code === "weak_password" ? 400 : 500;
    throw new HttpError(status, status === 400 ? update.error.message : "Could not update password");
  }

  // Sign out every existing session for this user; they log in again with the new password.
  await supabase.auth.admin.signOut(access_token, "global").catch(() => undefined);
  clearSessionCookies(res);
  res.json({ data: { message: "Password updated. You can now log in." } });
});
