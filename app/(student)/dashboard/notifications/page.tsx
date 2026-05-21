"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Info, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const iconMap: Record<string, any> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<string, string> = {
  success: "text-green-500 bg-green-50",
  info: "text-blue-500 bg-blue-50",
  warning: "text-amber-500 bg-amber-50",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setSessionUser(session.user);

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    if (!sessionUser) return;
    
    // Update local state optimistically
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    // Update DB
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('student_id', sessionUser.id)
      .eq('is_read', false);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Notifications</h1>
          <p className="text-text/60 text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => {
          const Icon = iconMap[notif.type] || Bell;
          const color = colorMap[notif.type] || "text-gray-500 bg-gray-50";

          const InnerContent = (
            <div
              className={`bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all hover:shadow-md ${
                notif.is_read
                  ? "border-gray-100 opacity-60"
                  : "border-gray-200 shadow-sm"
              }`}
            >
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-text">{notif.title || "Notification"}</h3>
                  <span className="text-xs text-text/40 whitespace-nowrap flex-shrink-0">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-text/60 mt-1">{notif.message}</p>
              </div>
              {!notif.is_read && (
                <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-2"></div>
              )}
            </div>
          );

          return notif.link_url ? (
            <Link href={notif.link_url} key={notif.id} onClick={markAllRead}>
              {InnerContent}
            </Link>
          ) : (
            <div key={notif.id}>{InnerContent}</div>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text mb-2">No notifications</h3>
          <p className="text-text/60">You'll see updates here as you learn.</p>
        </div>
      )}
    </div>
  );
}
