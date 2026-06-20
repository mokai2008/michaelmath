"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Search, User, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ChatLog = {
  id: string;
  student_id: string;
  messages: any[];
  context: any;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string;
  } | null;
};

export default function AdminChatLogsPage() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('chat_logs')
      .select('*, profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLogs(data as ChatLog[]);
      if (data.length > 0) {
        setSelectedLog(data[0] as ChatLog);
      }
    }
    setIsLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text">AI Chat Logs</h1>
          <p className="text-text/60 text-sm">Review student interactions with the AI assistant.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-1 min-h-0">
        
        {/* Left Sidebar - Chat List */}
        <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0 bg-gray-50/50">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 md:p-8 text-center text-gray-400 text-sm">Loading chats...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-4 md:p-8 text-center text-gray-400 text-sm">No chat logs found.</div>
            ) : (
              filteredLogs.map(log => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedLog?.id === log.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {log.profiles?.avatar_url ? (
                        <img src={log.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text truncate">{log.profiles?.full_name || 'Unknown Student'}</h3>
                      <p className="text-xs text-text/50 truncate">{log.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="text-xs text-text/60 line-clamp-2">
                    {log.messages[log.messages.length - 1]?.content || 'No messages'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-text/40 mt-2">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane - Chat Viewer */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedLog ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedLog.profiles?.avatar_url ? (
                      <img src={selectedLog.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-text">{selectedLog.profiles?.full_name || 'Unknown Student'}</h2>
                    <div className="text-xs text-text/60 flex items-center gap-2">
                      <span>Context:</span>
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-text/80">{selectedLog.context?.currentPage || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedLog.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-gray-100 text-text rounded-bl-none'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-primary">AI Assistant</span>
                        </div>
                      )}
                      {msg.image && (
                        <img src={msg.image} alt="attached" className="max-w-full rounded-lg mb-3 border border-black/10" />
                      )}
                      {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
              <h2 className="text-xl font-bold text-text mb-2">No Chat Selected</h2>
              <p className="text-text/60 max-w-md">Select a conversation from the sidebar to review the interaction between the student and the AI Assistant.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
