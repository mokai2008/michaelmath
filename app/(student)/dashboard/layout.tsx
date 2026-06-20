"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  BookOpen, 
  Wallet, 
  Video, 
  Bell, 
  Clock, 
  User, 
  LogOut,
  Leaf,
  Home,
  Menu,
  X
} from "lucide-react";

import { ChatBot } from "@/components/ChatBot";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
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
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // If admin, redirect to admin dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role === 'admin') {
        router.push('/admin/courses');
        return;
      }

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', session.user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    checkRoleAndFetch();

    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', session.user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const navLinks = [
    { href: "/", icon: Home, label: "Back to Website" },
    { href: "/dashboard/courses", icon: BookOpen, label: "My Courses" },
    { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
    { href: "/dashboard/live-sessions", icon: Video, label: "Live Sessions" },
    { href: "/dashboard/reminders", icon: Clock, label: "Reminders" },
    { href: "/dashboard/profile", icon: User, label: "Profile" },
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-text tracking-tight">Student Portal</span>
        </Link>
        <Link href="/dashboard/notifications" className="relative p-2 -mr-2 rounded-lg text-text/70 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>
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
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-text tracking-tight">Student Portal</span>
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

          {/* Notifications with badge */}
          <Link
            href="/dashboard/notifications"
            className={`flex items-center justify-between px-3 py-3 md:py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/dashboard/notifications'
                ? 'bg-primary/10 text-primary'
                : 'text-text/70 hover:bg-gray-100 hover:text-text'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </Link>
        </div>
        
        <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
          <button 
            onClick={async () => {
              const { supabase } = await import('@/lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/';
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

      {/* Floating AI Assistant */}
      <ChatBot />
    </div>
  );
}
