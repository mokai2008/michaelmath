"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  Bell,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  ExternalLink
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
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [incomingMessageToast, setIncomingMessageToast] = useState<{
    id: string;
    name: string;
    email: string;
    message: string;
  } | null>(null);
  const [incomingSubmissionToast, setIncomingSubmissionToast] = useState<{
    id: string;
    studentName: string;
    studentEmail?: string;
    type: string;
    typeLabel: string;
    title: string;
    topicTitle: string;
    message?: string;
    remainingCount: number;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  const lastProcessedSubmissionRef = useRef<{ id: string; time: number } | null>(null);

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

  // Auto-dismiss incoming submission toast after 12 seconds
  useEffect(() => {
    if (incomingSubmissionToast) {
      const timer = setTimeout(() => {
        setIncomingSubmissionToast(null);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [incomingSubmissionToast]);

  const triggerSubmissionNotification = async (payloadItem: any, fallbackRemaining?: number) => {
    const studentId = payloadItem.student_id;
    const topicId = payloadItem.topic_id || payloadItem.metadata?.topic_id;
    const eventType = payloadItem.type || 'worksheet';
    
    // Dedup check: ignore if same student + event within 3.5 seconds
    const dedupKey = `${studentId}_${topicId || ''}_${eventType}`;
    const now = Date.now();
    if (lastProcessedSubmissionRef.current && 
        lastProcessedSubmissionRef.current.id === dedupKey && 
        (now - lastProcessedSubmissionRef.current.time) < 3500) {
      return;
    }
    lastProcessedSubmissionRef.current = { id: dedupKey, time: now };

    // Fetch student profile if not provided
    let studentName = payloadItem.metadata?.student_name || '';
    let studentEmail = payloadItem.metadata?.student_email || '';
    if (!studentName && studentId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', studentId)
          .maybeSingle();
        studentName = profile?.full_name || profile?.email || 'Student';
        studentEmail = profile?.email || '';
      } catch (e) {
        studentName = 'Student';
      }
    }
    if (!studentName) studentName = 'Student';

    // Fetch topic title if needed
    let topicTitle = payloadItem.metadata?.topic_title || '';
    if (!topicTitle && topicId) {
      try {
        const { data: topic } = await supabase
          .from('topics')
          .select('title')
          .eq('id', topicId)
          .maybeSingle();
        topicTitle = topic?.title || 'Lesson / Assignment';
      } catch (e) {
        topicTitle = 'Assignment';
      }
    }
    if (!topicTitle) topicTitle = 'Lesson Assignment';

    // Format type label
    let typeLabel = 'Worksheet';
    if (eventType.includes('pdf_quiz')) {
      typeLabel = 'PDF Quiz';
    } else if (eventType.includes('quiz')) {
      typeLabel = 'Quiz';
    } else if (eventType.includes('worksheet')) {
      typeLabel = 'Worksheet';
    }

    // Get current remaining pending count from manual_submissions
    let countToDisplay = fallbackRemaining;
    try {
      const { count: freshPendingCount } = await supabase
        .from('manual_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (freshPendingCount !== null && freshPendingCount !== undefined) {
        countToDisplay = freshPendingCount;
        setPendingSubmissions(freshPendingCount);
      }
    } catch (e) {}

    const remainingNum = countToDisplay !== undefined ? countToDisplay : 1;

    // Play notification chime
    playNotificationSound();

    const titleText = payloadItem.title || `${typeLabel} Submitted: ${topicTitle}`;
    const descText = payloadItem.message || `${studentName} submitted ${typeLabel.toLowerCase()} answers for review.`;

    setIncomingSubmissionToast({
      id: payloadItem.id || String(now),
      studentName,
      studentEmail,
      type: eventType,
      typeLabel,
      title: titleText,
      topicTitle,
      message: descText,
      remainingCount: remainingNum,
    });

    showDesktopNotification(
      `📝 New ${typeLabel} from ${studentName}`,
      `${studentName} submitted ${typeLabel} for "${topicTitle}". ${remainingNum} submission${remainingNum === 1 ? '' : 's'} remaining to check.`,
      () => {
        router.push('/admin/submissions');
      },
      'michaelmath-submission'
    );
  };

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

      // 2. Fetch pending requests, unread messages & pending submissions count
      const fetchCounts = async () => {
        try {
          const [{ count: bookingCount }, { count: msgCount }, { count: subCount }] = await Promise.all([
            supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "unread"),
            supabase.from("manual_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
          ]);
          setPendingRequests(bookingCount || 0);
          setUnreadMessages(msgCount || 0);
          setPendingSubmissions(subCount || 0);
        } catch (err) {
          console.debug("Failed to fetch admin notification counts:", err);
        }
      };

      await fetchCounts();

      // 3. Set up Supabase Realtime channel for instant notifications
      channel = supabase
        .channel('admin_global_realtime_dashboard')
        // Contact messages
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
              },
              'michaelmath-contact'
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
        // Manual Submissions (Worksheets & PDF Quizzes)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'manual_submissions' },
          async (payload: any) => {
            try {
              const { count } = await supabase
                .from("manual_submissions")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");
              const freshCount = count || 0;
              setPendingSubmissions(freshCount);

              if (payload.eventType === 'INSERT') {
                await triggerSubmissionNotification(payload.new, freshCount);
              } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'pending' && payload.old?.status !== 'pending') {
                await triggerSubmissionNotification(payload.new, freshCount);
              }
            } catch (e) {
              console.debug("Error updating submission count from realtime:", e);
            }
          }
        )
        // Admin Notifications (Interactive Quizzes, Canva Quizzes, etc.)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
          async (payload: any) => {
            try {
              const notif = payload.new;
              if (['worksheet_submitted', 'pdf_quiz_submitted', 'quiz_completed'].includes(notif?.type)) {
                await triggerSubmissionNotification(notif);
              }
            } catch (e) {
              console.debug("Error handling admin_notifications realtime:", e);
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

    // Listen to local client event when submission is marked as reviewed
    const handleSubmissionReviewedEvent = () => {
      setPendingSubmissions((prev) => Math.max(0, prev - 1));
    };

    // Listen to exact submission count updates from SubmissionsPage
    const handleSubmissionCountUpdated = (e: any) => {
      if (typeof e.detail === 'number') {
        setPendingSubmissions(e.detail);
      }
    };

    window.addEventListener('contact_message_read', handleMessageReadEvent);
    window.addEventListener('submission_reviewed', handleSubmissionReviewedEvent);
    window.addEventListener('submissions_count_updated', handleSubmissionCountUpdated);

    // Regular interval polling fallback
    interval = setInterval(async () => {
      try {
        const [{ count: bookingCount }, { count: msgCount }, { count: subCount }] = await Promise.all([
          supabase.from("booking_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "unread"),
          supabase.from("manual_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        setPendingRequests(bookingCount || 0);
        setUnreadMessages(msgCount || 0);
        setPendingSubmissions(subCount || 0);
      } catch (err) {
        console.debug("Polling error for admin notifications:", err);
      }
    }, 20000);

    return () => {
      if (interval) clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('contact_message_read', handleMessageReadEvent);
      window.removeEventListener('submission_reviewed', handleSubmissionReviewedEvent);
      window.removeEventListener('submissions_count_updated', handleSubmissionCountUpdated);
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
    { href: "/admin/submissions", icon: MessageSquare, label: "Submissions", badge: pendingSubmissions, badgeColor: "bg-rose-500" },
    { href: "/admin/messages", icon: Mail, label: "Contact Messages", badge: unreadMessages, badgeColor: "bg-red-500" },
    { href: "/admin/wallet", icon: Wallet, label: "Wallet" },
    { href: "/admin/chat-logs", icon: MessageSquare, label: "AI Chat Logs" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 relative overflow-hidden">
      {/* Real-time Toast Notifications Floating Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {/* Incoming Student Submission Toast */}
        {incomingSubmissionToast && (
          <div className="pointer-events-auto w-full bg-white rounded-2xl shadow-2xl border-2 border-rose-500/40 p-4 animate-in slide-in-from-top-4 duration-300 ring-4 ring-rose-500/10">
            <div className="flex items-start justify-between gap-3">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                incomingSubmissionToast.type.includes('worksheet') 
                  ? 'bg-blue-50 text-blue-600' 
                  : incomingSubmissionToast.type === 'quiz_completed'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-purple-50 text-purple-600'
              }`}>
                {incomingSubmissionToast.type.includes('worksheet') ? (
                  <FileText className="w-5 h-5 animate-pulse" />
                ) : incomingSubmissionToast.type === 'quiz_completed' ? (
                  <Sparkles className="w-5 h-5 animate-pulse" />
                ) : (
                  <ClipboardCheck className="w-5 h-5 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    incomingSubmissionToast.type.includes('worksheet')
                      ? 'bg-blue-100 text-blue-700'
                      : incomingSubmissionToast.type === 'quiz_completed'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {incomingSubmissionToast.typeLabel}
                  </span>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    {incomingSubmissionToast.remainingCount} to check
                  </span>
                </div>
                <h4 className="font-bold text-text text-sm truncate">{incomingSubmissionToast.studentName}</h4>
                {incomingSubmissionToast.studentEmail && (
                  <p className="text-[11px] text-text/50 truncate">{incomingSubmissionToast.studentEmail}</p>
                )}
                <p className="text-xs text-text/80 line-clamp-2 mt-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100 font-medium">
                  {incomingSubmissionToast.title}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/admin/submissions"
                    onClick={() => setIncomingSubmissionToast(null)}
                    className="text-xs font-bold bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                  >
                    Review Now &rarr;
                  </Link>
                  <button
                    onClick={() => setIncomingSubmissionToast(null)}
                    className="text-xs font-semibold text-text/50 hover:text-text px-2 py-1.5 rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIncomingSubmissionToast(null)}
                className="text-text/40 hover:text-text p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Incoming Contact Message Toast */}
        {incomingMessageToast && (
          <div className="pointer-events-auto w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500/40 p-4 animate-in slide-in-from-top-4 duration-300 ring-4 ring-emerald-500/10">
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
      </div>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 h-14 md:hidden shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-text/70 hover:bg-gray-100 transition-colors relative"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
            {(unreadMessages > 0 || pendingRequests > 0 || pendingSubmissions > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
          <Link href="/admin/stats" className="flex items-center gap-1.5">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm sm:text-base text-text tracking-tight">Admin Area</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg transition-all flex items-center gap-1 border border-gray-200"
            title="Browse Public Website"
          >
            <span>View Site</span>
            <ExternalLink className="w-3 h-3 text-gray-500" />
          </Link>
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
            aria-label="Open AI Co-Pilot"
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
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

          {navLinks.map(({ href, icon: Icon, label, badge, badgeColor }: any) => {
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
                  <span className={`${badgeColor || 'bg-red-500'} text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse flex items-center justify-center min-w-[20px] h-5`}>
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
      <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pb-0 md:pt-0 relative">
        {children}

        {/* Floating AI Admin Assistant Trigger Button */}
        {!aiAssistantOpen && (
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 bg-slate-900 hover:bg-slate-800 text-white p-3 md:p-3.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 hover:scale-105 transition-all group"
            title="Open AI Admin Co-Pilot"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-bold pr-1.5 hidden sm:inline">AI Co-Pilot</span>
          </button>
        )}

        {/* Admin AI Assistant Drawer */}
        <AdminAiAssistant 
          isOpen={aiAssistantOpen} 
          onClose={() => setAiAssistantOpen(false)} 
        />
      </main>

      {/* Mobile Bottom Navigation Bar (Persistent quick access to primary sections) */}
      <nav 
        aria-label="Admin mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-around px-2 py-1.5 md:hidden shadow-lg safe-area-pb"
      >
        <Link
          href="/admin/stats"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            pathname === "/admin/stats" ? "text-primary font-black" : "text-text/60 hover:text-text"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="mt-0.5">Stats</span>
        </Link>

        <Link
          href="/admin/courses"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            pathname?.startsWith("/admin/courses") ? "text-primary font-black" : "text-text/60 hover:text-text"
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="mt-0.5">Courses</span>
        </Link>

        <Link
          href="/admin/submissions"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-all relative ${
            pathname === "/admin/submissions" ? "text-primary font-black" : "text-text/60 hover:text-text"
          }`}
        >
          <div className="relative">
            <ClipboardCheck className="w-5 h-5" />
            {pendingSubmissions > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {pendingSubmissions}
              </span>
            )}
          </div>
          <span className="mt-0.5">Reviews</span>
        </Link>

        <Link
          href="/admin/students"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            pathname?.startsWith("/admin/students") ? "text-primary font-black" : "text-text/60 hover:text-text"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="mt-0.5">Students</span>
        </Link>

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold text-text/60 hover:text-text relative"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {(unreadMessages > 0 || pendingRequests > 0) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <span className="mt-0.5">More</span>
        </button>
      </nav>
    </div>
  );
}
