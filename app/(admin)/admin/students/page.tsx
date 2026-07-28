"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Mail, 
  BookOpen, 
  Loader2, 
  User, 
  X, 
  Send, 
  Phone, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Award, 
  Copy, 
  ExternalLink,
  Save,
  MessageSquare,
  ShieldAlert,
  Wallet
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function generateWhatsAppReport(student: any): string {
  const code = student.student_code || 'N/A';
  const name = student.full_name || student.email || 'Student';
  const email = student.email || 'N/A';
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  let text = `🎓 *Michael Gad Math Academy - Student Progress Report*\n`;
  text += `-----------------------------------------------\n`;
  text += `👤 *Student:* ${name} (Code: ${code})\n`;
  text += `📧 *Email:* ${email}\n`;
  text += `📅 *Report Date:* ${dateStr}\n\n`;

  // Enrolled Courses & Progress
  text += `📚 *Enrolled Courses & Progress:*\n`;
  if (student.enrollments && student.enrollments.length > 0) {
    student.enrollments.forEach((e: any) => {
      const course = e.courses;
      if (course) {
        let totalTopicsInCourse = 0;
        course.sections?.forEach((sec: any) => {
          totalTopicsInCourse += sec.topics?.length || 0;
        });

        const completedTopics = student.topic_progress?.filter((tp: any) => {
          if (!tp.is_completed) return false;
          return course.sections?.some((sec: any) => 
            sec.topics?.some((top: any) => top.id === tp.topic_id)
          );
        })?.length || 0;

        const pct = totalTopicsInCourse > 0 ? Math.round((completedTopics / totalTopicsInCourse) * 100) : 0;
        text += `• *${course.title}*: ${pct}% completed (${completedTopics}/${totalTopicsInCourse} lessons)\n`;
      }
    });
  } else {
    text += `• No active courses enrolled.\n`;
  }
  text += `\n`;

  // Completed Lessons Summary
  const totalCompleted = student.topic_progress?.filter((tp: any) => tp.is_completed)?.length || 0;
  let totalSecs = 0;
  student.topic_progress?.forEach((tp: any) => totalSecs += (tp.time_spent_seconds || 0));

  text += `✅ *Total Lessons Completed:* ${totalCompleted} lessons\n`;
  text += `⏱️ *Total Study Time:* ${formatTime(totalSecs)}\n\n`;

  // Worksheets & Submissions
  text += `📝 *Worksheet Submissions:*\n`;
  const submissions = student.manual_submissions || [];
  if (submissions.length > 0) {
    submissions.slice(0, 5).forEach((sub: any) => {
      const topicTitle = sub.topics?.title || 'Worksheet Assignment';
      const statusStr = sub.status === 'reviewed' ? `Reviewed (Score: ${sub.score || 'N/A'})` : 'Pending Review';
      const feedbackStr = sub.feedback ? ` - Feedback: "${sub.feedback}"` : '';
      text += `• *${topicTitle}*: ${statusStr}${feedbackStr}\n`;
    });
  } else {
    text += `• No worksheet submissions yet.\n`;
  }
  text += `\n`;

  // Quiz Scores
  text += `📊 *Quiz Performance:*\n`;
  const quizzes = student.quiz_submissions || [];
  if (quizzes.length > 0) {
    quizzes.slice(0, 5).forEach((qs: any) => {
      const qTitle = qs.quizzes?.title || qs.quizzes?.topics?.title || 'Quiz';
      const statusIcon = qs.passed ? '✅ Passed' : '❌ Failed';
      text += `• *${qTitle}*: ${qs.score ?? 'N/A'}/${qs.quizzes?.total_marks || 100} (${statusIcon})\n`;
    });
  } else {
    text += `• No quiz attempts yet.\n`;
  }

  text += `\n-----------------------------------------------\n`;
  text += `Thank you! For questions, reply to this message. 🚀`;

  return text;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "lessons" | "worksheets" | "quizzes">("courses");

  // Editable WhatsApp Phone state
  const [studentPhoneInput, setStudentPhoneInput] = useState("");
  const [parentPhoneInput, setParentPhoneInput] = useState("");
  const [isSavingPhones, setIsSavingPhones] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          student_code,
          student_whatsapp,
          parent_email,
          parent_whatsapp,
          wallet_balance,
          created_at,
          enrollments (
            id,
            created_at,
            course_id,
            courses (id, title)
          )
        `)
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching students:", error);
      } else {
        setStudents(data || []);
      }
    } catch (e) {
      console.error("Failed to load students:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setStudentPhoneInput(student.student_whatsapp || "");
    setParentPhoneInput(student.parent_whatsapp || "");
    setActiveTab("courses");
    setCopiedReport(false);
    setIsLoadingDetails(true);

    try {
      // 1. Fetch topic progress
      const { data: tpData } = await supabase
        .from("topic_progress")
        .select("*, topics(id, title)")
        .eq("student_id", student.id);

      // 2. Fetch manual submissions
      const { data: msData } = await supabase
        .from("manual_submissions")
        .select("*, topics(id, title)")
        .eq("student_id", student.id);

      // 3. Fetch quiz submissions
      const { data: qsData } = await supabase
        .from("quiz_submissions")
        .select("*, quizzes(id, title, total_marks, passing_score, topic_id, topics(id, title))")
        .eq("student_id", student.id);

      // 4. Fetch detailed course sections/topics
      const courseIds = student.enrollments?.map((e: any) => e.courses?.id || e.course_id).filter(Boolean) || [];
      let detailedEnrollments = student.enrollments || [];
      if (courseIds.length > 0) {
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, title, total_price, sections(id, title, topics(id, title))")
          .in("id", courseIds);

        if (coursesData) {
          detailedEnrollments = student.enrollments.map((enr: any) => {
            const matchedCourse = coursesData.find((c: any) => c.id === (enr.courses?.id || enr.course_id));
            return {
              ...enr,
              courses: matchedCourse || enr.courses
            };
          });
        }
      }

      const fullStudentData = {
        ...student,
        enrollments: detailedEnrollments,
        topic_progress: tpData || [],
        manual_submissions: msData || [],
        quiz_submissions: qsData || []
      };

      setSelectedStudent(fullStudentData);
    } catch (err) {
      console.error("Error loading student detail:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSavePhoneNumbers = async () => {
    if (!selectedStudent) return;
    setIsSavingPhones(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          student_whatsapp: studentPhoneInput,
          parent_whatsapp: parentPhoneInput
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;

      // Update local state
      const updatedStudent = {
        ...selectedStudent,
        student_whatsapp: studentPhoneInput,
        parent_whatsapp: parentPhoneInput
      };
      setSelectedStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      alert("WhatsApp phone numbers saved successfully!");
    } catch (err: any) {
      alert("Failed to save phone numbers: " + err.message);
    } finally {
      setIsSavingPhones(false);
    }
  };

  const handleSendWhatsApp = (targetPhone: string, type: 'student' | 'parent') => {
    if (!selectedStudent) return;
    if (!targetPhone || targetPhone.trim().length === 0) {
      alert(`Please enter a valid ${type === 'student' ? 'Student' : 'Parent'} WhatsApp phone number first.`);
      return;
    }
    const reportText = generateWhatsAppReport(selectedStudent);
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  const handleCopyReport = () => {
    if (!selectedStudent) return;
    const reportText = generateWhatsAppReport(selectedStudent);
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  const filtered = students.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Student Directory & Analytics</h1>
          <p className="text-text/60 text-sm">
            {students.length} registered student{students.length !== 1 ? "s" : ""}. Click any student to view full records & WhatsApp reports.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-text/60 font-medium">
              {searchQuery ? "No students match your search query." : "No registered students yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((student) => {
              const courseCount = student.enrollments?.length || 0;
              const courseNames = student.enrollments
                ?.map((e: any) => e.courses?.title)
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-primary/20">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-text group-hover:text-primary transition-colors">
                          {student.full_name || "Unnamed Student"}
                        </h3>
                        {student.student_code && (
                          <span className="text-[10px] font-black bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                            {student.student_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text/50 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {student.email}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-emerald-600 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          ${(student.wallet_balance || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <div className="text-text font-bold flex items-center gap-1 justify-end">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          {courseCount} Course{courseCount !== 1 ? "s" : ""}
                        </div>
                        {courseNames && (
                          <p className="text-[11px] text-text/40 mt-0.5 max-w-44 truncate">{courseNames}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStudent(student);
                      }}
                      className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      Full Profile & Report →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Detailed Modal / Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end overflow-hidden p-0 sm:p-4">
          <div className="bg-white w-full max-w-4xl h-full sm:h-[94vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-white/70" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{selectedStudent.full_name || "Unnamed Student"}</h2>
                    {selectedStudent.student_code && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        {selectedStudent.student_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/60 flex items-center gap-3 mt-1">
                    <span>{selectedStudent.email}</span>
                    <span>•</span>
                    <span>Wallet: ${(selectedStudent.wallet_balance || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* WhatsApp Quick Actions & Phone Management */}
            <div className="p-4 bg-emerald-900/10 border-b border-emerald-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Student WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 201012345678"
                    value={studentPhoneInput}
                    onChange={(e) => setStudentPhoneInput(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Parent WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 201098765432"
                    value={parentPhoneInput}
                    onChange={(e) => setParentPhoneInput(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleSavePhoneNumbers}
                  disabled={isSavingPhones}
                  className="self-end px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  title="Save phone numbers"
                >
                  {isSavingPhones ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSendWhatsApp(studentPhoneInput, 'student')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp Student
                </button>

                <button
                  onClick={() => handleSendWhatsApp(parentPhoneInput, 'parent')}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp Parent
                </button>

                <button
                  onClick={handleCopyReport}
                  className="px-3 py-2 bg-white hover:bg-gray-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  title="Copy full report text to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedReport ? "Copied!" : "Copy Report"}
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 gap-2 flex-shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab("courses")}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "courses"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-text"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Enrolled Courses ({selectedStudent.enrollments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("lessons")}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "lessons"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-text"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completed Lessons ({selectedStudent.topic_progress?.filter((tp: any) => tp.is_completed)?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("worksheets")}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "worksheets"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-text"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Worksheets ({selectedStudent.manual_submissions?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("quizzes")}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "quizzes"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-text"
                }`}
              >
                <Award className="w-4 h-4 text-purple-500" />
                Quizzes ({selectedStudent.quiz_submissions?.length || 0})
              </button>
            </div>

            {/* Modal Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingDetails ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-text/60 font-medium">Loading detailed student history & records...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: Enrolled Courses */}
                  {activeTab === "courses" && (
                    <div className="space-y-4">
                      {(!selectedStudent.enrollments || selectedStudent.enrollments.length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-text/60 font-medium">Student is not enrolled in any courses yet.</p>
                        </div>
                      ) : (
                        selectedStudent.enrollments.map((enr: any) => {
                          const course = enr.courses;
                          if (!course) return null;

                          let totalTopics = 0;
                          course.sections?.forEach((s: any) => totalTopics += s.topics?.length || 0);

                          const completedTopics = selectedStudent.topic_progress?.filter((tp: any) => {
                            if (!tp.is_completed) return false;
                            return course.sections?.some((sec: any) => 
                              sec.topics?.some((top: any) => top.id === tp.topic_id)
                            );
                          })?.length || 0;

                          const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                          return (
                            <div key={enr.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                              <div className="flex items-center justify-between gap-4 mb-3">
                                <h4 className="font-bold text-text text-base">{course.title}</h4>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                  {pct}% Completed
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-3">
                                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>

                              <div className="flex items-center justify-between text-xs text-text/60">
                                <span>{completedTopics} of {totalTopics} lessons completed</span>
                                <span>Enrolled: {new Date(enr.created_at || selectedStudent.created_at).toLocaleDateString("en-GB")}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: Completed Lessons */}
                  {activeTab === "lessons" && (
                    <div className="space-y-3">
                      {(!selectedStudent.topic_progress || selectedStudent.topic_progress.filter((tp: any) => tp.is_completed).length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-text/60 font-medium">No completed lessons logged yet.</p>
                        </div>
                      ) : (
                        selectedStudent.topic_progress
                          .filter((tp: any) => tp.is_completed)
                          .map((tp: any) => (
                            <div key={tp.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-text text-sm">{tp.topics?.title || "Topic Lesson"}</h5>
                                  <p className="text-xs text-text/50">Last accessed: {new Date(tp.last_accessed_at).toLocaleDateString("en-GB")}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold bg-gray-100 text-text/70 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {formatTime(tp.time_spent_seconds)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: Worksheets & Submissions */}
                  {activeTab === "worksheets" && (
                    <div className="space-y-4">
                      {(!selectedStudent.manual_submissions || selectedStudent.manual_submissions.length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-text/60 font-medium">No worksheet submissions submitted yet.</p>
                        </div>
                      ) : (
                        selectedStudent.manual_submissions.map((sub: any) => (
                          <div key={sub.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <h5 className="font-bold text-text text-sm">{sub.topics?.title || "Worksheet Submission"}</h5>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                sub.status === "reviewed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}>
                                {sub.status === "reviewed" ? "Reviewed" : "Pending Review"}
                              </span>
                            </div>

                            {sub.status === "reviewed" && (
                              <div className="bg-green-50/60 border border-green-100 p-3 rounded-xl text-xs space-y-1">
                                <div className="font-bold text-green-900">Score: {sub.score || "N/A"}</div>
                                {sub.feedback && <div className="text-green-800 italic">&quot;{sub.feedback}&quot;</div>}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                              <span className="text-text/50">Submitted: {new Date(sub.submitted_at).toLocaleDateString("en-GB")}</span>
                              <div className="flex items-center gap-3">
                                {sub.file_url && (
                                  <a
                                    href={sub.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                                  >
                                    View Student File <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {sub.reviewed_file_url && (
                                  <a
                                    href={sub.reviewed_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                                  >
                                    View Admin Feedback File <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: Quizzes */}
                  {activeTab === "quizzes" && (
                    <div className="space-y-3">
                      {(!selectedStudent.quiz_submissions || selectedStudent.quiz_submissions.length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-text/60 font-medium">No quiz attempts logged yet.</p>
                        </div>
                      ) : (
                        selectedStudent.quiz_submissions.map((qs: any) => (
                          <div key={qs.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between gap-4">
                            <div>
                              <h5 className="font-bold text-text text-sm">
                                {qs.quizzes?.title || qs.quizzes?.topics?.title || "Quiz Evaluation"}
                              </h5>
                              <p className="text-xs text-text/50">Date: {new Date(qs.submitted_at).toLocaleDateString("en-GB")}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-text">
                                {qs.score ?? "N/A"} / {qs.quizzes?.total_marks || 100}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                qs.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}>
                                {qs.passed ? "Passed" : "Failed"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
