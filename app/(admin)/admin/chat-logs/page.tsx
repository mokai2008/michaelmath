"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  MessageSquare, 
  Search, 
  User, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  Ban, 
  RotateCcw, 
  ExternalLink, 
  Cpu, 
  DollarSign, 
  Filter,
  Sparkles,
  AlertTriangle,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ChatLog = {
  id: string;
  student_id: string;
  messages: any[];
  context: any;
  created_at: string;
  total_messages?: number;
  total_tokens?: number;
  last_active_at?: string;
  profiles: {
    id?: string;
    full_name: string;
    email: string;
    avatar_url: string;
    ai_enabled?: boolean;
    ai_disabled_reason?: string;
    ai_daily_limit?: number | null;
    student_code?: string;
  } | null;
};

type UsageSummary = {
  totalMessages: number;
  totalTokens: number;
  estimatedCost: number;
  totalChats: number;
  activeStudents: number;
  blockedStudents: number;
};

function formatTokens(tokens: number): string {
  if (!tokens || tokens <= 0) return '0';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toLocaleString();
}

function calculateTokensFromMessages(messages: any[]): number {
  if (!messages || !Array.isArray(messages)) return 0;
  // Estimate ~1.3 tokens per word if token count not explicitly saved
  return messages.reduce((acc, m) => {
    if (m.usage?.totalTokens) return acc + m.usage.totalTokens;
    const words = (m.content || '').trim().split(/\s+/).filter(Boolean).length;
    return acc + Math.ceil(words * 1.33);
  }, 0);
}

export default function AdminChatLogsPage() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*, profiles(id, full_name, email, avatar_url, ai_enabled, ai_disabled_reason, ai_daily_limit, student_code)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogs(data as ChatLog[]);
        if (data.length > 0) {
          setSelectedLog(data[0] as ChatLog);
        }
      }
    } catch (err) {
      console.error("Failed to load chat logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle student AI access (Stop / Enable)
  const handleToggleStudentAi = async (studentId: string, currentStatus: boolean, studentName: string) => {
    const nextStatus = !currentStatus;
    const confirmPrompt = nextStatus
      ? `Are you sure you want to RE-ENABLE AI Assistant access for ${studentName}?`
      : `Are you sure you want to STOP/DISABLE AI Assistant access for ${studentName}?\n\nThey will immediately be blocked from using the AI chat assistant.`;

    if (!window.confirm(confirmPrompt)) return;

    setIsTogglingAi(true);
    setActionSuccessMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Authentication expired. Please refresh the page.");
        setIsTogglingAi(false);
        return;
      }

      const res = await fetch('/api/admin/toggle-student-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          studentId,
          aiEnabled: nextStatus,
          reason: nextStatus ? '' : 'AI Assistant access has been paused for your account by Michael Gad.'
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update AI status');

      // Update state locally
      setLogs(prev => prev.map(log => {
        if (log.student_id === studentId || log.profiles?.id === studentId) {
          return {
            ...log,
            profiles: log.profiles ? { ...log.profiles, ai_enabled: nextStatus } : null
          };
        }
        return log;
      }));

      if (selectedLog && (selectedLog.student_id === studentId || selectedLog.profiles?.id === studentId)) {
        setSelectedLog(prev => prev ? {
          ...prev,
          profiles: prev.profiles ? { ...prev.profiles, ai_enabled: nextStatus } : null
        } : null);
      }

      setActionSuccessMsg(result.message || `AI access ${nextStatus ? 'enabled' : 'stopped'} successfully.`);
      setTimeout(() => setActionSuccessMsg(""), 4000);

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsTogglingAi(false);
    }
  };

  // Summary Metrics
  const summary: UsageSummary = useMemo(() => {
    const uniqueStudents = new Set<string>();
    let totalMessages = 0;
    let totalTokens = 0;
    let activeStudents = 0;
    let blockedStudents = 0;

    const studentStatusMap = new Map<string, boolean>();

    logs.forEach(log => {
      const studentId = log.student_id;
      uniqueStudents.add(studentId);
      
      const msgsCount = log.messages?.length || 0;
      totalMessages += msgsCount;

      const tokens = log.total_tokens || calculateTokensFromMessages(log.messages);
      totalTokens += tokens;

      const isAiEnabled = log.profiles?.ai_enabled !== false;
      studentStatusMap.set(studentId, isAiEnabled);
    });

    studentStatusMap.forEach(isEnabled => {
      if (isEnabled) activeStudents++;
      else blockedStudents++;
    });

    // Estimate blended cost (~$5/M tokens avg between input/output and Claude/GPT)
    const estimatedCost = (totalTokens / 1_000_000) * 5.0;

    return {
      totalMessages,
      totalTokens,
      estimatedCost,
      totalChats: logs.length,
      activeStudents,
      blockedStudents,
    };
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const name = log.profiles?.full_name?.toLowerCase() || '';
      const email = log.profiles?.email?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || email.includes(query);

      const isAiEnabled = log.profiles?.ai_enabled !== false;
      if (statusFilter === 'active' && !isAiEnabled) return false;
      if (statusFilter === 'blocked' && isAiEnabled) return false;

      return matchesSearch;
    });
  }, [logs, searchQuery, statusFilter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col space-y-4">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">AI Chat Logs & Usage Tracking</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Live Monitor
            </span>
          </div>
          <p className="text-text/60 text-xs sm:text-sm mt-0.5">
            Track student questions, OpenAI/Claude token consumption, and manage student AI permissions.
          </p>
        </div>

        {actionSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {actionSuccessMsg}
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-shrink-0">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text/50">Total AI Messages</div>
            <div className="text-lg font-bold text-text">{summary.totalMessages.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text/50">Tokens Consumed</div>
            <div className="text-lg font-bold text-purple-700">~{formatTokens(summary.totalTokens)}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text/50">Est. API Cost</div>
            <div className="text-lg font-bold text-emerald-700">${summary.estimatedCost.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text/50">Active Students</div>
            <div className="text-lg font-bold text-teal-700">{summary.activeStudents}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text/50">AI Stopped / Paused</div>
            <div className="text-lg font-bold text-red-700">{summary.blockedStudents}</div>
          </div>
        </div>
      </div>

      {/* Main Workspace (Sidebar + Viewer) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-1 min-h-0">
        
        {/* Left Sidebar - Chat List & Filters */}
        <div className="w-80 md:w-96 border-r border-gray-100 flex flex-col flex-shrink-0 bg-gray-50/50">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-gray-100 bg-white space-y-2.5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by student or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-xs"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors ${
                  statusFilter === 'active' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Active ({summary.activeStudents})
              </button>
              <button
                onClick={() => setStatusFilter('blocked')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors ${
                  statusFilter === 'blocked' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Paused ({summary.blockedStudents})
              </button>
            </div>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                Loading AI conversations...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No matching chat logs found.
              </div>
            ) : (
              filteredLogs.map(log => {
                const isSelected = selectedLog?.id === log.id;
                const isAiEnabled = log.profiles?.ai_enabled !== false;
                const msgsCount = log.messages?.length || 0;
                const tokensCount = log.total_tokens || calculateTokensFromMessages(log.messages);
                const lastMsg = log.messages[log.messages.length - 1];

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-3.5 hover:bg-gray-50 transition-colors ${
                      isSelected 
                        ? 'bg-primary/5 border-l-4 border-l-primary' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-1.5">
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                        {log.profiles?.avatar_url ? (
                          <img src={log.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-text text-xs truncate">
                            {log.profiles?.full_name || 'Unknown Student'}
                          </h3>
                          {/* AI Permission Badge */}
                          {isAiEnabled ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200 flex-shrink-0">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full border border-red-200 flex-shrink-0">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text/50 truncate">{log.profiles?.email}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-text/70 line-clamp-2 pl-1 mb-2 bg-gray-50/80 p-1.5 rounded border border-gray-100/60 font-sans">
                      {lastMsg?.content ? (
                        <span>
                          <strong className="text-text/90">{lastMsg.role === 'user' ? 'Student: ' : 'AI: '}</strong>
                          {lastMsg.content}
                        </span>
                      ) : 'Empty session'}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text/40 pt-1 border-t border-gray-100/80">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-700 font-semibold px-1.5 py-0.5 rounded">
                          {msgsCount} msgs
                        </span>
                        <span className="bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
                          ~{formatTokens(tokensCount)} tok
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Selected Chat Viewer & Management Controls */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {selectedLog ? (
            <>
              {/* Header with Student Info, Token Usage & 1-Click AI Toggle */}
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/60 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-300">
                    {selectedLog.profiles?.avatar_url ? (
                      <img src={selectedLog.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-text text-base">
                        {selectedLog.profiles?.full_name || 'Unknown Student'}
                      </h2>
                      {selectedLog.profiles?.student_code && (
                        <span className="text-[10px] bg-gray-200 text-gray-700 font-mono px-2 py-0.5 rounded-full font-bold">
                          {selectedLog.profiles.student_code}
                        </span>
                      )}
                      {selectedLog.profiles?.ai_enabled !== false ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          AI Active
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-red-600" />
                          AI Paused
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-text/60 flex items-center gap-3 mt-1 flex-wrap">
                      <span>{selectedLog.profiles?.email}</span>
                      <span>•</span>
                      <span>Page: <code className="bg-gray-200/80 px-1.5 py-0.5 rounded text-[11px] text-gray-800">{selectedLog.context?.currentPage || '/dashboard'}</code></span>
                      <span>•</span>
                      <span className="text-purple-700 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        ~{formatTokens(selectedLog.total_tokens || calculateTokensFromMessages(selectedLog.messages))} tokens
                      </span>
                    </div>
                  </div>
                </div>

                {/* Management Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  {/* Link to Student Directory Profile */}
                  <Link
                    href={`/admin/students`}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    title="View full student academic records & WhatsApp generator"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                    Student Records
                  </Link>

                  {/* Immediate 1-Click AI Control Button */}
                  {selectedLog.profiles?.ai_enabled !== false ? (
                    <button
                      onClick={() => handleToggleStudentAi(
                        selectedLog.student_id, 
                        true, 
                        selectedLog.profiles?.full_name || selectedLog.profiles?.email || 'Student'
                      )}
                      disabled={isTogglingAi}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      title="Instantly stop this student from using the AI Chatbot"
                    >
                      {isTogglingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      Stop AI Usage
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStudentAi(
                        selectedLog.student_id, 
                        false, 
                        selectedLog.profiles?.full_name || selectedLog.profiles?.email || 'Student'
                      )}
                      disabled={isTogglingAi}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      title="Re-enable AI Assistant access for this student"
                    >
                      {isTogglingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Enable AI Access
                    </button>
                  )}
                </div>
              </div>

              {/* Disabled Warning Notice if Student AI is stopped */}
              {selectedLog.profiles?.ai_enabled === false && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-800 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>
                      <strong>AI Access is currently STOPPED for this student.</strong> They cannot send messages or consume API tokens.
                    </span>
                  </div>
                  <span className="text-[11px] text-red-700 underline font-semibold">
                    Blocked
                  </span>
                </div>
              )}

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gray-50/20">
                {selectedLog.messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-text/40 font-semibold mb-1 px-1">
                      {msg.role === 'user' ? (selectedLog.profiles?.full_name || 'Student') : 'AI Assistant'}
                      {msg.model && <span className="ml-1.5 text-primary/70">({msg.model})</span>}
                    </div>

                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-2xs ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-white border border-gray-100 text-text rounded-bl-none'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 text-xs font-bold text-primary">
                          <Cpu className="w-4 h-4" />
                          <span>Michael Gad AI Response</span>
                          {msg.provider && (
                            <span className="ml-auto text-[10px] font-normal uppercase bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                              {msg.provider}
                            </span>
                          )}
                        </div>
                      )}

                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="attached question" 
                          className="max-w-full rounded-lg mb-3 border border-black/10 max-h-72 object-contain bg-black/5" 
                        />
                      )}

                      {msg.content && (
                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.content}
                        </p>
                      )}

                      {msg.usage && (
                        <div className="mt-3 pt-1.5 border-t border-gray-100 text-[10px] text-text/40 flex items-center justify-between font-mono">
                          <span>Tokens: {msg.usage.totalTokens || (msg.usage.promptTokens + msg.usage.completionTokens)}</span>
                          {msg.usage.estimatedCostCents && (
                            <span>Cost: ~{(msg.usage.estimatedCostCents / 100).toFixed(4)} USD</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text mb-2">No Conversation Selected</h2>
              <p className="text-text/60 text-xs md:text-sm max-w-md">
                Select a student interaction from the sidebar to inspect the prompt, track token usage, or toggle their AI permission.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
