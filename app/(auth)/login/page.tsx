"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const messageParam = searchParams.get("message");
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    urlError === "verification_failed" ? "Verification link was invalid or has expired." : ""
  );
  const [successMsg, setSuccessMsg] = useState(
    messageParam === "password_updated"
      ? "Password updated successfully! Please sign in with your new password."
      : messageParam === "verified"
      ? "Email verified successfully! You can now sign in."
      : ""
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If there's a redirect param, go there after login
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      
      // Otherwise check role to redirect to correct dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      if (profile?.role === 'admin') {
        router.push("/admin/courses");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text text-center mb-1">Welcome Back</h2>
      <p className="text-sm text-text/60 text-center mb-6">Sign in to your account</p>
      <form className="space-y-6" onSubmit={handleLogin}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-text">Password</label>
            <Link
              href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl border border-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
          {errorMsg}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold text-lg transition-all"
        >
          {isLoading ? "Signing in..." : "Sign in"} 
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="text-center text-sm text-text/70">
        Don't have an account?{" "}
        <Link href={redirectTo ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup"} className="font-bold text-primary hover:text-primary/80">
          Sign up
        </Link>
      </div>
    </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-text/60">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
