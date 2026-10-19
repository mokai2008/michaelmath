"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Listen for auth state changes (such as PASSWORD_RECOVERY event)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setIsVerifying(false);
        setIsSessionValid(true);
      }
    });

    const verifySession = async () => {
      // 1. If PKCE code is present in query parameters, exchange it
      const code = searchParams.get("code");
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (mounted) {
            setIsVerifying(false);
            setIsSessionValid(true);
            return;
          }
        } catch (err) {
          console.error("Code exchange error:", err);
        }
      }

      // 2. If token_hash & type are present (direct email OTP verification)
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (token_hash && type) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (error) throw error;
          if (mounted) {
            setIsVerifying(false);
            setIsSessionValid(true);
            return;
          }
        } catch (err) {
          console.error("OTP verification error:", err);
        }
      }

      // 3. Check if active session already exists (or was parsed from hash fragment by supabase-js)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (mounted) {
          setIsVerifying(false);
          setIsSessionValid(true);
          return;
        }
      }

      // 4. Fallback grace period to allow client to process hash parameters
      setTimeout(async () => {
        if (!mounted) return;
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();
        if (delayedSession) {
          setIsVerifying(false);
          setIsSessionValid(true);
        } else {
          setIsVerifying(false);
          setIsSessionValid(false);
        }
      }, 1500);
    };

    verifySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setIsSuccess(true);
      // Clean redirect after 3 seconds
      setTimeout(() => {
        router.push("/login?message=password_updated");
      }, 3000);
    } catch (err: any) {
      console.error("Update password error:", err);
      setErrorMsg(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-text">Verifying Reset Link</h3>
        <p className="text-sm text-text/60">Please wait while we verify your recovery link...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Password Updated!</h2>
          <p className="text-sm text-text/70 leading-relaxed max-w-sm mx-auto">
            Your password has been changed successfully. You will be redirected to the sign in page in a moment.
          </p>
        </div>

        <div>
          <Link
            href="/login"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primary/90 font-bold transition-all shadow-sm"
          >
            Continue to Sign in
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!isSessionValid) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-text/70 leading-relaxed max-w-sm mx-auto">
            This password reset link is invalid, expired, or has already been used. Please request a new link to reset your password.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/forgot-password"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primary/90 font-bold transition-all shadow-sm"
          >
            Request New Link
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-text font-semibold hover:bg-gray-50 transition-all"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-text mb-1">Set New Password</h2>
        <p className="text-sm text-text/60">
          Enter your new password below.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleUpdatePassword}>
        <div>
          <label className="block text-sm font-medium text-text mb-1">New Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-text/50 mt-1">Must be at least 6 characters long</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Confirm New Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={6}
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
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
            {isLoading ? "Updating password..." : "Update Password"}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        <div className="text-center text-sm text-text/70">
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Back to Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-text/60">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
