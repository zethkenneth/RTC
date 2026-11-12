"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ApiError, downloadPayrollReport, type PayrollReportInput } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { Branch, Employee } from "@/lib/types";
import { Alert, Button, card, Field, inputClass, PageHeader } from "./ui";

type Settings = Required<Omit<PayrollReportInput, "branch_ids">>;
type Quarter = Settings["quarter"];

const QUARTERS: { value: Quarter; label: string }[] = [
  { value: 1, label: "Q1 – January to March" },
  { value: 2, label: "Q2 – April to June" },
  { value: 3, label: "Q3 – July to September" },
  { value: 4, label: "Q4 – October to December" },
];

const today = new Date();
const thisQuarter = (Math.floor(today.getMonth() / 3) + 1) as Quarter;

// Defaults copied from "List of RTC PJs, Officials and Personnel.docx".
const DEFAULTS: Settings = {
  year: today.getFullYear(),
  quarter: thisQuarter,
  treasurer: "MARITA A. CALAJE",
  checked_by_name: "Atty. ROSALIE C. AROSA",
  checked_by_title: "Clerk of Court VII",
  noted_by_name: "ACHILLES ARISTOTLE APOLINARIO C. BULAUITAN",
  noted_by_title: "Executive Judge",
  noted_by_line: "RTC Branch 154 – Pasig City",
  rows_per_page: 22,
};

const STORAGE_KEY = "rtc.payrollReport.settings";

// Last-used settings, remembered in this browser so they don't need retyping each quarter.
// Returns the stored text (a stable value React can compare), not a new object each time.
function readSavedRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function parseSaved(raw: string | null): Settings {
  if (!raw) return DEFAULTS;
  try {
    // Keep only known settings (older versions saved a free-text period_covered).
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const known = Object.fromEntries(Object.entries(parsed).filter(([k]) => k in DEFAULTS));
    const merged = { ...DEFAULTS, ...known };
    return { ...merged, rows_per_page: Math.min(merged.rows_per_page, 23) };
  } catch {
    return DEFAULTS;
  }
}
function save(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.): fine, just not remembered.
  }
}
const noopSubscribe = () => () => {};
const NUMERIC = new Set<keyof Settings>(["year", "quarter", "rows_per_page"]);

export function PayrollReportPage() {
  // Read saved settings on the client only (the server has no localStorage).
  const savedRaw = useSyncExternalStore(noopSubscribe, readSavedRaw, () => null);
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);
  const [edited, setEdited] = useState<Settings | null>(null);
  const form = edited ?? saved;
  const set = (k: keyof Settings) => (e: { target: { value: string } }) =>
    setEdited({ ...form, [k]: NUMERIC.has(k) ? Number(e.target.value) : e.target.value });

  const branches = useList<Branch>("branches", { limit: 100 });
  const onPayroll = useList<Employee>("employees", { payroll_flag: "true", limit: 1 });

  const [selectAll, setSelectAll] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectAll && selected.size === 0) {
      setError("Choose at least one branch, or select all branches.");
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setDone(null);
    try {
      save(form);
      const filename = await downloadPayrollReport({
        ...form,
        branch_ids: selectAll ? undefined : [...selected],
      });
      setDone(filename);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        setError(err.message);
      } else {
        setError("Could not generate the report");
      }
    } finally {
      setBusy(false);
    }
  };

  const fe = (k: string) => fieldErrors[k]?.[0];
  const missingSignatories = branches.data.filter(
    (b) => (selectAll || selected.has(b.id)) && (!b.signatory_one || !b.signatory_two),
  );

  return (
    <>
      <PageHeader title="Payroll report" />
      <p className="mb-6 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Generates the Pasig City Payroll as a Word file, one section per branch, using the same layout as
        &ldquo;List of RTC PJs, Officials and Personnel.docx&rdquo;. Only employees marked{" "}
        <strong>Include in payroll</strong> are listed
        {!onPayroll.loading && !onPayroll.error && <> (currently {onPayroll.meta.total})</>}. Each employee is paid
        ₱1,000 for every month of the quarter they were in service, counted from their hire month to their
        retirement month. Each branch&apos;s footer uses its two signatories.
      </p>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} space-y-4 p-5`}>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Document details</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Period covered (quarter)" error={fe("quarter")}>
              <select required value={form.quarter} onChange={set("quarter")} className={inputClass}>
                {QUARTERS.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year" error={fe("year")}>
              <input
                type="number"
                required
                min={2000}
                max={2100}
                value={form.year}
                onChange={set("year")}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">
            Each row shows the months that employee is paid for, e.g. &ldquo;August-September {form.year}&rdquo;
            for someone hired in August.
          </p>
          <Field label="City Treasurer" error={fe("treasurer")}>
            <input required maxLength={100} value={form.treasurer} onChange={set("treasurer")} className={inputClass} />
          </Field>

          <h3 className="pt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Checked/Verified by</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={fe("checked_by_name")}>
              <input required maxLength={100} value={form.checked_by_name} onChange={set("checked_by_name")} className={inputClass} />
            </Field>
            <Field label="Title" error={fe("checked_by_title")}>
              <input required maxLength={100} value={form.checked_by_title} onChange={set("checked_by_title")} className={inputClass} />
            </Field>
          </div>

          <h3 className="pt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Noted by</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={fe("noted_by_name")}>
              <input required maxLength={100} value={form.noted_by_name} onChange={set("noted_by_name")} className={inputClass} />
            </Field>
            <Field label="Title" error={fe("noted_by_title")}>
              <input required maxLength={100} value={form.noted_by_title} onChange={set("noted_by_title")} className={inputClass} />
            </Field>
          </div>
          <Field label="Extra line (optional)" error={fe("noted_by_line")}>
            <input maxLength={100} value={form.noted_by_line} onChange={set("noted_by_line")} className={inputClass} />
          </Field>

          <Field label="Employees per page" error={fe("rows_per_page")}>
            <input
              type="number"
              min={5}
              max={23}
              required
              value={form.rows_per_page}
              onChange={set("rows_per_page")}
              className={`${inputClass} max-w-28`}
            />
          </Field>
          <p className="-mt-2 text-xs text-zinc-500">At most 23 fit on a page. Lower it if long names wrap.</p>

          <button
            type="button"
            onClick={() => setEdited(DEFAULTS)}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Reset to defaults
          </button>
        </section>

        <section className={`${card} flex flex-col gap-4 p-5`}>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Branches</h2>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => setSelectAll(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            All branches
          </label>
          {!selectAll && (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              {branches.loading && <p className="p-2 text-sm text-zinc-500">Loading…</p>}
              {branches.data.map((b) => (
                <label key={b.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => toggle(b.id)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {b.branch_name}
                </label>
              ))}
            </div>
          )}

          {missingSignatories.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {missingSignatories.length === 1 ? "1 branch is" : `${missingSignatories.length} branches are`} missing a
              signatory, so a blank signing line will be printed:{" "}
              {missingSignatories.map((b) => b.branch_name).join(", ")}.{" "}
              <Link href="/branches" className="underline">
                Set signatories
              </Link>
            </div>
          )}

          <div className="mt-auto space-y-3">
            {error && <Alert>{error}</Alert>}
            {done && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                Downloaded <strong>{done}</strong>.
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Generating…" : "Generate Word file (.docx)"}
            </Button>
          </div>
        </section>
      </form>
    </>
  );
}
