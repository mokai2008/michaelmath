"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings,
  LogOut,
  Leaf,
  Video,
  TrendingUp,
  Wallet,
  Home,
  Menu,
  X
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // 1. Check Authentication & Role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (profile?.role !== 'admin') {
        router.push("/dashboard");
        return;
      }
      
      setIsChecking(false);

      // 2. Fetch pending requests if authorized
      const { count } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingRequests(count || 0);
    };

    checkAuthAndFetch();
    const interval = setInterval(async () => {
      const { count } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingRequests(count || 0);
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (isChecking) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-text/60 font-medium">Verifying access...</div>;
  }

  const navLinks = [
    { href: "/", icon: Home, label: "Back to Website" },
    { href: "/admin/stats", icon: BarChart3, label: "Dashboard Stats" },
    { href: "/admin/courses", icon: BookOpen, label: "Course Builder" },
    { href: "/admin/students", icon: Users, label: "Students" },
    { href: "/admin/performance", icon: TrendingUp, label: "Performance" },
    { href: "/admin/submissions", icon: MessageSquare, label: "Submissions" },
    { href: "/admin/wallet", icon: Wallet, label: "Wallet" },
    { href: "/admin/chat-logs", icon: MessageSquare, label: "AI Chat Logs" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-text/70 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/admin/stats" className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-text tracking-tight">Admin Area</span>
        </Link>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Backdrop overlay (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64 md:z-auto
      `}>
        <div className="h-16 md:h-20 flex items-center justify-between px-5 md:px-6 border-b border-gray-200 flex-shrink-0">
          <Link href="/admin/stats" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-text tracking-tight">Admin Area</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-text/40 hover:text-text/70 hover:bg-gray-100 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 md:py-6 px-3 md:px-4 space-y-1">
          {navLinks.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text/70 hover:bg-gray-100 hover:text-text'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}

          {/* Live Sessions with badge */}
          <Link
            href="/admin/live-sessions"
            className={`flex items-center justify-between px-3 py-3 md:py-2.5 rounded-lg font-medium transition-colors ${
              pathname?.startsWith('/admin/live-sessions')
                ? 'bg-primary/10 text-primary'
                : 'text-text/70 hover:bg-gray-100 hover:text-text'
            }`}
          >
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5" />
              Live Sessions
            </div>
            {pendingRequests > 0 && (
              <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests}</span>
            )}
          </Link>
        </div>
        
        <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-red-500 hover:bg-red-50 font-medium transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
