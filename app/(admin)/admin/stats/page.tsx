"use client";

import { 
  Users, 
  CreditCard, 
  Clock, 
  Send,
  Video,
  Server,
  Eye,
  Sparkles,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export default function AdminStatsPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRevenue: 0,
    avgTimeSpent: "0h 0m",
    newStudents: 0,
    totalVideoOpens: 0,
    totalAiMessages: 0,
    totalAiTokens: 0,
  });

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [serverOpensData, setServerOpensData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // 2. New This Week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: newCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .gte('created_at', oneWeekAgo.toISOString());

      // 3. Avg time spent
      const { data: progress } = await supabase
        .from('topic_progress')
        .select('time_spent_seconds');
      
      let totalSeconds = 0;
      progress?.forEach(p => totalSeconds += (p.time_spent_seconds || 0));
      const avgSeconds = studentCount ? totalSeconds / studentCount : 0;
      const hours = Math.floor(avgSeconds / 3600);
      const minutes = Math.floor((avgSeconds % 3600) / 60);

      // 4. Video Server Opens
      const { data: serverOpens } = await supabase
        .from('video_server_opens')
        .select('server_index, server_url');

      let totalOpens = 0;
      if (serverOpens) {
        totalOpens = serverOpens.length;
        const counts: Record<number, number> = {};
        serverOpens.forEach((so: any) => {
          const idx = so.server_index ?? 0;
          counts[idx] = (counts[idx] || 0) + 1;
        });

        const chartData = Object.keys(counts).map((key) => {
          const idx = parseInt(key, 10);
          return {
            server: `Server ${idx + 1}`,
            opens: counts[idx]
          };
        }).sort((a, b) => a.server.localeCompare(b.server));

        setServerOpensData(chartData);
      }

      // 5. AI Chat Messages & Usage
      const { data: chatLogs } = await supabase
        .from('chat_logs')
        .select('messages, total_messages, total_tokens');

      let totalAiMsgs = 0;
      let totalAiToks = 0;
      chatLogs?.forEach((c: any) => {
        totalAiMsgs += (c.total_messages || c.messages?.length || 0);
        totalAiToks += (c.total_tokens || (c.messages?.length || 0) * 120);
      });
      
      setStats({
        totalStudents: studentCount || 0,
        newStudents: newCount || 0,
        avgTimeSpent: `${hours}h ${minutes}m`,
        totalRevenue: 0,
        totalVideoOpens: totalOpens,
        totalAiMessages: totalAiMsgs,
        totalAiTokens: totalAiToks,
      });
    };
    fetchStats();
  }, []);
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text">Dashboard Overview</h1>
          <p className="text-text/60 text-sm">Welcome back, Michael. Here's what's happening today.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap">
          <Send className="w-4 h-4" />
          Send Weekly Reports
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium">Students</div>
            <div className="text-xl font-bold text-text">{stats.totalStudents}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium">Revenue</div>
            <div className="text-xl font-bold text-text">£{stats.totalRevenue}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium">Avg. Study/Wk</div>
            <div className="text-xl font-bold text-text">{stats.avgTimeSpent}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium">New / Week</div>
            <div className="text-xl font-bold text-text">{stats.newStudents}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium">Video Opens</div>
            <div className="text-xl font-bold text-text">{stats.totalVideoOpens}</div>
          </div>
        </div>
        <Link 
          href="/admin/chat-logs"
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all flex items-center gap-3 group"
          title="Click to view AI Chat Logs & Token Usage"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center flex-shrink-0 transition-colors">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-text/60 text-xs font-medium group-hover:text-purple-700 transition-colors">AI Queries</div>
            <div className="text-xl font-bold text-purple-700">{stats.totalAiMessages}</div>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
        {/* Academic Performance Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-text mb-6">Average Quiz Scores</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <RechartsTooltip cursor={{fill: '#f3f4f6'}} />
                {performanceData.length > 0 ? (
                  <Bar dataKey="score" fill="#3CC68A" radius={[4, 4, 0, 0]} />
                ) : (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="14">No data available</text>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-text mb-6">Revenue Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                {revenueData.length > 0 ? (
                  <Line type="monotone" dataKey="amount" stroke="#FF5A3C" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                ) : (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="14">No data available</text>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Video Opens Per Server Chart (Admin Only) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-text">Video Opens per Server</h3>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              Admin Only
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serverOpensData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="server" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#fffbe6'}} />
                {serverOpensData.length > 0 ? (
                  <Bar dataKey="opens" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                ) : (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="14">No video opens yet</text>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-text">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-text/60 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Student</th>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              <tr className="hover:bg-gray-50">
                <td colSpan={5} className="px-6 py-8 text-center text-text/50 font-medium">No recent transactions.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
