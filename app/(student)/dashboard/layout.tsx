"use client";

import Link from "next/link";
import { 
  BookOpen, 
  Wallet, 
  Video, 
  Bell, 
  Clock, 
  User, 
  LogOut,
  Leaf
} from "lucide-react";

import { ChatBot } from "@/components/ChatBot";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', session.user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Optionally, set up an interval or real-time listener here
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-text tracking-tight">Student Portal</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <Link href="/dashboard/courses" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <BookOpen className="w-5 h-5" />
            My Courses
          </Link>
          <Link href="/dashboard/wallet" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Wallet className="w-5 h-5" />
            Wallet
          </Link>
          <Link href="/dashboard/live-sessions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Video className="w-5 h-5" />
            Live Sessions
          </Link>
          <Link href="/dashboard/reminders" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <Clock className="w-5 h-5" />
            Reminders
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </Link>
          <Link href="/dashboard/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text/70 hover:bg-gray-100 hover:text-text font-medium transition-colors">
            <User className="w-5 h-5" />
            Profile
          </Link>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={async () => {
              const { supabase } = await import('@/lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/';
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

      {/* Floating AI Assistant */}
      <ChatBot />
    </div>
  );
}
