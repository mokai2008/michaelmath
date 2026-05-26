"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Home
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isChecking, setIsChecking] = useState(true);

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-gray-200">
          <Link href="/admin/stats" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-text tracking-tight">Admin Area</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Home className="w-5 h-5" />
            Back to Website
          </Link>
          <Link href="/admin/stats" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium">
            <BarChart3 className="w-5 h-5" />
            Dashboard Stats
          </Link>
          <Link href="/admin/courses" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <BookOpen className="w-5 h-5" />
            Course Builder
          </Link>
          <Link href="/admin/students" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Users className="w-5 h-5" />
            Students
          </Link>
          <Link href="/admin/performance" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <TrendingUp className="w-5 h-5" />
            Performance
          </Link>
          <Link href="/admin/submissions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <MessageSquare className="w-5 h-5" />
            Submissions
          </Link>
          <Link href="/admin/wallet" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Wallet className="w-5 h-5" />
            Wallet
          </Link>
          <Link href="/admin/live-sessions" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5" />
              Live Sessions
            </div>
            {pendingRequests > 0 && (
              <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests}</span>
            )}
          </Link>
          <Link href="/admin/chat-logs" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <MessageSquare className="w-5 h-5" />
            AI Chat Logs
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 font-medium transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
