"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Clock, FileText, Loader2, Upload, Download, Eye, Bell, BellRing, Sparkles, ArrowLeft, HelpCircle, X, ExternalLink, RefreshCw } from "lucide-react";
import { playNotificationSound, requestDesktopNotificationPermission, showDesktopNotification } from "@/lib/sound";
import { NotificationDiagnosticModal } from "@/components/NotificationDiagnosticModal";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [desktopNotificationGranted, setDesktopNotificationGranted] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [testAlertBanner, setTestAlertBanner] = useState<string | null>(null);
  
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [score, setScore] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackFileUrl, setFeedbackFileUrl] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingFeedbackFile, setIsUploadingFeedbackFile] = useState(false);
  const [isUpdatingType, setIsUpdatingType] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopNotificationGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert("Your browser does not support desktop notifications.");
      return;
    }

    if (Notification.permission === 'denied') {
      setShowDiagnosticModal(true);
      return;
    }

    const granted = await requestDesktopNotificationPermission();
    setDesktopNotificationGranted(granted);
    playNotificationSound();

    if (granted) {
      showDesktopNotification(
        "🔔 Test Alert: Student Submissions",
        "Live desktop alerts are active! Whenever students submit worksheets or quizzes, you will receive an alert like this.",
        () => {
          if (typeof window !== 'undefined') window.focus();
        },
        `michaelmath-subtest-${Date.now()}`,
        { requireInteraction: true }
      );
      setTestAlertBanner("Test alert dispatched! If you heard the chime but saw NO Mac banner, open the guide to fix macOS settings.");
    } else {
      setShowDiagnosticModal(true);
    }
  };

  const getSubmissionDetails = (sub: any) => {
    if (!sub) return { isWorksheet: true, badgeText: 'Worksheet', badgeClass: 'bg-blue-100 text-blue-700', itemTitle: 'Worksheet', icon: '📄' };
    const isWorksheet = sub.type === 'worksheet' || (typeof sub.type === 'string' && sub.type.startsWith('worksheet'));

    const contentItems = Array.isArray(sub.topics?.content_items)
      ? sub.topics.content_items
      : (typeof sub.topics?.content_items === "string"
          ? (() => { try { return JSON.parse(sub.topics.content_items); } catch { return []; } })()
          : []);

    if (isWorksheet) {
      const topicWorksheets = contentItems.filter((i: any) => i && i.type === "worksheet");
      let slotIdx = 0;
      if (sub.type === "worksheet" || sub.type === "worksheet_0") {
        slotIdx = 0;
      } else if (typeof sub.type === "string" && sub.type.startsWith("worksheet_")) {
        const suffix = sub.type.replace("worksheet_", "");
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) {
          slotIdx = num;
        } else {
          const matchIdx = topicWorksheets.findIndex((w: any) => w.id === suffix);
          if (matchIdx >= 0) slotIdx = matchIdx;
        }
      }
      const matchedWs = topicWorksheets[slotIdx];
      const title = matchedWs?.title || (topicWorksheets.length > 1 ? `Homework ${slotIdx + 1}` : 'Homework Assignment');
      return {
        isWorksheet: true,
        badgeText: 'Worksheet',
        badgeClass: 'bg-blue-100 text-blue-700',
        itemTitle: title,
        icon: '📄'
      };
    } else {
      const topicQuizzes = contentItems.filter((i: any) => i && i.type === "quiz");
      let matchedQuiz = null;
      if (typeof sub.type === "string" && sub.type.startsWith("pdf_quiz_")) {
        const qId = sub.type.replace("pdf_quiz_", "");
        matchedQuiz = topicQuizzes.find((q: any) => q.id === qId);
      }
      if (!matchedQuiz && topicQuizzes.length > 0) {
        matchedQuiz = topicQuizzes[0];
      }
      const title = matchedQuiz?.title || 'PDF Quiz';
      return {
        isWorksheet: false,
        badgeText: 'PDF Quiz',
        badgeClass: 'bg-purple-100 text-purple-700',
        itemTitle: title,
        icon: '📝'
      };
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_submissions')
        .select(`
          *,
          profiles:student_id (full_name, email),
          topics:topic_id (id, title, section_id, content_items)
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn("manual_submissions table not found");
          setSubmissions([]);
        } else {
          throw error;
        }
      } else {
        const subs = data || [];
        setSubmissions(subs);
        const pendingCount = subs.filter((s: any) => s.status === 'pending').length;
        window.dispatchEvent(new CustomEvent('submissions_count_updated', { detail: pendingCount }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();

    // Subscribe to realtime changes on manual_submissions
    const channel = supabase
      .channel('admin_submissions_page_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'manual_submissions' },
        (payload: any) => {
          fetchSubmissions();
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && payload.new?.status === 'pending')) {
            playNotificationSound();
            showDesktopNotification(
              "📝 New Student Submission!",
              "A student just submitted work. Refreshing submissions list.",
              () => { if (typeof window !== 'undefined') window.focus(); },
              `michaelmath-subpage-${payload.new?.id || Date.now()}`,
              { requireInteraction: true }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFeedbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubmission) return;

    setIsUploadingFeedbackFile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      if (feedbackFileUrl) {
        formData.append("oldUrl", feedbackFileUrl);
      }

      // Upload directly to VPS disk via /api/upload
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error || !data.url) {
        throw new Error(data.error || "Upload to VPS failed.");
      }

      setFeedbackFileUrl(data.url);
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload feedback file to VPS: " + err.message);
    } finally {
      setIsUploadingFeedbackFile(false);
    }
  };

  const handleDownloadSubmission = async () => {
    if (!selectedSubmission?.file_url) return;
    window.open(selectedSubmission.file_url, '_blank');
  };

  // Check if all homework & quizzes for a topic are now approved and mark lesson complete
  const checkAndCompleteTopicForStudent = async (
    topicId: string,
    studentId: string,
    reviewedSubmissionId: string
  ) => {
    try {
      const { data: topic } = await supabase
        .from('topics')
        .select('id, title, content_items, section_id')
        .eq('id', topicId)
        .single();

      if (!topic) return { isComplete: false, topicTitle: 'Lesson', courseId: '' };

      let courseId = '';
      if (topic.section_id) {
        const { data: sec } = await supabase
          .from('sections')
          .select('course_id')
          .eq('id', topic.section_id)
          .single();
        if (sec?.course_id) courseId = sec.course_id;
      }

      const contentItems = Array.isArray(topic.content_items)
        ? topic.content_items
        : (typeof topic.content_items === 'string'
            ? (() => { try { return JSON.parse(topic.content_items); } catch { return []; } })()
            : []);

      // 1. Extract Worksheets
      const contentWorksheets = contentItems.filter((i: any) => i && i.type === 'worksheet' && (i.url || i.file_url || i.title));
      const { data: legacyPdfs } = await supabase
        .from('topic_pdfs')
        .select('*')
        .eq('topic_id', topicId)
        .eq('type', 'worksheet');
      const legacyWorksheets = legacyPdfs || [];

      const allWorksheets: any[] = contentWorksheets.length > 0
        ? contentWorksheets.map((cw: any, idx: number) => ({
            id: cw.id || `ws_${idx}`,
            title: cw.title || (contentWorksheets.length > 1 ? `Homework ${idx + 1}` : 'Topic Homework')
          }))
        : legacyWorksheets.map((p: any, idx: number) => ({
            id: p.id || `legacy_ws_${idx}`,
            title: p.title || (legacyWorksheets.length > 1 ? `Homework ${idx + 1}` : 'Topic Homework')
          }));

      // 2. Extract Quizzes
      const contentQuizzes = contentItems.filter((i: any) => i && i.type === 'quiz');
      const { data: dbQuizzes } = await supabase
        .from('quizzes')
        .select('*')
        .eq('topic_id', topicId);
      const rawDbQuizzes = dbQuizzes || [];

      let allQuizzes: any[] = [];
      if (rawDbQuizzes.length > 0) {
        allQuizzes = rawDbQuizzes.map((dbQ: any, qIdx: number) => {
          const matchedCq = contentQuizzes.find((cq: any) => 
            (cq.id && dbQ.id && cq.id === dbQ.id) ||
            (cq.quizPdfUrl && dbQ.quiz_pdf_url && cq.quizPdfUrl === dbQ.quiz_pdf_url) ||
            (cq.title && dbQ.settings?.title && cq.title === dbQ.settings?.title)
          ) || contentQuizzes[qIdx];
          return {
            id: dbQ.id,
            matchedCqId: matchedCq?.id,
            isPdfQuiz: !!(dbQ.quiz_pdf_url || matchedCq?.quizPdfUrl)
          };
        });
      } else if (contentQuizzes.length > 0) {
        allQuizzes = contentQuizzes.map((cq: any, qIdx: number) => ({
          id: cq.id || `quiz_${topicId}_${qIdx}`,
          matchedCqId: cq.id,
          isPdfQuiz: !!cq.quizPdfUrl
        }));
      }

      // 3. Fetch manual_submissions for this topic & student
      const { data: manualSubs } = await supabase
        .from('manual_submissions')
        .select('*')
        .eq('topic_id', topicId)
        .eq('student_id', studentId);

      const safeManualSubs = (manualSubs || []).map((s: any) => {
        if (s.id === reviewedSubmissionId) {
          return { ...s, status: 'reviewed' };
        }
        return s;
      });

      // 4. Fetch quiz_submissions
      let quizSubs: any[] = [];
      if (allQuizzes.length > 0) {
        const qIds = allQuizzes.map((q: any) => q.id).concat(allQuizzes.map((q: any) => q.matchedCqId).filter(Boolean));
        const { data: qsData } = await supabase
          .from('quiz_submissions')
          .select('*')
          .in('quiz_id', qIds)
          .eq('student_id', studentId);
        quizSubs = qsData || [];
      }

      // 5. Check Worksheets: every worksheet MUST be reviewed
      if (allWorksheets.length > 0) {
        const allWsApproved = allWorksheets.every((ws: any, idx: number) => {
          const subType = allWorksheets.length === 1 
            ? 'worksheet' 
            : (ws.id ? `worksheet_${ws.id}` : `worksheet_${idx}`);
          
          const sub = safeManualSubs.find((s: any) => 
            s.type === subType || 
            (idx === 0 && s.type === 'worksheet') || 
            s.type === `worksheet_${idx}` ||
            (ws.id && s.type === `worksheet_${ws.id}`)
          );
          return sub && sub.status === 'reviewed';
        });
        if (!allWsApproved) return { isComplete: false, topicTitle: topic.title, courseId };
      }

      // 6. Check Quizzes: every quiz MUST be completed and PDF quizzes reviewed
      if (allQuizzes.length > 0) {
        const allQzApproved = allQuizzes.every((quiz: any) => {
          // If PDF quiz, must have reviewed manual_submissions record
          const pdfSub = safeManualSubs.find((s: any) => 
            s.type === `pdf_quiz_${quiz.id}` || 
            (quiz.matchedCqId && s.type === `pdf_quiz_${quiz.matchedCqId}`) || 
            s.type === 'pdf_quiz'
          );
          if (pdfSub) {
            return pdfSub.status === 'reviewed';
          }
          // If online quiz, must have submission in quiz_submissions
          const qSub = quizSubs.find((s: any) => s.quiz_id === quiz.id || (quiz.matchedCqId && s.quiz_id === quiz.matchedCqId));
          if (qSub) return true;

          return false;
        });
        if (!allQzApproved) return { isComplete: false, topicTitle: topic.title, courseId };
      }

      const hasRequirements = allWorksheets.length > 0 || allQuizzes.length > 0;
      if (!hasRequirements) return { isComplete: false, topicTitle: topic.title, courseId };

      // Mark topic complete in topic_progress
      await supabase.from('topic_progress').upsert({
        student_id: studentId,
        topic_id: topicId,
        is_completed: true,
        last_accessed_at: new Date().toISOString()
      }, { onConflict: 'student_id,topic_id' });

      return { isComplete: true, topicTitle: topic.title, courseId };
    } catch (err) {
      console.error("Error in checkAndCompleteTopicForStudent:", err);
      return { isComplete: false, topicTitle: 'Lesson', courseId: '' };
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedSubmission) return;
    setIsSubmittingReview(true);
    try {
      const { error: updateError } = await supabase
        .from('manual_submissions')
        .update({
          score: score ? parseFloat(score) : null,
          feedback_text: feedbackText,
          feedback_file_url: feedbackFileUrl || null,
          status: 'reviewed',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id);

      if (updateError) throw updateError;

      // Immediately notify layout to decrement sidebar pending badge
      window.dispatchEvent(new CustomEvent('submission_reviewed'));

      // Check if all topic requirements for this student are now reviewed & approved
      const { isComplete, topicTitle, courseId } = await checkAndCompleteTopicForStudent(
        selectedSubmission.topic_id,
        selectedSubmission.student_id,
        selectedSubmission.id
      );

      const linkUrl = courseId ? `/dashboard/courses/${courseId}` : '/dashboard/courses';

      if (isComplete) {
        // Send Lesson Completed notification
        await supabase.from('notifications').insert({
          student_id: selectedSubmission.student_id,
          title: `🎉 Lesson Completed: ${topicTitle}!`,
          message: `Congratulations! Your teacher Michael Gad has reviewed and approved your submission for "${topicTitle}". This lesson is now marked 100% complete!`,
          type: 'success',
          link_url: linkUrl
        });

        alert(`🎉 Review submitted! All requirements for "${topicTitle}" have been approved — lesson marked COMPLETE for the student and they have been notified!`);
      } else {
        // Send standard individual item review notification
        const isWs = selectedSubmission.type === 'worksheet' || (typeof selectedSubmission.type === 'string' && selectedSubmission.type.startsWith('worksheet'));
        await supabase.from('notifications').insert({
          student_id: selectedSubmission.student_id,
          title: `Your ${isWs ? 'Worksheet' : 'Quiz'} was Reviewed!`,
          message: `Your submission for "${topicTitle}" has been reviewed.${score ? ` Score: ${score}` : ''} Check your course for details.`,
          type: 'system',
          link_url: linkUrl
        });

        alert("Review submitted and student notified!");
      }

      setSelectedSubmission(null);
      setScore('');
      setFeedbackText('');
      setFeedbackFileUrl('');
      fetchSubmissions();
    } catch (err: any) {
      console.error(err);
      alert("Error saving review: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleSubmissionType = async () => {
    if (!selectedSubmission) return;
    const isCurrentlyWs = selectedSubmission.type === 'worksheet' || (typeof selectedSubmission.type === 'string' && selectedSubmission.type.startsWith('worksheet'));
    const newType = isCurrentlyWs ? 'pdf_quiz' : 'worksheet_0';
    const newLabel = isCurrentlyWs ? 'PDF Quiz' : 'Worksheet';

    const confirmChange = confirm(`Do you want to reclassify this submission as a "${newLabel}" instead of "${isCurrentlyWs ? 'Worksheet' : 'PDF Quiz'}"?`);
    if (!confirmChange) return;

    setIsUpdatingType(true);
    try {
      const { error } = await supabase
        .from('manual_submissions')
        .update({ type: newType })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      const updatedSub = { ...selectedSubmission, type: newType };
      setSelectedSubmission(updatedSub);
      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, type: newType } : s));
      alert(`✅ Submission successfully reclassified as ${newLabel}!`);
    } catch (err: any) {
      console.error(err);
      alert("Error changing submission type: " + err.message);
    } finally {
      setIsUpdatingType(false);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length;
  const filteredSubmissions = submissions.filter(s => s.status === activeTab);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start md:items-center mb-8 flex-col sm:flex-row gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">Student Submissions</h1>
            {pendingCount > 0 ? (
              <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                {pendingCount} remaining to check
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                All reviewed ✓
              </span>
            )}
          </div>
          <p className="text-text/60 text-sm mt-0.5">Download, review, and upload annotated feedback for student work.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnableAlerts}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs ${
              desktopNotificationGranted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
            }`}
            title={desktopNotificationGranted ? 'Live desktop alerts are active — Click to send a test alert' : 'Click to enable desktop alerts for new student submissions'}
          >
            <Bell className={`w-3.5 h-3.5 ${desktopNotificationGranted ? 'text-emerald-600' : 'text-amber-600 animate-bounce'}`} />
            {desktopNotificationGranted ? 'Desktop Alerts Active' : 'Enable Live Alerts'}
            {desktopNotificationGranted && (
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-black ml-0.5">
                Test
              </span>
            )}
          </button>

          <button
            onClick={() => setShowDiagnosticModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text/70 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors shadow-2xs"
            title="Desktop alert settings & Mac troubleshooting guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-text/60" />
            <span className="hidden sm:inline">Mac Alert Guide</span>
          </button>
        </div>
      </div>

      {/* Test Alert Feedback Banner */}
      {testAlertBanner && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div className="text-xs">
              <p className="font-bold text-sm text-emerald-950">Test alert sent to your Mac screen!</p>
              <p className="text-emerald-800/80 mt-0.5">{testAlertBanner}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className="text-xs font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors shadow-2xs"
            >
              Fix Mac Banner
            </button>
            <button
              onClick={() => setTestAlertBanner(null)}
              className="text-emerald-700/60 hover:text-emerald-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'
          }`}
        >
          <span>Pending Review</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
            pendingCount > 0 
              ? 'bg-rose-500 text-white animate-pulse' 
              : 'bg-gray-100 text-text/60'
          }`}>
            {pendingCount}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('reviewed')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reviewed' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'
          }`}
        >
          <span>Reviewed</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text/60 font-bold">
            {reviewedCount}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submissions List: hidden on mobile if an item is selected */}
        <div className={`md:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-1 md:pr-2 ${selectedSubmission ? 'hidden md:block' : 'block'}`}>
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
              {activeTab === 'pending' ? (
                <>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-text text-sm mb-1">All Caught Up! 🎉</h3>
                  <p className="text-text/50 text-xs">There are no pending submissions remaining to check.</p>
                </>
              ) : (
                <p className="text-text/50 text-sm">No reviewed submissions found.</p>
              )}
            </div>
          ) : (
            filteredSubmissions.map(sub => {
              const details = getSubmissionDetails(sub);
              return (
                <div 
                  key={sub.id} 
                  onClick={() => {
                    setSelectedSubmission(sub);
                    setScore(sub.score?.toString() || '');
                    setFeedbackText(sub.feedback_text || '');
                    setFeedbackFileUrl(sub.feedback_file_url || '');
                  }}
                  className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${selectedSubmission?.id === sub.id ? 'border-primary shadow-sm ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${details.badgeClass}`}>
                      {details.badgeText}
                    </span>
                    <span className="text-[10px] text-text/40">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-sm text-text truncate">{sub.profiles?.full_name || 'Unknown Student'}</h4>
                  <p className="text-xs text-text/60 truncate">{sub.topics?.title || 'Unknown Topic'}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span>{details.icon}</span>
                    <span className="truncate">{details.itemTitle}</span>
                  </div>
                  {sub.feedback_file_url && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Feedback file attached
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Review Panel: shown when selected on mobile, or alongside list on desktop */}
        <div className={`md:col-span-2 ${selectedSubmission ? 'block' : 'hidden md:block'}`}>
          {selectedSubmission ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="md:hidden mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                  <span>← Back to Submissions List</span>
                </button>

                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-text">{selectedSubmission.profiles?.full_name}</h3>
                    <p className="text-xs sm:text-sm text-text/60">{selectedSubmission.topics?.title}</p>
                    {(() => {
                      const selectedDetails = getSubmissionDetails(selectedSubmission);
                      return (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded ${selectedDetails.badgeClass}`}>
                            {selectedDetails.badgeText}
                          </span>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>{selectedDetails.icon}</span>
                            <span>{selectedDetails.itemTitle}</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleToggleSubmissionType}
                            disabled={isUpdatingType}
                            className="text-[11px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all flex items-center gap-1 shadow-2xs"
                            title={`Reclassify this submission as ${selectedDetails.isWorksheet ? 'PDF Quiz' : 'Worksheet'}`}
                          >
                            {isUpdatingType ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span>Change to {selectedDetails.isWorksheet ? 'PDF Quiz' : 'Worksheet'}</span>
                          </button>
                        </div>
                      );
                    })()}
                    <p className="text-[11px] sm:text-xs text-text/40 mt-1.5">Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full shrink-0 ${selectedSubmission.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedSubmission.status}
                  </span>
                </div>
              </div>

              {/* Student's Submission - Download/View */}
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-3">Student&apos;s Submission</h4>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <a 
                    href={selectedSubmission.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-bold text-text hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View in Browser
                  </a>
                  <button
                    onClick={handleDownloadSubmission}
                    className="flex items-center justify-center gap-2 bg-text text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-text/90 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
              
              {/* Grading & Feedback */}
              <div className="p-4 sm:p-6 bg-white">
                <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-4">Grading & Feedback</h4>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text/50 uppercase tracking-wider mb-1">Score</label>
                      <input 
                        type="number" 
                        value={score}
                        onChange={e => setScore(e.target.value)}
                        placeholder="e.g. 85"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-text/40 pb-2 sm:pb-3">Enter a score out of total marks</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-text/50 uppercase tracking-wider mb-1">Written Feedback</label>
                    <textarea 
                      rows={3}
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder="Write your comments here... (e.g. 'Great work on Q1-3, but review Q5 — see my annotations in the PDF below.')"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
                    />
                  </div>

                  {/* Upload Reviewed/Annotated PDF */}
                  <div>
                    <label className="block text-xs font-bold text-text/50 uppercase tracking-wider mb-1">Upload Reviewed / Annotated File</label>
                    <p className="text-xs text-text/40 mb-2">Download the student&apos;s PDF above, annotate it, then upload your reviewed version here. The student will be able to download it.</p>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text rounded-lg text-sm font-bold transition-colors shadow-sm border border-gray-200">
                        {isUploadingFeedbackFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploadingFeedbackFile ? 'Uploading...' : (feedbackFileUrl ? 'Replace File' : 'Choose File')}
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFeedbackFileUpload} disabled={isUploadingFeedbackFile} />
                      </label>

                      {feedbackFileUrl && (
                        <a 
                          href={feedbackFileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-bold break-all"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> File uploaded — Preview
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button 
                      onClick={handleReviewSubmit}
                      disabled={isSubmittingReview}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-70 shadow-sm"
                    >
                      {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {selectedSubmission.status === 'pending' ? 'Submit Review & Notify Student' : 'Update Review & Notify'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 h-full flex flex-col items-center justify-center text-text/40 min-h-[400px]">
              <FileText className="w-12 h-12 mb-4" />
              <p className="font-medium">Select a submission from the list to review</p>
              <p className="text-sm mt-1">Download → Annotate → Upload feedback</p>
            </div>
          )}
        </div>
      </div>

      <NotificationDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        pageTitle="Student Submissions"
        onPermissionUpdated={(granted) => setDesktopNotificationGranted(granted)}
      />
    </div>
  );
}
