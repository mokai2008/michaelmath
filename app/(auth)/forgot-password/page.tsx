"use client";

import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // Ensure canonical domain with www is used so it matches Supabase allowlist and avoids 301 stripping hash
      const origin = window.location.origin.includes("gadmaths.com") && !window.location.origin.includes("www.gadmaths.com")
        ? window.location.origin.replace("gadmaths.com", "www.gadmaths.com")
        : window.location.origin;
      const redirectTo = `${origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) throw error;

      setIsSuccess(true);
      setCountdown(60);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setErrorMsg(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Check Your Email</h2>
          <p className="text-sm text-text/70 leading-relaxed max-w-sm mx-auto">
            We have sent a password reset link to{" "}
            <span className="font-semibold text-text">{email}</span>.
            Please check your inbox (and spam folder) and click the link to reset your password.
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-text/60 space-y-2 text-left">
          <p className="font-medium text-text/80">Didn&apos;t receive the email?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few moments before requesting another link</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading || countdown > 0}
            onClick={() => handleReset()}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-text font-semibold hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Sending..." : countdown > 0 ? `Resend link in ${countdown}s` : "Resend reset link"}
          </button>

          <Link
            href="/login"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primary/90 font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-text mb-1">Reset Password</h2>
        <p className="text-sm text-text/60">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleReset}>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              required
              autoFocus
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold text-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending reset link..." : "Send Reset Link"}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        <div className="text-center text-sm text-text/70">
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-text/60">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
