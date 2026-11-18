import { CourtLogo } from "@/components/auth/CourtLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <div className="mb-4 flex justify-center gap-5">
            <CourtLogo src="/rtc-logo.png" name="Regional Trial Court" label="RTC" />
          </div>
          <div className="font-serif text-zinc-900 dark:text-zinc-100">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Republic of the Philippines</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">National Capital Judicial Region</p>
            <p className="my-1 text-xl font-semibold">Regional Trial Courts</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Pasig City</p>
          </div>
        </header>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {children}
        </div>
      </div>
    </div>
  );
}
