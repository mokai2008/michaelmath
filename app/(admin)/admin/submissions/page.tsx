"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Clock, FileText, Loader2, Upload, Download, Eye } from "lucide-react";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [score, setScore] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackFileUrl, setFeedbackFileUrl] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingFeedbackFile, setIsUploadingFeedbackFile] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
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
        setSubmissions(data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleFeedbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubmission) return;

    setIsUploadingFeedbackFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `feedback_${selectedSubmission.student_id}_${selectedSubmission.topic_id}_${Date.now()}.${fileExt}`;
      const filePath = `feedback_files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-assets')
        .getPublicUrl(filePath);

      setFeedbackFileUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload feedback file: " + err.message);
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

  const filteredSubmissions = submissions.filter(s => s.status === activeTab);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Student Submissions</h1>
          <p className="text-text/60 text-sm">Download, review, and upload annotated feedback for student work.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}
        >
          Pending Review ({submissions.filter(s => s.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab('reviewed')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'reviewed' ? 'border-primary text-primary' : 'border-transparent text-text/60 hover:text-text'}`}
        >
          Reviewed ({submissions.filter(s => s.status === 'reviewed').length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="md:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-text/50 text-sm">
              No {activeTab} submissions found.
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
                className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${selectedSubmission?.id === sub.id ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
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

        {/* Review Panel */}
        <div className="md:col-span-2">
          {selectedSubmission ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-text">{selectedSubmission.profiles?.full_name}</h3>
                    <p className="text-sm text-text/60">{selectedSubmission.topics?.title}</p>
                    <p className="text-xs text-text/40 mt-1">Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${selectedSubmission.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedSubmission.status}
                  </span>
                </div>
              </div>

              {/* Student's Submission - Download/View */}
              <div className="p-6 border-b border-gray-100">
                <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-3">Student&apos;s Submission</h4>
                <div className="flex gap-3">
                  <a 
                    href={selectedSubmission.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-bold text-text hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View in Browser
                  </a>
                  <button
                    onClick={handleDownloadSubmission}
                    className="flex items-center gap-2 bg-text text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-text/90 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
              
              {/* Grading & Feedback */}
              <div className="p-6 bg-white">
                <h4 className="font-bold text-xs text-text/50 uppercase tracking-wider mb-4">Grading & Feedback</h4>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
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
                      <p className="text-xs text-text/40 pb-3">Enter a score out of total marks</p>
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
                    
                    <div className="flex items-center gap-3">
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
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-bold"
                        >
                          <CheckCircle2 className="w-4 h-4" /> File uploaded — Preview
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
    </div>
  );
}
