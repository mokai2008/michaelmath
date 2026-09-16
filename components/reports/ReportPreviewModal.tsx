"use client";

import React, { useState } from 'react';
import { X, FileText, Palette, MessageSquare, Download, Sparkles, Eye } from 'lucide-react';
import { DownloadReportButton } from './DownloadReportButton';

interface ReportPreviewModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const [teacherNotes, setTeacherNotes] = useState<string>(
    "Keep up the outstanding effort and consistency in solving problem sets!"
  );
  const [themeColor, setThemeColor] = useState<'emerald' | 'navy' | 'purple'>('emerald');
  const [activeView, setActiveView] = useState<'customize' | 'quick_summary'>('customize');

  if (!isOpen || !student) return null;

  // Calculate quick metrics for preview
  const enrollmentsCount = student.enrollments?.length || 0;
  const completedLessonsCount = (student.topic_progress || []).filter((tp: any) => tp.is_completed).length;
  const worksheetsCount = student.manual_submissions?.length || 0;
  const quizzesCount = student.quiz_submissions?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">PDF Academic Report Generator</h3>
              <p className="text-xs text-slate-400">
                Template Preview & Customization for {student.full_name || student.email || 'Student'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
              <span className="block text-lg font-black text-slate-800">{enrollmentsCount}</span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Courses</span>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="block text-lg font-black text-emerald-700">{completedLessonsCount}</span>
              <span className="text-[10px] text-emerald-600 uppercase font-semibold">Lessons Done</span>
            </div>
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 text-center">
              <span className="block text-lg font-black text-blue-700">{worksheetsCount}</span>
              <span className="text-[10px] text-blue-600 uppercase font-semibold">Worksheets</span>
            </div>
            <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-100 text-center">
              <span className="block text-lg font-black text-purple-700">{quizzesCount}</span>
              <span className="text-[10px] text-purple-600 uppercase font-semibold">Quizzes</span>
            </div>
          </div>

          {/* Theme Palette Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-600" />
              PDF Template Theme Palette
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setThemeColor('emerald')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  themeColor === 'emerald'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-emerald-900">Academy Emerald</span>
                  <span className="text-[10px] text-emerald-600">Standard Official</span>
                </div>
                <div className="w-4 h-4 rounded-full bg-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => setThemeColor('navy')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  themeColor === 'navy'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-blue-900">Royal Navy</span>
                  <span className="text-[10px] text-blue-600">Executive Style</span>
                </div>
                <div className="w-4 h-4 rounded-full bg-blue-800" />
              </button>

              <button
                type="button"
                onClick={() => setThemeColor('purple')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  themeColor === 'purple'
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold text-purple-900">Modern Purple</span>
                  <span className="text-[10px] text-purple-600">Vibrant Academic</span>
                </div>
                <div className="w-4 h-4 rounded-full bg-purple-600" />
              </button>
            </div>
          </div>

          {/* Teacher Custom Remarks Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Instructor Remarks & Recommendations
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Included in PDF Footer</span>
            </label>
            <textarea
              rows={3}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Add custom teacher feedback or encouragement for this student..."
              className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          {/* PDF Template Preview Box */}
          <div className="border border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50/70 text-xs space-y-3">
            <div className="flex items-center justify-between text-gray-500">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Template Preview Summary
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 font-mono">
                A4 PDF Layout
              </span>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="font-bold text-emerald-700">MICHAEL GAD MATH ACADEMY</span>
                <span className="text-[10px] text-gray-400">Date: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="text-[11px] text-slate-800">
                <strong>Student:</strong> {student.full_name || student.email} ({student.student_code || 'N/A'})
              </div>
              <div className="text-[10px] text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                &quot;{teacherNotes || 'No specific remarks'}&quot;
              </div>
              <div className="flex justify-between items-center pt-2 text-[9px] text-gray-400">
                <span>Signed: Michael Gad (Lead Math Instructor)</span>
                <span>Official Certified PDF</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          
          <DownloadReportButton
            student={student}
            teacherNotes={teacherNotes}
            themeColor={themeColor}
            variant="primary"
            label="Download PDF Report"
            className="px-6 py-2.5 text-sm"
          />
        </div>

      </div>
    </div>
  );
};
