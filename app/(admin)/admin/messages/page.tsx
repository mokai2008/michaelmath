"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Clock, CheckCircle, Trash2, RefreshCw, Loader2, User, MessageSquare } from "lucide-react";

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
  }, []);

  const markAsRead = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (msg.status === 'unread') {
      try {
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'read' })
          .eq('id', msg.id);

        if (!error) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
        }
      } catch (err) {
        console.error(err);
      }
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
        setMessages(prev => prev.filter(m => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredMessages = messages.filter(m => filter === 'all' || m.status === 'unread');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" /> Contact Messages
          </h1>
          <p className="text-text/60 text-sm mt-1">
            View and manage inquiry messages sent from the Contact Us form.
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-text text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
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
