import type { Metadata } from "next";
import { BranchesPage } from "@/components/BranchesPage";

export const metadata: Metadata = { title: "Branches · RTC Directory" };

export default function Page() {
  return <BranchesPage />;
}
