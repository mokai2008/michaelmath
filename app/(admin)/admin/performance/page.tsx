"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2, TrendingUp, Award, FileText, CheckCircle2, XCircle,
  Bell, Search, User, PlayCircle, BookOpen, ClipboardCheck, Eye,
  ChevronDown, ChevronUp, Download
} from "lucide-react";

interface StudentPerformance {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  student_whatsapp: string | null;
  parent_whatsapp: string | null;
  videosWatched: number;
  uniqueTopicsWatched: number;
  homeworkDelivered: number;
  quizzesDelivered: number;
  quizAvgScore: number;
  quizPassRate: number;
  topicsCompleted: number;
  enrolledCourses: number;
  quizDetails: any[];
  homeworkDetails: any[];
  videoDetails: {
    id: string;
    topicId: string;
    topicTitle: string;
    courseTitle?: string | null;
    courseId?: string;
    serverIndex: number;
    createdAt: string;
  }[];
}

export default function PerformancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformance | null>(null);
  const [tab, setTab] = useState<'feed' | 'students'>('students');
  const [detailTab, setDetailTab] = useState<'overview' | 'videos' | 'homework' | 'quizzes'>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'videos' | 'homework' | 'quizzes' | 'score'>('name');
  const [sortAsc, setSortAsc] = useState(true);

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

      // Fetch all students
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, student_whatsapp, parent_whatsapp')
        .eq('role', 'student')
        .order('full_name');

      if (!students || students.length === 0) {
        setStudentPerformance([]);
        setIsLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Fetch all data in parallel
      const [
        { data: videoOpens },
        { data: worksheetSubs },
        { data: manualSubs },
        { data: quizSubs },
        { data: topicProgress },
        { data: enrollments }
      ] = await Promise.all([
        supabase
          .from('video_server_opens')
          .select('id, student_id, topic_id, course_id, server_index, created_at')
          .in('student_id', studentIds),
        supabase
          .from('worksheet_submissions')
          .select('id, student_id, topic_id, submitted_at, topics:topic_id (title)')
          .in('student_id', studentIds),
        supabase
          .from('manual_submissions')
          .select('id, student_id, topic_id, type, status, score, feedback_text, submitted_at, reviewed_at, topics:topic_id (title)')
          .in('student_id', studentIds),
        supabase
          .from('quiz_submissions')
          .select('id, student_id, quiz_id, score, submitted_at, quizzes:quiz_id (title, total_marks, passing_score, type, topics:topic_id (title))')
          .in('student_id', studentIds),
        supabase
          .from('topic_progress')
          .select('id, student_id, topic_id, is_completed, time_spent_seconds')
          .in('student_id', studentIds),
        supabase
          .from('enrollments')
          .select('id, student_id, course_id')
          .in('student_id', studentIds)
      ]);

      // Fetch courses, sections, and topics flatly without nested join errors
      const [
        { data: allAcademyCourses },
        { data: allAcademySections },
        { data: allAcademyTopics }
      ] = await Promise.all([
        supabase.from('courses').select('id, title'),
        supabase.from('sections').select('id, title, course_id'),
        supabase.from('topics').select('id, title, section_id')
      ]);

      const coursesTitleMap = new Map<string, string>();
      (allAcademyCourses || []).forEach((c: any) => {
        coursesTitleMap.set(c.id, c.title);
      });

      const sectionsInfoMap = new Map<string, { title: string; courseTitle: string | null }>();
      (allAcademySections || []).forEach((s: any) => {
        sectionsInfoMap.set(s.id, {
          title: s.title,
          courseTitle: coursesTitleMap.get(s.course_id) || null
        });
      });

      const topicsMap = new Map<string, { title: string; courseTitle: string | null }>();
      (allAcademyTopics || []).forEach((t: any) => {
        const sec = sectionsInfoMap.get(t.section_id);
        topicsMap.set(t.id, {
          title: t.title || 'Topic Lesson',
          courseTitle: sec?.courseTitle || (allAcademyCourses && allAcademyCourses[0]?.title) || null
        });
      });

      // Build per-student performance
      const performances: StudentPerformance[] = students.map(student => {
        const sid = student.id;

        // Videos watched
        const studentVideos = (videoOpens || []).filter(v => v.student_id === sid);
        const uniqueTopics = new Set(studentVideos.map(v => v.topic_id)).size;

        // Homework: worksheet_submissions + manual_submissions where type = 'worksheet'
        const wsCount = (worksheetSubs || []).filter(w => w.student_id === sid).length;
        const manualWsCount = (manualSubs || []).filter(m => m.student_id === sid && m.type === 'worksheet').length;
        const totalHomework = wsCount + manualWsCount;

        // Homework details (combine both sources)
        const hwDetails = [
          ...(worksheetSubs || []).filter(w => w.student_id === sid).map(w => ({
            id: w.id,
            topicTitle: topicsMap.get(w.topic_id)?.title || (w as any).topics?.title || 'Worksheet',
            submittedAt: w.submitted_at,
            status: 'submitted' as string,
            score: null as number | null,
            feedback: null as string | null,
            source: 'worksheet_submissions'
          })),
          ...(manualSubs || []).filter(m => m.student_id === sid && m.type === 'worksheet').map(m => ({
            id: m.id,
            topicTitle: topicsMap.get(m.topic_id)?.title || (m as any).topics?.title || 'Worksheet',
            submittedAt: m.submitted_at,
            status: m.status,
            score: m.score,
            feedback: m.feedback_text,
            source: 'manual_submissions'
          }))
        ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        // Quizzes: quiz_submissions + manual_submissions where type = 'pdf_quiz'
        const qsCount = (quizSubs || []).filter(q => q.student_id === sid).length;
        const manualQzCount = (manualSubs || []).filter(m => m.student_id === sid && m.type === 'pdf_quiz').length;
        const totalQuizzes = qsCount + manualQzCount;

        // Quiz score calculation (from quiz_submissions only, since those have structured scores)
        const studentQuizSubs = (quizSubs || []).filter(q => q.student_id === sid);
        let quizAvg = 0;
        let quizPassRate = 0;
        if (studentQuizSubs.length > 0) {
          let totalPct = 0;
          let passed = 0;
          studentQuizSubs.forEach(q => {
            const total = (q as any).quizzes?.total_marks || 1;
            const passingScore = (q as any).quizzes?.passing_score || 70;
            const pct = (q.score / total) * 100;
            totalPct += pct;
            if (pct >= passingScore) passed++;
          });
          quizAvg = Math.round(totalPct / studentQuizSubs.length);
          quizPassRate = Math.round((passed / studentQuizSubs.length) * 100);
        }

        // Quiz details
        const quizDetails = [
          ...studentQuizSubs.map(q => {
            const topId = (q as any).quizzes?.topic_id || (q as any).topic_id;
            return {
              id: q.id,
              topicTitle: (topId ? topicsMap.get(topId)?.title : null) || (q as any).quizzes?.topics?.title || (q as any).quizzes?.title || 'Quiz Evaluation',
              quizTitle: (q as any).quizzes?.title || 'Quiz',
              submittedAt: q.submitted_at,
              score: q.score,
              totalMarks: (q as any).quizzes?.total_marks || 0,
              passingScore: (q as any).quizzes?.passing_score || 70,
              pct: Math.round((q.score / ((q as any).quizzes?.total_marks || 1)) * 100),
              source: 'quiz_submissions'
            };
          }),
          ...(manualSubs || []).filter(m => m.student_id === sid && m.type === 'pdf_quiz').map(m => ({
            id: m.id,
            topicTitle: topicsMap.get(m.topic_id)?.title || (m as any).topics?.title || 'PDF Quiz',
            quizTitle: 'PDF Quiz',
            submittedAt: m.submitted_at,
            score: m.score,
            totalMarks: null,
            passingScore: null,
            pct: m.score != null ? Math.round(m.score) : null,
            source: 'manual_submissions'
          }))
        ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        // Topic progress
        const completedTopics = (topicProgress || []).filter(
          t => t.student_id === sid && t.is_completed
        ).length;

        // Enrollments
        const studentEnrollments = (enrollments || []).filter(e => e.student_id === sid).length;

        // Video details with resolved topic title and course title
        const videoDetails = studentVideos
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(v => {
            const topicInfo = v.topic_id ? topicsMap.get(v.topic_id) : null;
            return {
              id: v.id,
              topicId: v.topic_id,
              topicTitle: topicInfo?.title || 'Video Lesson',
              courseTitle: topicInfo?.courseTitle || null,
              courseId: v.course_id,
              serverIndex: v.server_index,
              createdAt: v.created_at
            };
          });

        return {
          id: sid,
          full_name: student.full_name || 'Unnamed',
          email: student.email,
          avatar_url: student.avatar_url,
          student_whatsapp: student.student_whatsapp,
          parent_whatsapp: student.parent_whatsapp,
          videosWatched: studentVideos.length,
          uniqueTopicsWatched: uniqueTopics,
          homeworkDelivered: totalHomework,
          quizzesDelivered: totalQuizzes,
          quizAvgScore: quizAvg,
          quizPassRate: quizPassRate,
          topicsCompleted: completedTopics,
          enrolledCourses: studentEnrollments,
          quizDetails,
          homeworkDetails: hwDetails,
          videoDetails
        };
      });

      setStudentPerformance(performances);
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sorting
  const sortedStudents = [...studentPerformance]
    .filter(s =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.full_name.localeCompare(b.full_name); break;
        case 'videos': cmp = a.videosWatched - b.videosWatched; break;
        case 'homework': cmp = a.homeworkDelivered - b.homeworkDelivered; break;
        case 'quizzes': cmp = a.quizzesDelivered - b.quizzesDelivered; break;
        case 'score': cmp = a.quizAvgScore - b.quizAvgScore; break;
      }
      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(col === 'name'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

  // Export CSV
  const exportCSV = () => {
    const headers = ['Student', 'Email', 'Student WhatsApp', 'Parent WhatsApp', 'Videos Watched', 'Unique Topics Watched', 'Homework Delivered', 'Quizzes Delivered', 'Avg Quiz Score %', 'Quiz Pass Rate %', 'Topics Completed', 'Enrolled Courses'];
    const rows = sortedStudents.map(s => [
      s.full_name, s.email, s.student_whatsapp || '', s.parent_whatsapp || '',
      s.videosWatched, s.uniqueTopicsWatched, s.homeworkDelivered,
      s.quizzesDelivered, s.quizAvgScore, s.quizPassRate,
      s.topicsCompleted, s.enrolledCourses
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_performance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  // Totals for KPI
  const totalVideos = studentPerformance.reduce((sum, s) => sum + s.videosWatched, 0);
  const totalHomework = studentPerformance.reduce((sum, s) => sum + s.homeworkDelivered, 0);
  const totalQuizzes = studentPerformance.reduce((sum, s) => sum + s.quizzesDelivered, 0);
  const avgScore = studentPerformance.length > 0
    ? Math.round(studentPerformance.reduce((sum, s) => sum + s.quizAvgScore, 0) / studentPerformance.filter(s => s.quizzesDelivered > 0).length || 0)
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Student Performance</h1>
          <p className="text-text/60 text-sm">Track videos watched, homework delivered, quiz scores, and overall progress.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center"><PlayCircle className="w-5 h-5 text-purple-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Videos Watched</div><div className="text-2xl font-bold text-text">{totalVideos}</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Homework Delivered</div><div className="text-2xl font-bold text-text">{totalHomework}</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-teal-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Quizzes Delivered</div><div className="text-2xl font-bold text-text">{totalQuizzes}</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Award className="w-5 h-5 text-primary" /></div>
          <div><div className="text-text/50 text-xs font-medium">Avg Quiz Score</div><div className="text-2xl font-bold text-text">{avgScore || 0}%</div></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center"><Bell className="w-5 h-5 text-orange-500" /></div>
          <div><div className="text-text/50 text-xs font-medium">Recent Alerts</div><div className="text-2xl font-bold text-text">{notifications.length}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('students')} className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${tab === 'students' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}>
          Student Analytics ({studentPerformance.length})
        </button>
        <button onClick={() => setTab('feed')} className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${tab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}>
          Activity Feed ({notifications.length})
        </button>
      </div>

      {/* Student Analytics Tab */}
      {tab === 'students' && (
        <div>
          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <input type="text" placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left p-4 font-bold text-text/60 text-xs uppercase tracking-wider cursor-pointer hover:text-text" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">Student <SortIcon col="name" /></span>
                    </th>
                    <th className="text-center p-4 font-bold text-text/60 text-xs uppercase tracking-wider cursor-pointer hover:text-text" onClick={() => handleSort('videos')}>
                      <span className="flex items-center justify-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Videos <SortIcon col="videos" /></span>
                    </th>
                    <th className="text-center p-4 font-bold text-text/60 text-xs uppercase tracking-wider cursor-pointer hover:text-text" onClick={() => handleSort('homework')}>
                      <span className="flex items-center justify-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Homework <SortIcon col="homework" /></span>
                    </th>
                    <th className="text-center p-4 font-bold text-text/60 text-xs uppercase tracking-wider cursor-pointer hover:text-text" onClick={() => handleSort('quizzes')}>
                      <span className="flex items-center justify-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Quizzes <SortIcon col="quizzes" /></span>
                    </th>
                    <th className="text-center p-4 font-bold text-text/60 text-xs uppercase tracking-wider cursor-pointer hover:text-text" onClick={() => handleSort('score')}>
                      <span className="flex items-center justify-center gap-1"><Award className="w-3.5 h-3.5" /> Avg Score <SortIcon col="score" /></span>
                    </th>
                    <th className="text-center p-4 font-bold text-text/60 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map(student => (
                    <tr key={student.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedStudent?.id === student.id ? 'bg-primary/5' : ''}`} onClick={() => { setSelectedStudent(student); setDetailTab('overview'); }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" alt="" /> : <User className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-text truncate">{student.full_name}</div>
                            <div className="text-[10px] text-text/40 truncate">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${student.videosWatched > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'}`}>
                          {student.videosWatched}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${student.homeworkDelivered > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                          {student.homeworkDelivered}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${student.quizzesDelivered > 0 ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-400'}`}>
                          {student.quizzesDelivered}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {student.quizzesDelivered > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${student.quizAvgScore >= 70 ? 'bg-green-50 text-green-700' : student.quizAvgScore >= 50 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                            {student.quizAvgScore}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setDetailTab('overview'); }} className="text-xs text-primary hover:underline font-bold flex items-center justify-center gap-1 mx-auto">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedStudents.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-text/40">No students found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Detail Panel */}
          {selectedStudent && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedStudent.avatar_url ? <img src={selectedStudent.avatar_url} className="w-full h-full object-cover" alt="" /> : <User className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-text">{selectedStudent.full_name}</h3>
                    <p className="text-sm text-text/50">{selectedStudent.email}</p>
                    {(selectedStudent.student_whatsapp || selectedStudent.parent_whatsapp) && (
                      <div className="flex gap-4 mt-1 text-xs text-text/40">
                        {selectedStudent.student_whatsapp && <span>📱 Student: {selectedStudent.student_whatsapp}</span>}
                        {selectedStudent.parent_whatsapp && <span>👨‍👩‍👦 Parent: {selectedStudent.parent_whatsapp}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-5 flex-wrap">
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-600">{selectedStudent.videosWatched}</div>
                      <div className="text-[10px] text-text/40 uppercase font-bold">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-blue-600">{selectedStudent.homeworkDelivered}</div>
                      <div className="text-[10px] text-text/40 uppercase font-bold">Homework</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-teal-600">{selectedStudent.quizzesDelivered}</div>
                      <div className="text-[10px] text-text/40 uppercase font-bold">Quizzes</div>
                    </div>
                    {selectedStudent.quizzesDelivered > 0 && (
                      <div className="text-center">
                        <div className={`text-2xl font-black ${selectedStudent.quizAvgScore >= 70 ? 'text-green-600' : selectedStudent.quizAvgScore >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{selectedStudent.quizAvgScore}%</div>
                        <div className="text-[10px] text-text/40 uppercase font-bold">Avg Score</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
                {(['overview', 'videos', 'homework', 'quizzes'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${detailTab === t ? 'border-primary text-primary' : 'border-transparent text-text/50 hover:text-text'}`}>
                    {t === 'overview' ? 'Overview' : t === 'videos' ? `Videos (${selectedStudent.videosWatched})` : t === 'homework' ? `Homework (${selectedStudent.homeworkDelivered})` : `Quizzes (${selectedStudent.quizzesDelivered})`}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview */}
                {detailTab === 'overview' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                      <PlayCircle className="w-5 h-5 text-purple-500 mb-2" />
                      <div className="text-2xl font-black text-text">{selectedStudent.videosWatched}</div>
                      <div className="text-xs text-text/50">Total Video Opens</div>
                      <div className="text-[10px] text-text/30 mt-1">{selectedStudent.uniqueTopicsWatched} unique topics</div>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <BookOpen className="w-5 h-5 text-blue-500 mb-2" />
                      <div className="text-2xl font-black text-text">{selectedStudent.homeworkDelivered}</div>
                      <div className="text-xs text-text/50">Homework Submitted</div>
                    </div>
                    <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100">
                      <ClipboardCheck className="w-5 h-5 text-teal-500 mb-2" />
                      <div className="text-2xl font-black text-text">{selectedStudent.quizzesDelivered}</div>
                      <div className="text-xs text-text/50">Quizzes Delivered</div>
                      {selectedStudent.quizzesDelivered > 0 && <div className="text-[10px] text-text/30 mt-1">{selectedStudent.quizPassRate}% pass rate</div>}
                    </div>
                    <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                      <div className="text-2xl font-black text-text">{selectedStudent.topicsCompleted}</div>
                      <div className="text-xs text-text/50">Topics Completed</div>
                      <div className="text-[10px] text-text/30 mt-1">{selectedStudent.enrolledCourses} course{selectedStudent.enrolledCourses !== 1 ? 's' : ''} enrolled</div>
                    </div>
                  </div>
                )}

                {/* Videos Tab */}
                {detailTab === 'videos' && (
                  <div>
                    {selectedStudent.videoDetails.length === 0 ? (
                      <div className="text-center text-text/40 py-8">
                        <PlayCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>No videos watched yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                        {selectedStudent.videoDetails.map((v, i) => (
                          <div key={v.id || i} className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 hover:border-purple-200 transition-colors">
                            <PlayCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-text truncate">{v.topicTitle}</div>
                              <div className="text-xs text-text/50 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                                  Server {v.serverIndex + 1}
                                </span>
                                {v.courseTitle && (
                                  <span className="text-[11px] text-text/50 truncate">• {v.courseTitle}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] text-text/40 whitespace-nowrap flex-shrink-0">{formatDate(v.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Homework Tab */}
                {detailTab === 'homework' && (
                  <div>
                    {selectedStudent.homeworkDetails.length === 0 ? (
                      <div className="text-center text-text/40 py-8">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>No homework submitted yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                        {selectedStudent.homeworkDetails.map((hw, i) => (
                          <div key={hw.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/30 border border-blue-100/50">
                            <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text truncate">{hw.topicTitle}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${hw.status === 'reviewed' ? 'bg-green-100 text-green-700' : hw.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {hw.status === 'reviewed' ? 'Reviewed' : hw.status === 'pending' ? 'Pending' : 'Submitted'}
                                </span>
                                {hw.score != null && <span className="text-[10px] text-text/50 font-bold">Score: {hw.score}</span>}
                              </div>
                              {hw.feedback && <div className="text-[10px] text-text/40 mt-1 truncate">💬 {hw.feedback}</div>}
                            </div>
                            <span className="text-[10px] text-text/40 whitespace-nowrap flex-shrink-0">{formatDate(hw.submittedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quizzes Tab */}
                {detailTab === 'quizzes' && (
                  <div>
                    {selectedStudent.quizDetails.length === 0 ? (
                      <div className="text-center text-text/40 py-8">
                        <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>No quizzes delivered yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                        {selectedStudent.quizDetails.map((q, i) => {
                          const passed = q.pct != null && q.passingScore != null && q.pct >= q.passingScore;
                          return (
                            <div key={q.id || i} className={`flex items-center gap-3 p-3 rounded-xl border ${passed ? 'bg-green-50/30 border-green-100/50' : 'bg-red-50/30 border-red-100/50'}`}>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                                {passed ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text truncate">{q.topicTitle}</div>
                                <div className="text-[10px] text-text/40">{q.quizTitle}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {q.pct != null ? (
                                  <>
                                    <div className={`text-lg font-black ${passed ? 'text-green-600' : 'text-red-500'}`}>{q.pct}%</div>
                                    {q.totalMarks != null && <div className="text-[10px] text-text/40">{q.score}/{q.totalMarks}</div>}
                                  </>
                                ) : (
                                  <span className="text-xs text-text/40">Submitted</span>
                                )}
                              </div>
                              <span className="text-[10px] text-text/40 whitespace-nowrap flex-shrink-0">{formatDate(q.submittedAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Feed Tab */}
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
    </div>
  );
}
