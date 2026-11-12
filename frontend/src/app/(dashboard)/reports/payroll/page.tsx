import type { Metadata } from "next";
import { PayrollReportPage } from "@/components/PayrollReportPage";

export const metadata: Metadata = { title: "Payroll report · RTC Directory" };

export default function Page() {
  return <PayrollReportPage />;
}
