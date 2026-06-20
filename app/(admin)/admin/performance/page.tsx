"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, TrendingUp, TrendingDown, Award, FileText, CheckCircle2, XCircle, Bell, Search, User, ChevronDown } from "lucide-react";

export default function PerformancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentQuizzes, setStudentQuizzes] = useState<any[]>([]);
  const [tab, setTab] = useState<'feed' | 'students'>('feed');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch admin notifications
      const { data: notifs } = await supabase
        .from('admin_notifications')
        .select('*, profiles:student_id (full_name, email, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);
      setNotifications(notifs || []);

      // Mark all as read
      if (notifs && notifs.some(n => !n.is_read)) {
        await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
      }

      // Fetch students with quiz submissions
      const { data: studs } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, avatar_url,
          quiz_submissions (id, score, submitted_at, quiz_id, quizzes:quiz_id (total_marks, passing_score, topics:topic_id (title)))
        `)
        .eq('role', 'student')
        .order('full_name');
      setStudents(studs || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentStats = (student: any) => {
    const subs = student.quiz_submissions || [];
    if (subs.length === 0) return { avg: 0, total: 0, passed: 0, failed: 0 };
    let totalPct = 0, passed = 0, failed = 0;
    subs.forEach((s: any) => {
      const marks = s.quizzes?.total_marks || 1;
      const passingScore = s.quizzes?.passing_score || 70;
      const pct = (s.score / marks) * 100;
      totalPct += pct;
      if (pct >= passingScore) passed++; else failed++;
    });
    return { avg: Math.round(totalPct / subs.length), total: subs.length, passed, failed };
  };

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    const { data } = await supabase
      .from('quiz_submissions')
      .select('*, quizzes:quiz_id (total_marks, passing_score, type, topics:topic_id (title))')
      .eq('student_id', student.id)
      .order('submitted_at', { ascending: false });
    setStudentQuizzes(data || []);
  };

  const filteredStudents = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNotifIcon = (type: string) => {
    if (type === 'quiz_completed') return <CheckCircle2 className="w-4 h-4" />;
    if (type === 'worksheet_submitted') return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getNotifColor = (n: any) => {
    if (n.type === 'quiz_completed') {
      return n.metadata?.passed ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100';
    }
    return 'text-blue-600 bg-blue-50 border-blue-100';
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  // Calculate overall stats
  const allSubs = students.flatMap(s => s.quiz_submissions || []);
  const overallAvg = allSubs.length > 0 ? Math.round(allSubs.reduce((sum: number, s: any) => sum + ((s.score / (s.quizzes?.total_marks || 1)) * 100), 0) / allSubs.length) : 0;
  const totalPassed = allSubs.filter((s: any) => ((s.score / (s.quizzes?.total_marks || 1)) * 100) >= (s.quizzes?.passing_score || 70)).length;
  const passRate = allSubs.length > 0 ? Math.round((totalPassed / allSubs.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Student Performance</h1>
        <p className="text-text/60 text-sm">Track quiz scores, submissions, and overall student progress.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Award className="w-5 h-5 text-primary" /></div>
          <div><div className="text-text/50 text-xs font-medium">Avg Score</div><div className="text-2xl font-bold text-text">{overallAvg}%</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Pass Rate</div><div className="text-2xl font-bold text-text">{passRate}%</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Total Attempts</div><div className="text-2xl font-bold text-text">{allSubs.length}</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center"><Bell className="w-5 h-5 text-orange-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Recent Alerts</div><div className="text-2xl font-bold text-text">{notifications.length}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('feed')} className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${tab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}>
          Activity Feed ({notifications.length})
        </button>
        <button onClick={() => setTab('students')} className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${tab === 'students' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}>
          Student Analytics ({students.length})
        </button>
      </div>

      {tab === 'feed' && (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-text/50">
              <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No activity yet. Notifications will appear here when students submit quizzes or worksheets.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${getNotifColor(n)}`}>
                <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-text">{n.profiles?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-text/50">{n.message}</span>
                  </div>
                  <p className="text-xs font-medium text-text/70 mt-0.5">{n.title}</p>
                  {n.metadata?.percentage !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${n.metadata.passed ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${n.metadata.percentage}%` }} />
                      </div>
                      <span className="text-xs font-bold">{n.metadata.percentage}%</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-text/40 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="relative mb-3">
              <input type="text" placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {filteredStudents.map(student => {
                const stats = getStudentStats(student);
                return (
                  <div key={student.id} onClick={() => handleStudentClick(student)} className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-text truncate">{student.full_name || 'Unnamed'}</h4>
                        <p className="text-[10px] text-text/40">{student.email}</p>
                      </div>
                      {stats.total > 0 && (
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${stats.avg >= 70 ? 'bg-green-50 text-green-700' : stats.avg >= 50 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                          {stats.avg}%
                        </div>
                      )}
                    </div>
                    {stats.total > 0 && (
                      <div className="mt-2 flex gap-3 text-[10px] text-text/50">
                        <span>{stats.total} attempt{stats.total !== 1 ? 's' : ''}</span>
                        <span className="text-green-600">{stats.passed} passed</span>
                        <span className="text-red-500">{stats.failed} failed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Detail */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {selectedStudent.avatar_url ? <img src={selectedStudent.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text">{selectedStudent.full_name || 'Unnamed'}</h3>
                      <p className="text-sm text-text/50">{selectedStudent.email}</p>
                    </div>
                    {(() => { const s = getStudentStats(selectedStudent); return s.total > 0 ? (
                      <div className="ml-auto flex gap-4">
                        <div className="text-center"><div className="text-2xl font-black text-text">{s.avg}%</div><div className="text-[10px] text-text/40 uppercase font-bold">Avg Score</div></div>
                        <div className="text-center"><div className="text-2xl font-black text-green-600">{s.passed}</div><div className="text-[10px] text-text/40 uppercase font-bold">Passed</div></div>
                        <div className="text-center"><div className="text-2xl font-black text-red-500">{s.failed}</div><div className="text-[10px] text-text/40 uppercase font-bold">Failed</div></div>
                      </div>
                    ) : null; })()}
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-4">Quiz History</h4>
                  {studentQuizzes.length === 0 ? (
                    <p className="text-sm text-text/50 text-center py-8">No quiz attempts yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                      {studentQuizzes.map((sq: any) => {
                        const total = sq.quizzes?.total_marks || 1;
                        const pct = Math.round((sq.score / total) * 100);
                        const pass = pct >= (sq.quizzes?.passing_score || 70);
                        return (
                          <div key={sq.id} className={`p-4 rounded-xl border flex items-center gap-4 ${pass ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${pass ? 'bg-green-100' : 'bg-red-100'}`}>
                              {pass ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-sm text-text truncate">{sq.quizzes?.topics?.title || 'Unknown Topic'}</h5>
                              <p className="text-xs text-text/50">{new Date(sq.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`text-lg font-black ${pass ? 'text-green-600' : 'text-red-500'}`}>{pct}%</div>
                              <div className="text-[10px] text-text/40">{sq.score}/{total}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-text/40 min-h-[400px]">
                <TrendingUp className="w-12 h-12 mb-4" />
                <p className="font-medium">Select a student to view their performance</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
