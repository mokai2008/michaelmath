"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Clock, FileText, Loader2, Upload, Download, Eye, Bell, BellRing, Sparkles, ArrowLeft, HelpCircle, X, ExternalLink } from "lucide-react";
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

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_submissions')
        .select(`
          *,
          profiles:student_id (full_name, email),
          topics:topic_id (title, section_id)
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

      // Send notification to student
      const { error: notifyError } = await supabase.from('notifications').insert({
        student_id: selectedSubmission.student_id,
        title: `Your ${selectedSubmission.type === 'worksheet' ? 'Worksheet' : 'Quiz'} was Reviewed!`,
        message: `Your submission for "${selectedSubmission.topics?.title || 'a topic'}" has been reviewed.${score ? ` Score: ${score}` : ''} Check your course for details.`,
        type: 'system',
        link_url: '#'
      });

      if (notifyError) throw notifyError;

      alert("Review submitted and student notified!");
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
            filteredSubmissions.map(sub => (
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
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${sub.type === 'worksheet' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {sub.type === 'worksheet' ? 'Worksheet' : 'PDF Quiz'}
                  </span>
                  <span className="text-[10px] text-text/40">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-sm text-text truncate">{sub.profiles?.full_name || 'Unknown Student'}</h4>
                <p className="text-xs text-text/60 truncate">{sub.topics?.title || 'Unknown Topic'}</p>
                {sub.feedback_file_url && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Feedback file attached
                  </div>
                )}
              </div>
            ))
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
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-text">{selectedSubmission.profiles?.full_name}</h3>
                    <p className="text-xs sm:text-sm text-text/60">{selectedSubmission.topics?.title}</p>
                    <p className="text-[11px] sm:text-xs text-text/40 mt-1">Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
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
