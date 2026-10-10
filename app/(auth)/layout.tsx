import Link from "next/link";
import { MathLogoBadge } from "@/components/PiLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-alt py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 group mb-4">
            <MathLogoBadge size="lg" />
          </Link>
          <p className="mt-1 text-sm text-text/70">
            Michael Gad Math Academy
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
