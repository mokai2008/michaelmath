"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { playNotificationSound, requestDesktopNotificationPermission, showDesktopNotification } from "@/lib/sound";
import { Mail, Clock, CheckCircle, Trash2, RefreshCw, Loader2, User, MessageSquare, Bell, X } from "lucide-react";

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
}

export default function ContactMessagesAdminPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [desktopNotificationGranted, setDesktopNotificationGranted] = useState(false);
  const [liveBannerAlert, setLiveBannerAlert] = useState<{
    name: string;
    message: string;
    msg: ContactMessage;
  } | null>(null);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn("contact_messages table does not exist yet.");
          setMessages([]);
        } else {
          console.error("Error fetching messages:", error);
        }
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopNotificationGranted(Notification.permission === 'granted');
    }

    // Subscribe to real-time incoming contact messages
    const channel = supabase
      .channel('contact_messages_admin_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (payload: any) => {
          const newMsg = payload.new as ContactMessage;
          setMessages((prev) => [newMsg, ...prev.filter((m) => m.id !== newMsg.id)]);
          playNotificationSound();
          const sender = `${newMsg.first_name || ''} ${newMsg.last_name || ''}`.trim() || 'Website Visitor';
          setLiveBannerAlert({
            name: sender,
            message: newMsg.message,
            msg: newMsg,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contact_messages' },
        (payload: any) => {
          const updated = payload.new as ContactMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setSelectedMessage((curr) => (curr?.id === updated.id ? updated : curr));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'contact_messages' },
        (payload: any) => {
          const deleted = payload.old;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          setSelectedMessage((curr) => (curr?.id === deleted.id ? null : curr));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEnableAlerts = async () => {
    const granted = await requestDesktopNotificationPermission();
    setDesktopNotificationGranted(granted);
    playNotificationSound();
    if (granted) {
      showDesktopNotification(
        "Notifications Enabled! 🔔",
        "You will receive live desktop alerts when students and visitors send contact inquiries."
      );
    }
  };

  const markAsRead = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (msg.status === 'unread') {
      try {
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'read' })
          .eq('id', msg.id);

        if (!error) {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'read' } : m)));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('contact_message_read', { detail: { id: msg.id } }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = messages.filter((m) => m.status === 'unread').map((m) => m.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'read' })
        .in('id', unreadIds);

      if (!error) {
        setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' })));
        if (typeof window !== 'undefined') {
          unreadIds.forEach(() => {
            window.dispatchEvent(new CustomEvent('contact_message_read'));
          });
        }
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredMessages = messages.filter((m) => filter === 'all' || m.status === 'unread');
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Live Incoming Alert Banner */}
      {liveBannerAlert && (
        <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 bg-white/20 rounded-xl">
              <Mail className="w-5 h-5 animate-bounce" />
            </span>
            <div className="min-w-0">
              <p className="font-black text-sm">🔔 New Message Just Arrived!</p>
              <p className="text-xs text-white/90 truncate">
                From <span className="font-bold">{liveBannerAlert.name}</span>: "{liveBannerAlert.message}"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                markAsRead(liveBannerAlert.msg);
                setLiveBannerAlert(null);
              }}
              className="bg-white text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-xs"
            >
              Read Now
            </button>
            <button
              onClick={() => setLiveBannerAlert(null)}
              className="text-white/70 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <Mail className="w-7 h-7 text-primary" /> Contact Messages
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-text/60 text-sm mt-1">
            View and manage inquiry messages sent from the Contact Us form.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleEnableAlerts}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border transition-all shadow-2xs ${
              desktopNotificationGranted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title={desktopNotificationGranted ? "Desktop notifications are active" : "Enable desktop browser alerts"}
          >
            <Bell className={`w-3.5 h-3.5 ${desktopNotificationGranted ? 'text-emerald-600' : 'text-amber-600 animate-bounce'}`} />
            {desktopNotificationGranted ? 'Alerts Active' : 'Enable Alerts'}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-text/80 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-2xs"
            >
              <CheckCircle className="w-3.5 h-3.5 text-primary" /> Mark All Read
            </button>
          )}

          <button
            onClick={fetchMessages}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-text text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-text/60 hover:text-text'
          }`}
        >
          All Messages ({messages.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-primary text-primary'
              : 'border-transparent text-text/60 hover:text-text'
          }`}
        >
          Unread ({messages.filter(m => m.status === 'unread').length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="md:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-text/50 text-sm">
              No messages found.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => markAsRead(msg)}
                className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMessage?.id === msg.id
                    ? 'border-primary shadow-sm bg-primary/5'
                    : msg.status === 'unread'
                    ? 'border-primary/40 bg-white font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-text truncate">
                    {msg.first_name} {msg.last_name}
                  </span>
                  {msg.status === 'unread' && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-text/60 truncate mb-2">{msg.email}</p>
                <p className="text-xs text-text/80 line-clamp-2">{msg.message}</p>
                <div className="mt-3 flex justify-between items-center text-[10px] text-text/40">
                  <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Viewer Panel */}
        <div className="md:col-span-2">
          {selectedMessage ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-xl text-text">
                    {selectedMessage.first_name} {selectedMessage.last_name}
                  </h3>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-primary font-medium text-sm hover:underline"
                  >
                    {selectedMessage.email}
                  </a>
                  <p className="text-xs text-text/40 mt-1">
                    Sent on {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: Your Inquiry to Michael Gad Math Academy`}
                    className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" /> Reply by Email
                  </a>
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-text/40 uppercase tracking-wider mb-2">Message Body</h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-text/90 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 h-full flex flex-col items-center justify-center text-text/40 min-h-[350px]">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="font-medium text-base">Select a message from the left to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
