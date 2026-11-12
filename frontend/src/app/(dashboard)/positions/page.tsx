import type { Metadata } from "next";
import { NameResourcePage } from "@/components/NameResourcePage";

export const metadata: Metadata = { title: "Positions · RTC Directory" };

export default function Page() {
  return <NameResourcePage resource="positions" title="Positions" singular="Position" field="position_name" />;
}
