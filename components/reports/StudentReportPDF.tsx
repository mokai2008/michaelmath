import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { calculateCourseProgress } from '@/lib/progress';

interface StudentReportProps {
  student: {
    full_name?: string;
    email?: string;
    student_code?: string;
    student_whatsapp?: string;
    parent_whatsapp?: string;
    wallet_balance?: number;
    created_at?: string;
    enrollments?: any[];
    topic_progress?: any[];
    manual_submissions?: any[];
    all_manual_submissions?: any[];
    quiz_submissions?: any[];
  };
  teacherNotes?: string;
  themeColor?: 'emerald' | 'navy' | 'purple';
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Themes
const themes = {
  emerald: {
    primary: '#059669',
    secondary: '#047857',
    accentBg: '#ECFDF5',
    accentBorder: '#A7F3D0',
    darkText: '#064E3B',
  },
  navy: {
    primary: '#1E3A8A',
    secondary: '#1E40AF',
    accentBg: '#EFF6FF',
    accentBorder: '#BFDBFE',
    darkText: '#1E3A8A',
  },
  purple: {
    primary: '#6D28D9',
    secondary: '#7C3AED',
    accentBg: '#F5F3FF',
    accentBorder: '#DDD6FE',
    darkText: '#4C1D95',
  },
};

export const StudentReportPDF: React.FC<StudentReportProps> = ({
  student,
  teacherNotes = "Keep up the excellent dedication to your mathematics studies!",
  themeColor = 'emerald',
}) => {
  const theme = themes[themeColor] || themes.emerald;

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
    },
    // Header
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: theme.primary,
      marginBottom: 15,
    },
    brandTitle: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      color: theme.primary,
      letterSpacing: 0.5,
    },
    brandSubtitle: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 2,
    },
    reportBadge: {
      backgroundColor: theme.accentBg,
      borderWidth: 1,
      borderColor: theme.accentBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      alignItems: 'flex-end',
    },
    reportBadgeTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.darkText,
    },
    reportBadgeDate: {
      fontSize: 8,
      color: '#6B7280',
      marginTop: 2,
    },
    // Student Info Card
    studentCard: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      flexDirection: 'row',
      justify: 'space-between',
    },
    infoCol: {
      flexDirection: 'column',
      gap: 3,
    },
    studentName: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    infoLabel: {
      fontSize: 8,
      color: '#6B7280',
      fontFamily: 'Helvetica-Bold',
    },
    infoValue: {
      fontSize: 9,
      color: '#374151',
    },
    codeTag: {
      backgroundColor: theme.primary,
      color: '#FFFFFF',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    // Stats Summary Grid
    statsGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 15,
    },
    statBox: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 8,
      alignItems: 'center',
    },
    statVal: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: theme.primary,
    },
    statLbl: {
      fontSize: 7,
      color: '#6B7280',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    // Section Headers
    sectionHeader: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginBottom: 6,
      marginTop: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
      paddingLeft: 6,
    },
    // Tables
    table: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 12,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#F3F4F6',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    tableRowAlt: {
      backgroundColor: '#FAFAFA',
    },
    th: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#4B5563',
    },
    td: {
      fontSize: 8.5,
      color: '#374151',
    },
    // Status Badge inside Table
    statusBadgeSuccess: {
      backgroundColor: '#D1FAE5',
      color: '#065F46',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
    },
    statusBadgeWarning: {
      backgroundColor: '#FEF3C7',
      color: '#92400E',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
    },
    statusBadgeError: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
    },
    // Teacher Notes Box
    notesBox: {
      backgroundColor: theme.accentBg,
      borderWidth: 1,
      borderColor: theme.accentBorder,
      borderRadius: 6,
      padding: 10,
      marginBottom: 15,
    },
    notesTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: theme.darkText,
      marginBottom: 3,
    },
    notesText: {
      fontSize: 8.5,
      color: '#374151',
      lineHeight: 1.3,
    },
    // Footer & Sign-off
    footerContainer: {
      marginTop: 'auto',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      flexDirection: 'row',
      justify: 'space-between',
      alignItems: 'flex-end',
    },
    signatureBlock: {
      alignItems: 'flex-start',
    },
    teacherName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    teacherTitle: {
      fontSize: 8,
      color: '#6B7280',
    },
    pageNumber: {
      fontSize: 8,
      color: '#9CA3AF',
    },
    emptyText: {
      fontSize: 8.5,
      color: '#9CA3AF',
      fontStyle: 'italic',
      padding: 8,
      textAlign: 'center',
    },
  });

  // Calculate Metrics
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const enrollments = student.enrollments || [];
  const completedLessons = (student.topic_progress || []).filter((tp: any) => tp.is_completed);
  let totalStudyTimeSecs = 0;
  (student.topic_progress || []).forEach((tp: any) => {
    totalStudyTimeSecs += tp.time_spent_seconds || 0;
  });

  // Separate true worksheets from manual_submissions
  const allManual = student.all_manual_submissions || student.manual_submissions || [];
  const isPdfQuizSubmission = (s: any) =>
    s.type === 'pdf_quiz' || (typeof s.type === 'string' && s.type.startsWith('pdf_quiz'));
  const rawWorksheets = (student.manual_submissions || allManual).filter((s: any) => !isPdfQuizSubmission(s));

  // Deduplicate worksheets by topic_id + slot, keeping the latest/reviewed one
  const wsSlotMap = new Map<string, any>();
  rawWorksheets.forEach((sub: any) => {
    let slotKey = '0';
    if (typeof sub.type === 'string') {
      const match = sub.type.match(/^worksheet(?:_([a-zA-Z0-9_-]+))?$/);
      if (match && match[1] !== undefined) {
        slotKey = match[1];
      }
    }
    const dedupeKey = `${sub.topic_id || 'general'}_slot_${slotKey}`;
    const existing = wsSlotMap.get(dedupeKey);
    if (!existing) {
      wsSlotMap.set(dedupeKey, sub);
    } else {
      if (sub.status === 'reviewed' && existing.status !== 'reviewed') {
        wsSlotMap.set(dedupeKey, sub);
      } else if (sub.status === existing.status) {
        const timeA = new Date(sub.submitted_at || 0).getTime();
        const timeB = new Date(existing.submitted_at || 0).getTime();
        if (timeA > timeB) wsSlotMap.set(dedupeKey, sub);
      }
    }
  });
  const worksheets = Array.from(wsSlotMap.values());

  // Unified quizzes: if student.quiz_submissions already unified use it, otherwise merge any pdf_quiz from manual submissions
  let rawQuizzes = student.quiz_submissions || [];
  const pdfQuizzesInManual = allManual.filter(isPdfQuizSubmission);
  if (pdfQuizzesInManual.length > 0 && !rawQuizzes.some((q: any) => q.is_pdf_quiz)) {
    const formattedPdfQuizzes = pdfQuizzesInManual.map((pq: any) => {
      const quizIdSuffix = typeof pq.type === "string" && pq.type.startsWith("pdf_quiz_")
        ? pq.type.replace("pdf_quiz_", "")
        : null;
      return {
        id: pq.id,
        quiz_id: quizIdSuffix || pq.id,
        score: pq.score !== null && pq.score !== undefined ? Number(pq.score) : null,
        submitted_at: pq.submitted_at,
        is_pdf_quiz: true,
        feedback: pq.feedback_text || pq.feedback,
        status: pq.status,
        quizzes: {
          id: quizIdSuffix || pq.id,
          title: pq.topics?.title ? `${pq.topics.title} (PDF Quiz)` : 'PDF Quiz',
          total_marks: 100,
          passing_score: 50,
        }
      };
    });
    rawQuizzes = [...rawQuizzes, ...formattedPdfQuizzes];
  }

  // Deduplicate and group quizzes by unique quiz ID so multiple retakes count as 1 quiz
  const quizMap = new Map<string, any>();
  rawQuizzes.forEach((q: any) => {
    const qKey = q.is_pdf_quiz 
      ? `pdf_${q.quiz_id || q.id}`
      : `interactive_${q.quizzes?.id || q.quiz_id || q.id}`;
    
    const scoreVal = q.best_score !== null && q.best_score !== undefined 
      ? q.best_score 
      : (q.score !== null && q.score !== undefined ? Number(q.score) : null);
    
    const existing = quizMap.get(qKey);
    if (!existing) {
      quizMap.set(qKey, {
        ...q,
        score: scoreVal,
        best_score: scoreVal,
        attempts_count: q.attempts_count || (q.attempts ? q.attempts.length : 1),
      });
    } else {
      const existingScore = existing.best_score ?? existing.score;
      const isBetter = scoreVal !== null && (existingScore === null || scoreVal > existingScore);
      if (isBetter || (q.status === 'reviewed' && existing.status !== 'reviewed')) {
        quizMap.set(qKey, {
          ...q,
          score: scoreVal,
          best_score: isBetter ? scoreVal : existingScore,
          attempts_count: (existing.attempts_count || 1) + 1,
        });
      } else {
        existing.attempts_count = (existing.attempts_count || 1) + 1;
      }
    }
  });
  const quizzes = Array.from(quizMap.values());

  return (
    <Document title={`Academic_Report_${student.student_code || 'Student'}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>MICHAEL GAD MATH ACADEMY</Text>
            <Text style={styles.brandSubtitle}>Comprehensive Academic Progress & Evaluation Report</Text>
          </View>
          <View style={styles.reportBadge}>
            <Text style={styles.reportBadgeTitle}>STUDENT REPORT</Text>
            <Text style={styles.reportBadgeDate}>Date: {dateStr}</Text>
          </View>
        </View>

        {/* Student Profile Card */}
        <View style={styles.studentCard}>
          <View style={styles.infoCol}>
            <Text style={styles.studentName}>{student.full_name || student.email || 'Student'}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{student.email || 'N/A'}</Text>
            </View>
            {(student.student_whatsapp || student.parent_whatsapp) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact:</Text>
                <Text style={styles.infoValue}>
                  {student.student_whatsapp ? `Student: ${student.student_whatsapp}` : ''}
                  {student.parent_whatsapp ? ` | Parent: ${student.parent_whatsapp}` : ''}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
            {student.student_code && (
              <Text style={styles.codeTag}>CODE: {student.student_code}</Text>
            )}
            <View style={[styles.infoRow, { marginTop: 6 }]}>
              <Text style={styles.infoLabel}>Wallet Balance:</Text>
              <Text style={[styles.infoValue, { fontFamily: 'Helvetica-Bold', color: theme.primary }]}>
                ${(student.wallet_balance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Executive Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{enrollments.length}</Text>
            <Text style={styles.statLbl}>Courses Enrolled</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{completedLessons.length}</Text>
            <Text style={styles.statLbl}>Lessons Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{formatTime(totalStudyTimeSecs)}</Text>
            <Text style={styles.statLbl}>Total Study Time</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{worksheets.length}</Text>
            <Text style={styles.statLbl}>Worksheets Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{quizzes.length}</Text>
            <Text style={styles.statLbl}>Quizzes Attempted</Text>
          </View>
        </View>

        {/* Section 1: Enrolled Courses & Completion Progress */}
        <Text style={styles.sectionHeader}>Enrolled Courses & Progress</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 3 }]}>Course Name</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Completed / Total</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Progress %</Text>
          </View>
          {enrollments.length === 0 ? (
            <Text style={styles.emptyText}>No active course enrollments found.</Text>
          ) : (
            enrollments.map((enr: any, i: number) => {
              const course = enr.courses;
              if (!course) return null;
              const courseTopics = course.sections?.flatMap((sec: any) => sec.topics || []) || [];
              const completedIds = (student.topic_progress || [])
                .filter((tp: any) => tp.is_completed)
                .map((tp: any) => tp.topic_id);
              const { progressPercentage: pct, completedCount, totalCount: totalTopics } = calculateCourseProgress(courseTopics, completedIds);

              return (
                <View
                  key={enr.id || i}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>
                    {course.title}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'center' }]}>
                    {completedCount} / {totalTopics} lessons
                  </Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: theme.primary }]}>
                    {pct}%
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Section 2: Completed Lessons History */}
        {completedLessons.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionHeader}>Completed Lessons & Study History</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { flex: 3 }]}>Lesson / Topic</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Study Time</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Last Accessed</Text>
              </View>
              {completedLessons.map((tp: any, i: number) => (
                <View
                  key={tp.id || i}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>
                    {tp.topics?.title || 'Lesson Topic'}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'center' }]}>
                    {formatTime(tp.time_spent_seconds)}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: '#6B7280', fontSize: 7.5 }]}>
                    {tp.last_accessed_at ? new Date(tp.last_accessed_at).toLocaleDateString('en-GB') : 'N/A'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 3: Worksheet Submissions */}
        <View wrap={false}>
          <Text style={styles.sectionHeader}>Worksheet Submissions & Feedback</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 2.5 }]}>Topic / Worksheet</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Score</Text>
              <Text style={[styles.th, { flex: 2.5 }]}>Instructor Feedback</Text>
            </View>
            {worksheets.length === 0 ? (
              <Text style={styles.emptyText}>No worksheet submissions recorded yet.</Text>
            ) : (
              worksheets.map((sub: any, i: number) => {
                const topicTitle = sub.worksheet_title 
                  ? `${sub.topics?.title || 'Worksheet'} (${sub.worksheet_title})` 
                  : (sub.topics?.title || 'Worksheet Assignment');
                const isReviewed = sub.status === 'reviewed';
                const feedbackText = sub.feedback_text || sub.feedback;
                return (
                  <View
                    key={sub.id || i}
                    style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <Text style={[styles.td, { flex: 2.5 }]}>{topicTitle}</Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text
                        style={
                          isReviewed
                            ? styles.statusBadgeSuccess
                            : styles.statusBadgeWarning
                        }
                      >
                        {isReviewed ? 'REVIEWED' : 'PENDING'}
                      </Text>
                    </View>
                    <Text style={[styles.td, { flex: 1, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>
                      {sub.score !== null && sub.score !== undefined ? sub.score : 'N/A'}
                    </Text>
                    <Text style={[styles.td, { flex: 2.5, fontSize: 7.5, color: '#4B5563' }]}>
                      {feedbackText || (isReviewed ? 'Satisfactory completion' : 'Awaiting instructor review')}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Section 4: Quiz Evaluation & Performance */}
        <View wrap={false}>
          <Text style={styles.sectionHeader}>Quiz Evaluation & Performance</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 3 }]}>Quiz Title</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Score</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Result</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Date</Text>
            </View>
            {quizzes.length === 0 ? (
              <Text style={styles.emptyText}>No quiz attempts logged yet.</Text>
            ) : (
              quizzes.map((q: any, i: number) => {
                const attemptsCount = q.attempts_count || (q.attempts ? q.attempts.length : 1);
                const baseQuizTitle = q.quizzes?.title || q.quizzes?.topics?.title || 'Quiz Evaluation';
                const quizTitle = `${baseQuizTitle}${attemptsCount > 1 ? ` (${attemptsCount} attempts)` : ''}`;
                const totalMarks = q.quizzes?.total_marks || 100;
                const passingScore = q.quizzes?.passing_score;
                const scoreVal = q.score !== null && q.score !== undefined ? Number(q.score) : null;
                const scorePct = scoreVal !== null && totalMarks > 0 ? Math.round((scoreVal / totalMarks) * 100) : null;
                const isPassed = scoreVal !== null ? (passingScore != null ? scoreVal >= passingScore : (scorePct !== null && scorePct >= 50)) : false;
                const isPending = q.is_pdf_quiz && q.status === 'pending';
                const date = q.submitted_at
                  ? new Date(q.submitted_at).toLocaleDateString('en-GB')
                  : 'N/A';

                return (
                  <View
                    key={q.id || i}
                    style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <Text style={[styles.td, { flex: 3 }]}>{quizTitle}</Text>
                    <Text style={[styles.td, { flex: 1.5, textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>
                      {scoreVal !== null ? `${scoreVal} / ${totalMarks} (${scorePct}%)` : 'Pending'}
                    </Text>
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      {isPending ? (
                        <Text style={styles.statusBadgeWarning}>PENDING</Text>
                      ) : (
                        <Text
                          style={
                            isPassed
                              ? styles.statusBadgeSuccess
                              : styles.statusBadgeError
                          }
                        >
                          {isPassed ? 'PASSED' : 'FAILED'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: '#6B7280', fontSize: 7.5 }]}>
                      {date}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Teacher / Remarks Box */}
        {teacherNotes ? (
          <View style={styles.notesBox} wrap={false}>
            <Text style={styles.notesTitle}>INSTRUCTOR REMARKS & RECOMMENDATIONS</Text>
            <Text style={styles.notesText}>{teacherNotes}</Text>
          </View>
        ) : null}

        {/* Footer & Signature */}
        <View style={styles.footerContainer} wrap={false}>
          <View style={styles.signatureBlock}>
            <Text style={styles.teacherName}>Michael Gad</Text>
            <Text style={styles.teacherTitle}>Lead Math Instructor & Academy Founder</Text>
          </View>
          <Text style={styles.pageNumber}>Official Document • Michael Gad Math Academy</Text>
        </View>
      </Page>
    </Document>
  );
};
