"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { authApi, ApiError } from "@/lib/api";
import { Alert, Button, Field, inputClass } from "../ui";

// The reset email sends the user here with the token in the URL hash:
//   /reset-password#access_token=...&type=recovery
// or, if the link is bad or expired:
//   /reset-password#error=access_denied&error_description=...
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;
const getServerHash = () => null; // no hash during server prerender

export function ResetPasswordForm() {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const link = useMemo(() => {
    if (hash === null) return null; // not read yet
    const p = new URLSearchParams(hash.replace(/^#/, ""));
    return {
      token: p.get("type") === "recovery" ? p.get("access_token") : null,
      error: p.get("error_description")?.replace(/\+/g, " ") ?? null,
    };
  }, [hash]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const shouldReset = useRef(false);

  // Next.js keeps this page alive (hidden) after navigating away. After a successful
  // reset, clear it so a later visit from a new email link starts fresh.
  useLayoutEffect(() => {
    return () => {
      if (shouldReset.current) {
        shouldReset.current = false;
        setDone(false);
        setPassword("");
        setConfirm("");
        setError(null);
      }
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!link?.token) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(link.token, password);
      // Remove the one-time token from the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      setDone(true);
      shouldReset.current = true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const title = <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Set a new password</h1>;
  const linkClass = "text-sm text-indigo-600 hover:underline dark:text-indigo-400";

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Password updated</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">You can now log in with your new password.</p>
        <Link href="/login" className={linkClass}>
          Go to log in →
        </Link>
      </div>
    );
  }

  if (link === null) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!link.token) {
    return (
      <div className="space-y-4">
        {title}
        <Alert>{link.error ?? "This reset link is invalid or has expired."}</Alert>
        <Link href="/forgot-password" className={linkClass}>
          Request a new link →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {title}
      <Field label="New password">
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Confirm new password">
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-zinc-500">At least 8 characters.</p>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
