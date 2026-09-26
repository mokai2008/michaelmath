"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AdminAiAssistant } from "@/components/AdminAiAssistant";
import { playNotificationSound, showDesktopNotification } from "@/lib/sound";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings,
  Mail,
  LogOut,
  Leaf,
  Video,
  TrendingUp,
  Wallet,
  Home,
  Menu,
  X,
  Bot,
  Sparkles,
  Bell
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [incomingMessageToast, setIncomingMessageToast] = useState<{
    id: string;
    name: string;
    email: string;
    message: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

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

  // Auto-dismiss incoming message toast after 10 seconds
  useEffect(() => {
    if (incomingMessageToast) {
      const timer = setTimeout(() => {
        setIncomingMessageToast(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [incomingMessageToast]);

  useEffect(() => {
    let channel: any = null;
    let interval: any = null;

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

      // 2. Fetch pending requests & unread messages count
      const fetchCounts = async () => {
        try {
          const [{ count: bookingCount }, { count: msgCount }] = await Promise.all([
            supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "unread"),
          ]);
          setPendingRequests(bookingCount || 0);
          setUnreadMessages(msgCount || 0);
        } catch (err) {
          console.debug("Failed to fetch admin notification counts:", err);
        }
      };

      await fetchCounts();

      // 3. Set up Supabase Realtime channel for instant contact message notifications
      channel = supabase
        .channel('admin_contact_messages_notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'contact_messages' },
          (payload: any) => {
            const newMsg = payload.new;
            setUnreadMessages((prev) => prev + 1);
            playNotificationSound();

            const senderName = `${newMsg.first_name || ''} ${newMsg.last_name || ''}`.trim() || 'Website Visitor';
            setIncomingMessageToast({
              id: newMsg.id,
              name: senderName,
              email: newMsg.email || '',
              message: newMsg.message || '',
            });

            showDesktopNotification(
              `📩 New contact message from ${senderName}`,
              newMsg.message || 'You received a new inquiry on the contact form.',
              () => {
                router.push('/admin/messages');
              }
            );
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contact_messages' },
          async (payload: any) => {
            if (payload.eventType !== 'INSERT') {
              try {
                const { count } = await supabase
                  .from("contact_messages")
                  .select("*", { count: "exact", head: true })
                  .eq("status", "unread");
                setUnreadMessages(count || 0);
              } catch (e) {
                console.debug("Error updating message count:", e);
              }
            }
          }
        )
        .subscribe();
    };

    checkAuthAndFetch();

    // Listen to local client event when message is marked as read
    const handleMessageReadEvent = () => {
      setUnreadMessages((prev) => Math.max(0, prev - 1));
    };
    window.addEventListener('contact_message_read', handleMessageReadEvent);

    // Regular interval polling fallback
    interval = setInterval(async () => {
      try {
        const [{ count: bookingCount }, { count: msgCount }] = await Promise.all([
          supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "unread"),
        ]);
        setPendingRequests(bookingCount || 0);
        setUnreadMessages(msgCount || 0);
      } catch (err) {
        console.debug("Polling error for admin notifications:", err);
      }
    }, 20000);

    return () => {
      if (interval) clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('contact_message_read', handleMessageReadEvent);
    };
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
    { href: "/admin/messages", icon: Mail, label: "Contact Messages", badge: unreadMessages },
    { href: "/admin/wallet", icon: Wallet, label: "Wallet" },
    { href: "/admin/chat-logs", icon: MessageSquare, label: "AI Chat Logs" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 relative overflow-hidden">
      {/* Real-time Incoming Message Toast Notification */}
      {incomingMessageToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500/40 p-4 animate-in slide-in-from-top-4 duration-300 ring-4 ring-emerald-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 flex-shrink-0">
              <Mail className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">New Message</span>
                <span className="text-[10px] text-text/40">Just now</span>
              </div>
              <h4 className="font-bold text-text text-sm truncate">{incomingMessageToast.name}</h4>
              <p className="text-xs text-text/60 truncate">{incomingMessageToast.email}</p>
              <p className="text-xs text-text/80 line-clamp-2 mt-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                "{incomingMessageToast.message}"
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/admin/messages"
                  onClick={() => setIncomingMessageToast(null)}
                  className="text-xs font-bold bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  View Message &rarr;
                </Link>
                <button
                  onClick={() => setIncomingMessageToast(null)}
                  className="text-xs font-semibold text-text/50 hover:text-text px-2 py-1.5 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setIncomingMessageToast(null)}
              className="text-text/40 hover:text-text p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-text/70 hover:bg-gray-100 transition-colors relative"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
          {(unreadMessages > 0 || pendingRequests > 0) && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
        <Link href="/admin/stats" className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-text tracking-tight">Admin Area</span>
        </Link>
        <button
          onClick={() => setAiAssistantOpen(true)}
          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
          aria-label="Open AI Co-Pilot"
        >
          <Bot className="w-5 h-5" />
        </button>
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
          {/* AI Admin Co-Pilot Quick Button in Navigation */}
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="w-full flex items-center justify-between px-3 py-3 md:py-2.5 mb-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1 bg-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm">AI Admin Co-Pilot</span>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </button>

          {navLinks.map(({ href, icon: Icon, label, badge }) => {
            const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between px-3 py-3 md:py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text/70 hover:bg-gray-100 hover:text-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </div>
                {badge !== undefined && badge > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse flex items-center justify-center min-w-[20px] h-5">
                    {badge}
                  </span>
                )}
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
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 relative">
        {children}

        {/* Floating AI Admin Assistant Trigger Button */}
        {!aiAssistantOpen && (
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 hover:scale-105 transition-all group"
            title="Open AI Admin Co-Pilot"
          >
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-bold pr-2 hidden sm:inline">AI Co-Pilot</span>
          </button>
        )}

        {/* Admin AI Assistant Drawer */}
        <AdminAiAssistant 
          isOpen={aiAssistantOpen} 
          onClose={() => setAiAssistantOpen(false)} 
        />
      </main>
    </div>
  );
}
