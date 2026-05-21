"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-xl text-text tracking-tight">
                Michael Gad <span className="text-primary font-normal">| Math Academy</span>
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-text hover:text-primary font-medium transition-colors">Home</Link>
            <Link href="/about" className="text-text hover:text-primary font-medium transition-colors">About</Link>
            <Link href="/courses" className="text-text hover:text-primary font-medium transition-colors">Courses</Link>
            <Link href="/contact" className="text-text hover:text-primary font-medium transition-colors">Contact</Link>
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-text hover:text-primary font-medium transition-colors hidden sm:block"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold hover:bg-accent/90 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
