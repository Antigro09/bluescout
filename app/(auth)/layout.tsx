import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-brand-gradient flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Wordmark className="text-2xl" />
      </Link>
      <div className="mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
