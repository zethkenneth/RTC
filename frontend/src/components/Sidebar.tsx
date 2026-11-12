"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, authApi } from "@/lib/api";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/branches", label: "Branches" },
  { href: "/positions", label: "Positions" },
  { href: "/reports/payroll", label: "Payroll report" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setEmail(res.data.email))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
      });
  }, [router]);

  const logout = async () => {
    setSigningOut(true);
    await authApi.logout().catch(() => undefined);
    // The dashboard stays alive (hidden) after navigating away, so reset before leaving;
    // otherwise "Logging out…" is still showing after the next login.
    setSigningOut(false);
    setEmail(null);
    router.replace("/login");
    router.refresh();
  };

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-3 md:w-56 md:shrink-0 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mr-4 hidden px-3 pb-6 text-lg font-semibold text-zinc-900 md:block dark:text-zinc-100">
        RTC Directory
      </div>
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
              active
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-2 md:mt-auto md:ml-0 md:flex-col md:items-stretch md:border-t md:border-zinc-200 md:pt-4 md:dark:border-zinc-800">
        {email && (
          <span className="hidden truncate px-3 text-xs text-zinc-500 md:block" title={email}>
            {email}
          </span>
        )}
        <button
          onClick={logout}
          disabled={signingOut}
          className="whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {signingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </nav>
  );
}
