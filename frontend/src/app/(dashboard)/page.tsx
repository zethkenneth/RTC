import { DashboardStats } from "@/components/DashboardStats";
import { PageHeader } from "@/components/ui";

export default function Home() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Overview of employees, branches and positions.
      </p>
      <DashboardStats />
    </>
  );
}
