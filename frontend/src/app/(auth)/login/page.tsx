import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in · RTC Directory" };

export default function Page() {
  return <LoginForm />;
}
