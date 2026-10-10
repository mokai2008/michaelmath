"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MathLogoBadge } from "@/components/PiLogo";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkSession = async (session: any) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/courses", label: "Courses" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <MathLogoBadge size="md" />
              <span className="font-bold text-base md:text-xl text-text tracking-tight whitespace-nowrap shrink-0">
                <span className="hidden sm:inline">Michael Gad </span>
                <span className="sm:hidden">MG </span>
                <span className="text-primary font-normal">
                  <span className="hidden sm:inline">| Math Academy</span>
                  <span className="sm:hidden">Math</span>
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center space-x-8 shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text hover:text-primary font-medium transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth buttons + mobile hamburger */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Link 
                    href="/admin/stats" 
                    className="bg-slate-900 text-white hover:bg-slate-800 px-3.5 md:px-5 py-2 md:py-2.5 rounded-full font-bold transition-all hover:shadow-md text-xs md:text-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-slate-700"
                    title="Go to Admin Dashboard"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Admin Panel</span>
                  </Link>
                ) : (
                  <Link 
                    href="/dashboard" 
                    className="bg-primary text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5 text-sm md:text-base whitespace-nowrap shrink-0"
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-text hover:text-primary font-medium transition-colors hidden lg:block whitespace-nowrap shrink-0"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-accent text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold hover:bg-accent/90 transition-all hover:shadow-md hover:-translate-y-0.5 text-sm md:text-base whitespace-nowrap shrink-0"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-text hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {isLoggedIn && isAdmin && (
              <Link
                href="/admin/stats"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm mb-2 shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Admin Dashboard
                </span>
                <span className="text-xs text-white/70">Enter Admin →</span>
              </Link>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-text hover:bg-primary/5 hover:text-primary font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {!isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-text hover:bg-primary/5 hover:text-primary font-medium transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
