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
  Wallet,
  Sparkles,
  Ban,
  Zap,
  Plus,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DownloadReportButton } from "@/components/reports/DownloadReportButton";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { calculateCourseProgress } from "@/lib/progress";

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

  let text = `🎓 *Michael Gad Math Academy*\n`;
  text += `📋 *Comprehensive Student Progress Report*\n`;
  text += `═══════════════════════════════════\n\n`;

  // Student Info
  text += `👤 *Student Information:*\n`;
  text += `• *Name:* ${name}\n`;
  text += `• *Code:* ${code}\n`;
  text += `• *Email:* ${email}\n`;
  if (student.student_whatsapp) text += `• *Student Phone:* ${student.student_whatsapp}\n`;
  if (student.parent_whatsapp) text += `• *Parent Phone:* ${student.parent_whatsapp}\n`;
  text += `• *Wallet Balance:* $${(student.wallet_balance || 0).toFixed(2)}\n`;
  text += `• *Report Date:* ${dateStr}\n\n`;

  // Overall Summary Stats
  const totalCompleted = student.topic_progress?.filter((tp: any) => tp.is_completed)?.length || 0;
  let totalSecs = 0;
  student.topic_progress?.forEach((tp: any) => totalSecs += (tp.time_spent_seconds || 0));
  const enrollmentCount = student.enrollments?.length || 0;
  const worksheetCount = student.manual_submissions?.length || 0;
  const quizCount = student.quiz_submissions?.length || 0;

  text += `📊 *Overall Summary:*\n`;
  text += `───────────────────────────\n`;
  text += `📚 Enrolled Courses: ${enrollmentCount}\n`;
  text += `✅ Lessons Completed: ${totalCompleted}\n`;
  text += `⏱️ Total Study Time: ${formatTime(totalSecs)}\n`;
  text += `📝 Worksheets Submitted: ${worksheetCount}\n`;
  text += `🧠 Quizzes Attempted: ${quizCount}\n\n`;

  // Enrolled Courses & Progress (with section-level details)
  text += `📚 *Enrolled Courses & Progress:*\n`;
  text += `───────────────────────────\n`;
  if (student.enrollments && student.enrollments.length > 0) {
    student.enrollments.forEach((e: any, idx: number) => {
      const course = e.courses;
      if (course) {
        const courseTopics = course.sections?.flatMap((sec: any) => sec.topics || []) || [];
        const completedIds = (student.topic_progress || [])
          .filter((tp: any) => tp.is_completed)
          .map((tp: any) => tp.topic_id);
        const { progressPercentage, completedCount, totalCount } = calculateCourseProgress(courseTopics, completedIds);
        
        const enrollDate = e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString("en-GB") : 'N/A';
        const progressBar = generateProgressBar(progressPercentage);
        
        text += `\n${idx + 1}. *${course.title}*\n`;
        text += `   ${progressBar} ${progressPercentage}%\n`;
        text += `   📖 ${completedCount}/${totalCount} lessons completed\n`;
        text += `   📅 Enrolled: ${enrollDate}\n`;
        
        // Show section breakdown
        if (course.sections && course.sections.length > 0) {
          course.sections.forEach((sec: any) => {
            const secTopics = sec.topics || [];
            const secCompleted = secTopics.filter((t: any) => completedIds.includes(t.id)).length;
            const secIcon = secCompleted === secTopics.length && secTopics.length > 0 ? '✅' : secCompleted > 0 ? '🔄' : '⬜';
            text += `   ${secIcon} ${sec.title}: ${secCompleted}/${secTopics.length} lessons\n`;
          });
        }
      }
    });
  } else {
    text += `• No active courses enrolled.\n`;
  }
  text += `\n`;

  // Completed Lessons Detail
  text += `✅ *Completed Lessons History:*\n`;
  text += `───────────────────────────\n`;
  const completedLessons = (student.topic_progress || []).filter((tp: any) => tp.is_completed);
  if (completedLessons.length > 0) {
    completedLessons.forEach((tp: any, idx: number) => {
      const topicTitle = tp.topics?.title || 'Lesson';
      const lastDate = tp.last_accessed_at ? new Date(tp.last_accessed_at).toLocaleDateString("en-GB") : 'N/A';
      const timeSpent = formatTime(tp.time_spent_seconds);
      text += `${idx + 1}. ✅ ${topicTitle}\n`;
      text += `   ⏱️ Study time: ${timeSpent} • 📅 Last accessed: ${lastDate}\n`;
    });
  } else {
    text += `• No completed lessons logged yet.\n`;
  }
  text += `\n`;

  // Worksheets & Submissions
  text += `📝 *Worksheet Submissions & Feedback:*\n`;
  text += `───────────────────────────\n`;
  const submissions = student.manual_submissions || [];
  if (submissions.length > 0) {
    submissions.forEach((sub: any, idx: number) => {
      const topicTitle = sub.topics?.title || 'Worksheet Assignment';
      const submitDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("en-GB") : 'N/A';
      
      if (sub.status === 'reviewed') {
        text += `${idx + 1}. ✅ *${topicTitle}*\n`;
        text += `   📊 Score: *${sub.score || 'N/A'}*\n`;
        if (sub.feedback) {
          text += `   💬 Feedback: "${sub.feedback}"\n`;
        }
        text += `   📅 Submitted: ${submitDate}\n`;
      } else {
        text += `${idx + 1}. ⏳ *${topicTitle}*\n`;
        text += `   Status: Pending Review\n`;
        text += `   📅 Submitted: ${submitDate}\n`;
      }
    });
  } else {
    text += `• No worksheet submissions yet.\n`;
  }
  text += `\n`;

  // Quiz Performance
  text += `🧠 *Quiz Performance & Results:*\n`;
  text += `───────────────────────────\n`;
  const quizzes = student.quiz_submissions || [];
  if (quizzes.length > 0) {
    let totalScore = 0;
    let totalMaxScore = 0;
    let passCount = 0;

    quizzes.forEach((qs: any, idx: number) => {
      const qTitle = qs.quizzes?.title || qs.quizzes?.topics?.title || 'Quiz';
      const totalMarks = qs.quizzes?.total_marks || 100;
      const passingScore = qs.quizzes?.passing_score;
      const scorePct = totalMarks > 0 ? Math.round(((qs.score ?? 0) / totalMarks) * 100) : 0;
      const passed = passingScore != null ? (qs.score ?? 0) >= passingScore : scorePct >= 50;
      const statusIcon = passed ? '✅ Passed' : '❌ Failed';
      const quizDate = qs.submitted_at ? new Date(qs.submitted_at).toLocaleDateString("en-GB") : 'N/A';
      
      text += `${idx + 1}. *${qTitle}*\n`;
      text += `   📊 Score: *${qs.score ?? 'N/A'}/${totalMarks}* (${scorePct}%) — ${statusIcon}\n`;
      if (passingScore != null) {
        text += `   🎯 Passing score: ${passingScore}/${totalMarks}\n`;
      }
      text += `   📅 Date: ${quizDate}\n`;

      totalScore += (qs.score ?? 0);
      totalMaxScore += totalMarks;
      if (passed) passCount++;
    });

    // Quiz Summary
    const avgPct = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    text += `\n📈 *Quiz Summary:*\n`;
    text += `   • Average Score: ${avgPct}%\n`;
    text += `   • Pass Rate: ${passCount}/${quizzes.length} quizzes (${Math.round((passCount / quizzes.length) * 100)}%)\n`;
  } else {
    text += `• No quiz attempts yet.\n`;
  }

  text += `\n═══════════════════════════════════\n`;
  text += `📌 _This is an automated report generated by Michael Gad Math Academy LMS._\n`;
  text += `💬 For questions, reply to this message.\n`;
  text += `🌐 gadmaths.com 🚀`;

  return text;
}

function generateProgressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "lessons" | "worksheets" | "quizzes" | "ai">("courses");

  // Editable WhatsApp Phone state
  const [studentPhoneInput, setStudentPhoneInput] = useState("");
  const [parentPhoneInput, setParentPhoneInput] = useState("");
  const [isSavingPhones, setIsSavingPhones] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Student AI permission and daily limit controls
  const [aiDailyLimitInput, setAiDailyLimitInput] = useState<string>("");
  const [isTogglingAi, setIsTogglingAi] = useState(false);

  // Academy course enrollment controls
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState<string>("");
  const [isEnrollingAll, setIsEnrollingAll] = useState(false);
  const [isEnrollingSingle, setIsEnrollingSingle] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleEnrollAllFirstCourse = async () => {
    if (!window.confirm("Enroll all registered students into the 1st academy course now?")) return;
    setIsEnrollingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/enroll-students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "enroll_all_first_course" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message || "All students enrolled in the 1st course successfully!");
      await fetchStudents();
      if (selectedStudent) {
        await handleSelectStudent(selectedStudent);
      }
    } catch (err: any) {
      alert("Failed to auto-enroll students: " + err.message);
    } finally {
      setIsEnrollingAll(false);
    }
  };

  const handleEnrollSingle = async (courseId: string) => {
    if (!selectedStudent || !courseId) return;
    setIsEnrollingSingle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/enroll-students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: "enroll_single",
          studentId: selectedStudent.id,
          courseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Student enrolled successfully!");
      await handleSelectStudent(selectedStudent);
      await fetchStudents();
    } catch (err: any) {
      alert("Failed to enroll student: " + err.message);
    } finally {
      setIsEnrollingSingle(false);
    }
  };

  const handleUnenrollSingle = async (courseId: string) => {
    if (!selectedStudent || !courseId) return;
    if (!window.confirm("Are you sure you want to unenroll this student from this course?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/enroll-students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: "unenroll_single",
          studentId: selectedStudent.id,
          courseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Student unenrolled successfully.");
      await handleSelectStudent(selectedStudent);
      await fetchStudents();
    } catch (err: any) {
      alert("Failed to unenroll student: " + err.message);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch profiles directly
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setIsLoading(false);
        return;
      }

      // Filter out admin accounts
      const studentProfiles = (profilesData || []).filter(
        (p: any) => p.role !== "admin" && p.email !== "mokai2008@gmail.com"
      );

      // Fetch all academy courses for enrollment controls
      let loadedCourses: any[] = [];
      try {
        const { data: allCoursesData } = await supabase
          .from("courses")
          .select("id, title")
          .order("created_at", { ascending: true });
        if (allCoursesData && allCoursesData.length > 0) {
          loadedCourses = allCoursesData;
          setAllCourses(allCoursesData);
          setSelectedCourseToEnroll(prev => prev || allCoursesData[0].id);
        }
      } catch (cErr) {
        console.warn("Could not fetch academy courses list:", cErr);
      }

      // 2. Fetch enrollments for all students with robust fallback
      let enrollmentsData: any[] = [];
      try {
        const { data: rawEnrs, error: enrErr } = await supabase
          .from("enrollments")
          .select("id, enrolled_at, student_id, course_id");

        if (!enrErr && rawEnrs && rawEnrs.length > 0) {
          const cIds = Array.from(new Set(rawEnrs.map((e: any) => e.course_id).filter(Boolean)));
          let coursesMap = new Map();
          if (cIds.length > 0) {
            const { data: cList } = await supabase
              .from("courses")
              .select("id, title")
              .in("id", cIds);
            coursesMap = new Map((cList || []).map((c: any) => [c.id, c]));
          }
          enrollmentsData = rawEnrs.map((e: any) => ({
            ...e,
            courses: coursesMap.get(e.course_id) || { id: e.course_id, title: "Course" }
          }));
        }
      } catch (err) {
        console.error("Error fetching enrollments:", err);
      }

      // Also check section_purchases to count courses students have partial/full section access to
      try {
        const { data: spList } = await supabase
          .from("section_purchases")
          .select("student_id, section_id, sections(course_id, courses(id, title))");

        if (spList && spList.length > 0) {
          spList.forEach((sp: any) => {
            const cId = sp.sections?.course_id;
            const cTitle = sp.sections?.courses?.title || "Enrolled Course";
            if (cId && !enrollmentsData.some((e: any) => e.student_id === sp.student_id && e.course_id === cId)) {
              enrollmentsData.push({
                id: `sp_${sp.section_id}`,
                student_id: sp.student_id,
                course_id: cId,
                courses: { id: cId, title: cTitle }
              });
            }
          });
        }
      } catch (spErr) {
        console.error("Error fetching section purchases:", spErr);
      }

      // 3. Fetch chat logs to count AI usage
      const { data: chatsData } = await supabase
        .from("chat_logs")
        .select("student_id, messages, total_messages, total_tokens");

      const defaultCourse = loadedCourses.length > 0 ? loadedCourses[0] : null;

      // Merge enrollments and AI stats into student profiles
      const merged = studentProfiles.map((student: any) => {
        let studentEnrs = (enrollmentsData || []).filter(
          (e: any) => e.student_id === student.id
        );

        // Every student is supposed to be enrolled in the 1st course
        if (studentEnrs.length === 0 && defaultCourse) {
          studentEnrs = [{
            id: `enr_default_${defaultCourse.id}`,
            student_id: student.id,
            course_id: defaultCourse.id,
            enrolled_at: student.created_at,
            courses: defaultCourse
          }];
        }

        const studentChats = (chatsData || []).filter(
          (c: any) => c.student_id === student.id
        );
        const totalAiMsgs = studentChats.reduce((acc: number, c: any) => {
          return acc + (c.total_messages || c.messages?.length || 0);
        }, 0);

        return {
          ...student,
          enrollments: studentEnrs,
          ai_message_count: totalAiMsgs,
        };
      });

      setStudents(merged);
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
    setAiDailyLimitInput(
      student.ai_daily_limit !== null && student.ai_daily_limit !== undefined 
        ? String(student.ai_daily_limit) 
        : ""
    );
    setActiveTab("courses");
    setCopiedReport(false);
    setIsLoadingDetails(true);

    try {
      // 1. Fetch topic progress
      const { data: rawTp } = await supabase
        .from("topic_progress")
        .select("*")
        .eq("student_id", student.id);
      const tpData = rawTp || [];

      // 2. Fetch manual submissions (worksheets and PDF quizzes)
      const { data: rawMs } = await supabase
        .from("manual_submissions")
        .select("*")
        .eq("student_id", student.id)
        .order("submitted_at", { ascending: false });
      const allManualSubs = rawMs || [];

      // 3. Fetch interactive quiz submissions
      let interactiveQuizSubs: any[] = [];
      const { data: rawQs } = await supabase
        .from("quiz_submissions")
        .select("*, quizzes(id, total_marks, passing_score, topic_id)")
        .eq("student_id", student.id)
        .order("submitted_at", { ascending: false });
      interactiveQuizSubs = rawQs || [];

      // Collect all topic IDs across progress, submissions, and quizzes
      const allTopicIds = Array.from(new Set([
        ...tpData.map((tp: any) => tp.topic_id),
        ...allManualSubs.map((ms: any) => ms.topic_id),
        ...interactiveQuizSubs.map((qs: any) => qs.topic_id || qs.quizzes?.topic_id),
      ].filter(Boolean)));

      // Map topics directly to get real title, section_id, and course_id
      const topicsMap = new Map<string, any>();
      const detectedCourseIds = new Set<string>();

      if (allTopicIds.length > 0) {
        const { data: tList } = await supabase
          .from("topics")
          .select("id, title, section_id, sections(id, course_id)")
          .in("id", allTopicIds);
        (tList || []).forEach((t: any) => {
          topicsMap.set(t.id, t);
          const cId = t.sections?.course_id;
          if (cId) detectedCourseIds.add(cId);
        });
      }

      // Attach topic info to topic_progress
      const enrichedTp = tpData.map((tp: any) => ({
        ...tp,
        topics: topicsMap.get(tp.topic_id) || null
      }));

      // Attach topic info to manual_submissions
      const enrichedManualSubs = allManualSubs.map((ms: any) => ({
        ...ms,
        topics: topicsMap.get(ms.topic_id) || null
      }));

      // Attach topic info to interactive quiz submissions
      const enrichedInteractiveQuizzes = interactiveQuizSubs.map((qs: any) => {
        const topId = qs.quizzes?.topic_id || qs.topic_id;
        const topicObj = topId ? topicsMap.get(topId) : null;
        return {
          ...qs,
          quizzes: qs.quizzes ? {
            ...qs.quizzes,
            title: qs.quizzes.title || topicObj?.title || "Quiz Evaluation",
            topics: topicObj || qs.quizzes.topics || null
          } : {
            id: qs.quiz_id || qs.id,
            title: topicObj?.title || "Quiz Evaluation",
            total_marks: 100,
            passing_score: 50,
            topics: topicObj || null
          }
        };
      });

      // Separate worksheets vs PDF quizzes
      const worksheetsData = enrichedManualSubs.filter((s: any) => s.type !== "pdf_quiz");
      const pdfQuizzesData = enrichedManualSubs.filter((s: any) => s.type === "pdf_quiz");

      // Format PDF quizzes into quiz submissions format
      const formattedPdfQuizzes = pdfQuizzesData.map((pq: any) => ({
        id: pq.id,
        student_id: pq.student_id,
        quiz_id: pq.id,
        score: pq.score !== null && pq.score !== undefined ? Number(pq.score) : null,
        submitted_at: pq.submitted_at,
        is_pdf_quiz: true,
        file_url: pq.file_url,
        feedback: pq.feedback_text || pq.feedback,
        feedback_file_url: pq.feedback_file_url || pq.reviewed_file_url,
        status: pq.status,
        quizzes: {
          id: pq.id,
          title: pq.topics?.title ? `${pq.topics.title} (PDF Quiz)` : "PDF Quiz",
          total_marks: 100,
          passing_score: 50,
          topics: pq.topics || null
        }
      }));

      // Unified quiz submissions list (both interactive & PDF quizzes)
      const unifiedQuizzes = [...enrichedInteractiveQuizzes, ...formattedPdfQuizzes].sort(
        (a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );

      // 4. Robust course resolution: ensure student's courses are always found
      // Source A: Direct enrollments table in Supabase
      const { data: directEnrs } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, course_id")
        .eq("student_id", student.id);

      (directEnrs || []).forEach((e: any) => {
        if (e.course_id) detectedCourseIds.add(e.course_id);
      });

      // Source B: Already attached enrollments on student object
      (student.enrollments || []).forEach((e: any) => {
        const cId = e.course_id || e.courses?.id;
        if (cId) detectedCourseIds.add(cId);
      });

      // Source C: Section purchases
      const { data: spUser } = await supabase
        .from("section_purchases")
        .select("id, purchased_at, section_id, sections(course_id)")
        .eq("student_id", student.id);

      (spUser || []).forEach((sp: any) => {
        const cId = sp.sections?.course_id;
        if (cId) detectedCourseIds.add(cId);
      });

      // GUARANTEE: If no course was detected, ALWAYS default to the 1st academy course!
      if (detectedCourseIds.size === 0) {
        if (allCourses.length > 0) {
          detectedCourseIds.add(allCourses[0].id);
        } else {
          const { data: fCourse } = await supabase
            .from("courses")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fCourse) detectedCourseIds.add(fCourse.id);
        }
      }

      const allCourseIds = Array.from(detectedCourseIds);
      let detailedEnrollments: any[] = [];

      if (allCourseIds.length > 0) {
        let { data: coursesData, error: cErr } = await supabase
          .from("courses")
          .select("id, title, total_price, sections(id, title, topics(id, title, progress_percentage, content_items))")
          .in("id", allCourseIds);

        if (cErr) {
          const fallback = await supabase
            .from("courses")
            .select("id, title, total_price, sections(id, title, topics(id, title, content_items))")
            .in("id", allCourseIds);
          coursesData = fallback.data;
        }

        if (coursesData && coursesData.length > 0) {
          detailedEnrollments = coursesData.map((course: any) => {
            const matchingEnr = (directEnrs || []).find((e: any) => e.course_id === course.id);
            return {
              id: matchingEnr?.id || `enr_${course.id}`,
              course_id: course.id,
              enrolled_at: matchingEnr?.enrolled_at || student.created_at,
              courses: course
            };
          });
        }
      }

      // If still empty for any reason, synthesize 1st course entry
      if (detailedEnrollments.length === 0 && allCourses.length > 0) {
        detailedEnrollments = [{
          id: `enr_${allCourses[0].id}`,
          course_id: allCourses[0].id,
          enrolled_at: student.created_at,
          courses: allCourses[0]
        }];
      }

      // 5. Fetch student AI chat logs
      const { data: chatData } = await supabase
        .from("chat_logs")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      const fullStudentData = {
        ...student,
        enrollments: detailedEnrollments,
        topic_progress: enrichedTp,
        manual_submissions: worksheetsData,
        all_manual_submissions: enrichedManualSubs,
        quiz_submissions: unifiedQuizzes,
        chat_logs: chatData || [],
      };

      setSelectedStudent(fullStudentData);

      // Silently persist enrollment into DB in background if not already recorded
      const firstTargetCourse = allCourseIds[0];
      if (firstTargetCourse && (!directEnrs || directEnrs.length === 0)) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch("/api/admin/enroll-students", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: "enroll_single",
                studentId: student.id,
                courseId: firstTargetCourse,
              }),
            }).catch(() => {});
          }
        });
      }

      // Also update outer students list state so counts reflect live data immediately
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          return {
            ...s,
            enrollments: detailedEnrollments,
          };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error loading student detail:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Toggle student AI access (Stop / Enable)
  const handleToggleStudentAi = async (nextStatus: boolean) => {
    if (!selectedStudent) return;
    const confirmPrompt = nextStatus
      ? `Re-enable AI Assistant access for ${selectedStudent.full_name || selectedStudent.email}?`
      : `Stop AI Assistant access for ${selectedStudent.full_name || selectedStudent.email}?\n\nThe student will be immediately prevented from using the AI chatbot.`;

    if (!window.confirm(confirmPrompt)) return;

    setIsTogglingAi(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/toggle-student-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          aiEnabled: nextStatus,
          dailyLimit: aiDailyLimitInput.trim() ? parseInt(aiDailyLimitInput, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated = {
        ...selectedStudent,
        ai_enabled: nextStatus,
      };
      setSelectedStudent(updated);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, ai_enabled: nextStatus } : s));
      alert(data.message || `Student AI access ${nextStatus ? "enabled" : "stopped"} successfully.`);
    } catch (err: any) {
      alert("Failed to update AI access: " + err.message);
    } finally {
      setIsTogglingAi(false);
    }
  };

  // Save student AI daily limit
  const handleSaveAiLimit = async () => {
    if (!selectedStudent) return;
    setIsTogglingAi(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const limitVal = aiDailyLimitInput.trim() ? parseInt(aiDailyLimitInput, 10) : null;
      const res = await fetch("/api/admin/toggle-student-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          aiEnabled: selectedStudent.ai_enabled !== false,
          dailyLimit: limitVal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated = {
        ...selectedStudent,
        ai_daily_limit: limitVal,
      };
      setSelectedStudent(updated);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, ai_daily_limit: limitVal } : s));
      alert("AI daily question limit updated successfully!");
    } catch (err: any) {
      alert("Failed to save AI limit: " + err.message);
    } finally {
      setIsTogglingAi(false);
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnrollAllFirstCourse}
            disabled={isEnrollingAll}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            title="Auto-enroll all registered students into the 1st academy course"
          >
            {isEnrollingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Auto-Enroll All in 1st Course
          </button>
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
                        {student.ai_enabled === false ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                            <Ban className="w-3 h-3 text-red-600" />
                            AI Paused
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            AI Active{student.ai_message_count ? ` (${student.ai_message_count} msgs)` : ''}
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

                <DownloadReportButton
                  student={selectedStudent}
                  variant="secondary"
                  label={isLoadingDetails ? "Loading..." : "Download PDF"}
                  disabled={isLoadingDetails}
                />

                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  disabled={isLoadingDetails}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Customize PDF template & preview"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  PDF Template
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
              <button
                onClick={() => setActiveTab("ai")}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === "ai"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-text"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI Assistant ({selectedStudent.chat_logs?.length || 0})
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
                      {/* Course Enrollment Quick Action */}
                      {allCourses.length > 0 && (
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-primary block mb-1">
                              Enroll Student in Course:
                            </label>
                            <select
                              value={selectedCourseToEnroll}
                              onChange={(e) => setSelectedCourseToEnroll(e.target.value)}
                              className="w-full text-xs font-medium bg-white border border-gray-200 rounded-xl px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary"
                            >
                              {allCourses.map((c) => {
                                const isEnrolled = selectedStudent.enrollments?.some(
                                  (e: any) => e.course_id === c.id || e.courses?.id === c.id
                                );
                                return (
                                  <option key={c.id} value={c.id}>
                                    {c.title} {isEnrolled ? "(Already Enrolled)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <button
                            onClick={() => handleEnrollSingle(selectedCourseToEnroll)}
                            disabled={
                              isEnrollingSingle ||
                              !selectedCourseToEnroll ||
                              selectedStudent.enrollments?.some(
                                (e: any) => e.course_id === selectedCourseToEnroll || e.courses?.id === selectedCourseToEnroll
                              )
                            }
                            className="sm:self-end px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer h-[36px]"
                          >
                            {isEnrollingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Enroll in Course
                          </button>
                        </div>
                      )}

                      {(!selectedStudent.enrollments || selectedStudent.enrollments.length === 0) ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-text/60 font-medium">Student is not enrolled in any courses yet.</p>
                        </div>
                      ) : (
                        selectedStudent.enrollments.map((enr: any) => {
                          const course = enr.courses;
                          if (!course) return null;

                          const courseTopics = course.sections?.flatMap((s: any) => s.topics || []) || [];
                          const completedIds = (selectedStudent.topic_progress || [])
                            .filter((tp: any) => tp.is_completed)
                            .map((tp: any) => tp.topic_id);
                          const { progressPercentage, completedCount, totalCount } = calculateCourseProgress(courseTopics, completedIds);

                          return (
                            <div key={enr.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                              <div className="flex items-center justify-between gap-4 mb-3">
                                <div>
                                  <h4 className="font-bold text-text text-base">{course.title}</h4>
                                  <span className="text-[11px] text-text/50">
                                    Enrolled: {new Date(enr.enrolled_at || selectedStudent.created_at).toLocaleDateString("en-GB")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                    {progressPercentage}% Completed
                                  </span>
                                  <button
                                    onClick={() => handleUnenrollSingle(course.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Unenroll student from this course"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-3">
                                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                              </div>

                              <div className="flex items-center justify-between text-xs text-text/60">
                                <span>{completedCount} of {totalCount} lessons completed</span>
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
                        selectedStudent.manual_submissions.map((sub: any) => {
                          const feedbackMsg = sub.feedback_text || sub.feedback;
                          const feedbackFile = sub.feedback_file_url || sub.reviewed_file_url;
                          return (
                            <div key={sub.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-blue-500" />
                                  <h5 className="font-bold text-text text-sm">{sub.topics?.title || "Worksheet Assignment"}</h5>
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
                                  <div className="font-bold text-green-900">Score: {sub.score !== null && sub.score !== undefined ? sub.score : "N/A"}</div>
                                  {feedbackMsg && <div className="text-green-800 italic">&quot;{feedbackMsg}&quot;</div>}
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
                                  {feedbackFile && (
                                    <a
                                      href={feedbackFile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                                    >
                                      View Feedback File <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
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
                        selectedStudent.quiz_submissions.map((qs: any) => {
                          const totalMarks = qs.quizzes?.total_marks || 100;
                          const passingScore = qs.quizzes?.passing_score;
                          const scoreVal = qs.score !== null && qs.score !== undefined ? Number(qs.score) : null;
                          const scorePct = scoreVal !== null && totalMarks > 0 ? Math.round((scoreVal / totalMarks) * 100) : null;
                          const isPassed = scoreVal !== null ? (passingScore != null ? scoreVal >= passingScore : scorePct !== null && scorePct >= 50) : false;
                          const isReviewed = qs.status === "reviewed" || !qs.is_pdf_quiz;
                          const feedbackMsg = qs.feedback || qs.feedback_text;

                          return (
                            <div key={qs.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-600" />
                                    <h5 className="font-bold text-text text-sm">
                                      {qs.quizzes?.title || qs.quizzes?.topics?.title || "Quiz Evaluation"}
                                    </h5>
                                    {qs.is_pdf_quiz && (
                                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                                        PDF Upload
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-text/50 mt-1">Submitted: {new Date(qs.submitted_at).toLocaleDateString("en-GB")}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {scoreVal !== null && (
                                    <div className="text-right">
                                      <span className="text-sm font-bold text-text">
                                        {scoreVal} / {totalMarks}
                                      </span>
                                      {scorePct !== null && <span className="block text-[11px] text-text/50">{scorePct}%</span>}
                                    </div>
                                  )}
                                  {qs.is_pdf_quiz && qs.status === "pending" ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                      Pending Review
                                    </span>
                                  ) : (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                      isPassed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                    }`}>
                                      {isPassed ? "Passed" : "Failed"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {feedbackMsg && (
                                <div className="bg-purple-50/60 border border-purple-100 p-3 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-purple-900">Instructor Feedback:</div>
                                  <div className="text-purple-800 italic">&quot;{feedbackMsg}&quot;</div>
                                </div>
                              )}

                              {qs.file_url && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                                  <a
                                    href={qs.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                                  >
                                    View Student Quiz Solution <ExternalLink className="w-3 h-3" />
                                  </a>
                                  {qs.feedback_file_url && (
                                    <a
                                      href={qs.feedback_file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                                    >
                                      View Instructor Feedback File <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 5: AI Assistant & Usage */}
                  {activeTab === "ai" && (
                    <div className="space-y-6">
                      {/* AI Access Control Banner */}
                      <div className={`p-5 rounded-2xl border ${
                        selectedStudent.ai_enabled === false
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              selectedStudent.ai_enabled === false
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {selectedStudent.ai_enabled === false ? (
                                <Ban className="w-5 h-5" />
                              ) : (
                                <Sparkles className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm">
                                  AI Assistant Access: {selectedStudent.ai_enabled === false ? 'PAUSED / BLOCKED' : 'ACTIVE'}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  selectedStudent.ai_enabled === false
                                    ? 'bg-rose-200 text-rose-800'
                                    : 'bg-emerald-200 text-emerald-800'
                                }`}>
                                  {selectedStudent.ai_enabled === false ? 'Disabled' : 'Enabled'}
                                </span>
                              </div>
                              <p className="text-xs text-text/70 mt-0.5">
                                {selectedStudent.ai_enabled === false
                                  ? 'This student is currently blocked from using the AI Chatbot. No API tokens can be consumed by this student.'
                                  : 'This student can freely ask questions to the Michael Gad Math AI Assistant (Claude 3.7 & GPT-4o).'}
                              </p>
                            </div>
                          </div>

                          {/* 1-Click Action Button */}
                          <div className="flex-shrink-0 w-full sm:w-auto">
                            {selectedStudent.ai_enabled === false ? (
                              <button
                                onClick={() => handleToggleStudentAi(true)}
                                disabled={isTogglingAi}
                                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {isTogglingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Re-enable AI Access
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStudentAi(false)}
                                disabled={isTogglingAi}
                                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {isTogglingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                Stop Student AI Usage
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Daily Limit Controls */}
                        <div className="mt-4 pt-4 border-t border-black/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                          <div className="text-text/70">
                            <strong>Daily Question Quota:</strong> {selectedStudent.ai_daily_limit ? `${selectedStudent.ai_daily_limit} questions / day` : 'Unlimited'}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 20 (or blank for unlimited)"
                              value={aiDailyLimitInput}
                              onChange={(e) => setAiDailyLimitInput(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs w-48 outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              onClick={handleSaveAiLimit}
                              disabled={isTogglingAi}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Save Quota
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Usage Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                          <div className="text-[11px] font-bold text-text/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-primary" />
                            Total Questions
                          </div>
                          <div className="text-xl font-bold text-text">
                            {(selectedStudent.chat_logs || []).reduce((acc: number, c: any) => acc + (c.messages?.filter((m: any) => m.role === 'user').length || 0), 0)}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                          <div className="text-[11px] font-bold text-text/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-purple-600" />
                            Total Tokens
                          </div>
                          <div className="text-xl font-bold text-purple-700">
                            ~{((selectedStudent.chat_logs || []).reduce((acc: number, c: any) => acc + (c.total_tokens || (c.messages?.length || 0) * 120), 0)).toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                          <div className="text-[11px] font-bold text-text/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Conversations
                          </div>
                          <div className="text-xl font-bold text-text">
                            {(selectedStudent.chat_logs || []).length}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                          <div className="text-[11px] font-bold text-text/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Est. API Cost
                          </div>
                          <div className="text-xl font-bold text-emerald-700">
                            ${(((selectedStudent.chat_logs || []).reduce((acc: number, c: any) => acc + (c.total_tokens || (c.messages?.length || 0) * 120), 0) / 1_000_000) * 5.0).toFixed(3)}
                          </div>
                        </div>
                      </div>

                      {/* Recent Student AI Conversations */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-text text-sm">Recent Student AI Conversations</h4>
                          <Link 
                            href="/admin/chat-logs" 
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            Open Full AI Chat Logs →
                          </Link>
                        </div>

                        {(!selectedStudent.chat_logs || selectedStudent.chat_logs.length === 0) ? (
                          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-text/60 font-medium">No AI interactions recorded for this student yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedStudent.chat_logs.map((log: any) => {
                              const lastMsg = log.messages?.[log.messages.length - 1];
                              const firstUserMsg = log.messages?.find((m: any) => m.role === 'user');
                              return (
                                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs hover:border-primary/30 transition-colors">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-text truncate">
                                        Q: {firstUserMsg?.content || "Conversation session"}
                                      </p>
                                      <span className="text-[11px] text-text/50">
                                        Page: {log.context?.currentPage || "/dashboard"} • {new Date(log.created_at).toLocaleString("en-GB")}
                                      </span>
                                    </div>
                                    <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">
                                      {log.messages?.length || 0} messages
                                    </span>
                                  </div>
                                  {lastMsg && (
                                    <div className="text-xs text-text/70 bg-gray-50 p-2.5 rounded-lg border border-gray-100 line-clamp-2">
                                      <strong className="text-text/90">Last: </strong> {lastMsg.content}
                                    </div>
                                  )}
                                  <div className="mt-2.5 flex items-center justify-end">
                                    <Link
                                      href="/admin/chat-logs"
                                      className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                      Inspect in Chat Logs →
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Report Customizer & PDF Template Modal */}
          <ReportPreviewModal
            student={selectedStudent}
            isOpen={isPdfModalOpen}
            onClose={() => setIsPdfModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
