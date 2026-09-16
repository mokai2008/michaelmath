"use client";

import React, { useState } from 'react';
import { Download, Loader2, FileCheck } from 'lucide-react';
import { StudentReportPDF } from './StudentReportPDF';

interface DownloadReportButtonProps {
  student: any;
  teacherNotes?: string;
  themeColor?: 'emerald' | 'navy' | 'purple';
  variant?: 'primary' | 'secondary' | 'outline';
  label?: string;
  className?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  student,
  teacherNotes,
  themeColor = 'emerald',
  variant = 'primary',
  label = 'Download PDF Report',
  className = '',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student) return;

    setIsGenerating(true);

    try {
      // Dynamically import pdf from @react-pdf/renderer to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer');

      // Generate the PDF document instance
      const doc = (
        <StudentReportPDF
          student={student}
          teacherNotes={teacherNotes}
          themeColor={themeColor}
        />
      );

      // Create blob
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const cleanCode = student.student_code || 'Student';
      const cleanName = (student.full_name || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
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
      disabled={isGenerating}
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
