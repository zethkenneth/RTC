"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { authApi, ApiError } from "@/lib/api";
import { Alert, Button, Field, inputClass } from "../ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const shouldReset = useRef(false);

  // Next.js keeps this page alive (hidden) after navigating away. Once a link was sent,
  // start fresh next time instead of showing the old "Check your email" screen.
  useLayoutEffect(() => {
    return () => {
      if (shouldReset.current) {
        shouldReset.current = false;
        setSent(null);
        setEmail("");
        setError(null);
      }
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email);
      setSent(res.data.message);
      shouldReset.current = true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = (
    <Link href="/login" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
      ← Back to log in
    </Link>
  );

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Check your email</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{sent}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The link expires after a while. If it doesn&apos;t arrive, check your spam folder or try again.
        </p>
        {backToLogin}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Forgot password</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <div className="text-center">{backToLogin}</div>
    </form>
  );
}
