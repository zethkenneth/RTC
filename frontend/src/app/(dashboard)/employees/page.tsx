import type { Metadata } from "next";
import { EmployeesPage } from "@/components/EmployeesPage";

export const metadata: Metadata = { title: "Employees · RTC Directory" };

export default function Page() {
  return <EmployeesPage />;
}
