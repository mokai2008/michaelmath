"use client";

import React, { useState } from 'react';
import { Download, Loader2, FileCheck } from 'lucide-react';
import { StudentReportPDF } from './StudentReportPDF';

import { supabase } from '@/lib/supabase';

interface DownloadReportButtonProps {
  student: any;
  teacherNotes?: string;
  themeColor?: 'emerald' | 'navy' | 'purple';
  variant?: 'primary' | 'secondary' | 'outline';
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  student,
  teacherNotes,
  themeColor = 'emerald',
  variant = 'primary',
  label = 'Download PDF Report',
  className = '',
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student || disabled) return;

    setIsGenerating(true);

    try {
      let reportStudent = { ...student };

      // Self-healing data load: if the student object is missing detailed records, fetch them fresh from DB
      if (
        !reportStudent.topic_progress || 
        reportStudent.topic_progress.length === 0 ||
        !reportStudent.enrollments || 
        reportStudent.enrollments.length === 0 || 
        !reportStudent.quiz_submissions
      ) {
        try {
          const sid = student.id;

          // 1. Topic Progress
          const { data: tp } = await supabase
            .from("topic_progress")
            .select("*, topics(id, title, section_id)")
            .eq("student_id", sid);

          // 2. Manual Submissions
          const { data: ms } = await supabase
            .from("manual_submissions")
            .select("*, topics(id, title, section_id)")
            .eq("student_id", sid)
            .order("submitted_at", { ascending: false });

          // 3. Quiz Submissions
          const { data: qs } = await supabase
            .from("quiz_submissions")
            .select("*, quizzes(id, total_marks, passing_score, topic_id)")
            .eq("student_id", sid)
            .order("submitted_at", { ascending: false });

          let interactiveQuizSubs = qs || [];
          if (interactiveQuizSubs.length > 0) {
            const tIds = Array.from(new Set(interactiveQuizSubs.map((q: any) => q.quizzes?.topic_id).filter(Boolean)));
            if (tIds.length > 0) {
              const { data: tList } = await supabase.from("topics").select("id, title, section_id").in("id", tIds);
              const tMap = new Map((tList || []).map((t: any) => [t.id, t]));
              interactiveQuizSubs = interactiveQuizSubs.map((q: any) => ({
                ...q,
                quizzes: q.quizzes ? { ...q.quizzes, topics: tMap.get(q.quizzes.topic_id) || null } : null
              }));
            }
          }

          const allManual = ms || [];
          const worksheets = allManual.filter((s: any) => s.type !== "pdf_quiz");
          const pdfQuizzes = allManual.filter((s: any) => s.type === "pdf_quiz");
          const formattedPdfQuizzes = pdfQuizzes.map((pq: any) => ({
            id: pq.id,
            student_id: pq.student_id,
            score: pq.score !== null && pq.score !== undefined ? Number(pq.score) : null,
            submitted_at: pq.submitted_at,
            is_pdf_quiz: true,
            feedback: pq.feedback_text || pq.feedback,
            status: pq.status,
            quizzes: {
              id: pq.id,
              title: pq.topics?.title ? `${pq.topics.title} (PDF Quiz)` : "PDF Quiz",
              total_marks: 100,
              passing_score: 50,
            }
          }));

          const unifiedQuizzes = [...interactiveQuizSubs, ...formattedPdfQuizzes];

          // 4. Course Resolution
          const detectedCourseIds = new Set<string>();
          const { data: directEnrs } = await supabase.from("enrollments").select("id, enrolled_at, course_id").eq("student_id", sid);
          (directEnrs || []).forEach((en: any) => { if (en.course_id) detectedCourseIds.add(en.course_id); });
          (reportStudent.enrollments || []).forEach((en: any) => { const cId = en.course_id || en.courses?.id; if (cId) detectedCourseIds.add(cId); });

          const allSectionIds = Array.from(new Set([
            ...(tp || []).map((t: any) => t.topics?.section_id),
            ...(allManual || []).map((m: any) => m.topics?.section_id),
          ].filter(Boolean)));

          if (allSectionIds.length > 0) {
            const { data: secList } = await supabase.from("sections").select("id, course_id").in("id", allSectionIds);
            (secList || []).forEach((s: any) => { if (s.course_id) detectedCourseIds.add(s.course_id); });
          }

          const allCIds = Array.from(detectedCourseIds);
          let detailedEnrollments = reportStudent.enrollments || [];
          if (allCIds.length > 0) {
            const { data: cData } = await supabase
              .from("courses")
              .select("id, title, total_price, sections(id, title, topics(id, title, progress_percentage, content_items))")
              .in("id", allCIds);
            if (cData && cData.length > 0) {
              detailedEnrollments = cData.map((course: any) => ({
                id: `enr_${course.id}`,
                course_id: course.id,
                courses: course
              }));
            }
          }

          if (detailedEnrollments.length === 0) {
            const { data: fc } = await supabase
              .from("courses")
              .select("id, title, total_price, sections(id, title, topics(id, title, progress_percentage, content_items))")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (fc) {
              detailedEnrollments = [{
                id: `enr_${fc.id}`,
                course_id: fc.id,
                courses: fc
              }];
            }
          }

          reportStudent = {
            ...reportStudent,
            enrollments: detailedEnrollments.length > 0 ? detailedEnrollments : reportStudent.enrollments || [],
            topic_progress: (tp && tp.length > 0) ? tp : reportStudent.topic_progress || [],
            manual_submissions: worksheets,
            all_manual_submissions: allManual,
            quiz_submissions: unifiedQuizzes.length > 0 ? unifiedQuizzes : reportStudent.quiz_submissions || [],
          };
        } catch (fetchErr) {
          console.warn("Could not pre-fetch full student report data:", fetchErr);
        }
      }

      // Dynamically import pdf from @react-pdf/renderer to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer');

      // Generate the PDF document instance with full student data
      const doc = (
        <StudentReportPDF
          student={reportStudent}
          teacherNotes={teacherNotes}
          themeColor={themeColor}
        />
      );

      // Create blob
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const cleanCode = reportStudent.student_code || 'Student';
      const cleanName = (reportStudent.full_name || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Michael_Gad_Math_Academy_Report_${cleanCode}_${cleanName}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup blob URL
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      alert('Could not generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  let baseStyle = 'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  if (variant === 'primary') {
    baseStyle += ' bg-emerald-600 hover:bg-emerald-700 text-white';
  } else if (variant === 'secondary') {
    baseStyle += ' bg-slate-900 hover:bg-slate-800 text-white';
  } else {
    baseStyle += ' bg-white hover:bg-gray-50 text-slate-700 border border-gray-200';
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating || disabled}
      className={`${baseStyle} ${className}`}
      title="Generate and download official PDF academic report"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-current" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
