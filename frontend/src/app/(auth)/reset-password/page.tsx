import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password · RTC Directory" };

export default function Page() {
  return <ResetPasswordForm />;
}
