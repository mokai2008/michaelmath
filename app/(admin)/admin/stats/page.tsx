"use client";

import { 
  Users, 
  CreditCard, 
  Clock, 
  Send
} from "lucide-react";
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
    newStudents: 0
  });

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

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

      // 4. Total Revenue (mocking to fetch from enrollments/purchases if they had price, for now just static or 0)
      
      setStats({
        totalStudents: studentCount || 0,
        newStudents: newCount || 0,
        avgTimeSpent: `${hours}h ${minutes}m`,
        totalRevenue: 0 // Replace with actual revenue query when payments are connected
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-text/60 text-sm font-medium">Total Students</div>
            <div className="text-2xl font-bold text-text">{stats.totalStudents}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <div className="text-text/60 text-sm font-medium">Total Revenue</div>
            <div className="text-2xl font-bold text-text">£{stats.totalRevenue}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <div className="text-text/60 text-sm font-medium">Avg. Time Spent/Wk</div>
            <div className="text-2xl font-bold text-text">{stats.avgTimeSpent}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <div className="text-text/60 text-sm font-medium">New This Week</div>
            <div className="text-2xl font-bold text-text">{stats.newStudents}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
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
