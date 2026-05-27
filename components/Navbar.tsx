"use client";

import Link from "next/link";
import { Leaf, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
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
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Leaf className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <span className="font-bold text-base md:text-xl text-text tracking-tight">
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
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text hover:text-primary font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth buttons + mobile hamburger */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="bg-primary text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5 text-sm md:text-base"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-text hover:text-primary font-medium transition-colors hidden md:block"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-accent text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold hover:bg-accent/90 transition-all hover:shadow-md hover:-translate-y-0.5 text-sm md:text-base"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-text hover:bg-gray-100 transition-colors"
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
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="px-4 py-4 space-y-1">
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
