import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { pending } = await searchParams;
  return <LoginForm pending={pending === "1"} />;
}
