"use client";

import Link from "next/link";
import { useList } from "@/lib/useList";
import type { Resource } from "@/lib/api";
import { card } from "./ui";

function StatCard({ resource, label }: { resource: Resource; label: string }) {
  // limit=1: we only need the total count from meta.
  const { meta, loading, error } = useList(resource, { limit: 1 });
  return (
    <Link href={`/${resource}`} className={`${card} block p-5 transition-colors hover:border-indigo-400`}>
      <div className="text-sm font-medium text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
        {loading ? "…" : error ? "—" : meta.total}
      </div>
      {error ? (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="mt-3 text-sm text-indigo-600 dark:text-indigo-400">Manage {label.toLowerCase()} →</div>
      )}
    </Link>
  );
}

export function DashboardStats() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <StatCard resource="employees" label="Employees" />
      <StatCard resource="branches" label="Branches" />
      <StatCard resource="positions" label="Positions" />
    </div>
  );
}
