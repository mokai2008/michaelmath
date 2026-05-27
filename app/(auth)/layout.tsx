import Link from "next/link";
import { Leaf } from "lucide-react";

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
            <div className="bg-primary/10 p-2 rounded-lg">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
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
