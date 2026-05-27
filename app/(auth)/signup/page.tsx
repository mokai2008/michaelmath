"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [studentWhatsapp, setStudentWhatsapp] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    // Validate that student and parent WhatsApp numbers are different
    const normalizedStudent = studentWhatsapp.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    const normalizedParent = parentWhatsapp.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (normalizedParent && normalizedStudent === normalizedParent) {
      setErrorMsg("Student's WhatsApp number and Parent's WhatsApp number cannot be the same.");
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            student_whatsapp: studentWhatsapp,
            parent_email: parentEmail,
            parent_whatsapp: parentWhatsapp
          }
        }
      });

      if (error) throw error;

      // Automatically log the user in or wait for email confirmation
      if (data.session && data.user) {
        // Update the newly created profile with the parent info and student whatsapp
        try {
          await supabase.from('profiles').update({
            student_whatsapp: studentWhatsapp,
            parent_email: parentEmail,
            parent_whatsapp: parentWhatsapp
          }).eq('id', data.user.id);
        } catch (profileErr) {
          console.error("Profile update error (non-critical):", profileErr);
        }
        
        router.push(redirectTo || "/dashboard");
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setErrorMsg(err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-text mb-2">Check your inbox</h3>
        <p className="text-text/70 mb-8 max-w-sm mx-auto">
          We've sent a confirmation link to <span className="font-semibold text-text">{email}</span>. Please click the link to activate your account.
        </p>
        <Link 
          href="/login" 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-text">Create an Account</h3>
        <p className="text-sm text-text/70">Start your math journey today</p>
      </div>
      
      <form className="space-y-4" onSubmit={handleSignup}>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="John Doe" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text mb-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="you@example.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" 
              placeholder="••••••••" 
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

        <div>
          <label className="block text-sm font-medium text-text mb-1">Student's WhatsApp</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input type="tel" value={studentWhatsapp} onChange={(e) => setStudentWhatsapp(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="Student's WhatsApp Number" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-sm font-medium text-text mb-3">Parent/Guardian Contact</p>
          
          <div className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="Parent's Email (Optional)" />
              </div>
            </div>
            
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input type="tel" value={parentWhatsapp} onChange={(e) => setParentWhatsapp(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="Parent's WhatsApp Number" />
              </div>
            </div>
          </div>
        </div>

        {errorMsg && !isSuccess && (
          <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-bold text-lg transition-all"
          >
            {isLoading ? "Creating account..." : "Sign up"} 
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="text-center text-sm text-text/70 mt-4">
          Already have an account?{" "}
          <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"} className="font-bold text-primary hover:text-primary/80">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-text/60">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
