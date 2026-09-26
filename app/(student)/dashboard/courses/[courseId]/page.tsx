"use client";

import { useState, useEffect } from "react";
import { 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  Lock, 
  ChevronDown,
  Menu,
  ChevronLeft,
  Loader2,
  Upload,
  X,
  ZoomIn,
  ShoppingCart,
  Server
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MathText from "@/components/MathText";
import VideoPlayer from "@/components/VideoPlayer";

function getCanvaQuizTotalMarks(rawCode?: string): number {
  if (!rawCode) return 0;
  const scoreMatch = rawCode.match(/id=["']score-display["'][^>]*>\s*\d+\s*\/\s*(\d+)/i) || rawCode.match(/0\s*\/\s*(\d+)/);
  if (scoreMatch && scoreMatch[1]) {
    const val = parseInt(scoreMatch[1], 10);
    if (val > 0) return val;
  }
  const qMatches = rawCode.match(/\{\s*q\s*:/g);
  if (qMatches && qMatches.length > 0) {
    return qMatches.length;
  }
  return 0;
}

export default function CoursePlayerPage({ params }: { params: { courseId: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedMirrorIndex, setSelectedMirrorIndex] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [manualSubmissions, setManualSubmissions] = useState<Record<string, any>>({});
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isUploadingWorksheet, setIsUploadingWorksheet] = useState<string | null>(null);
  const [isUploadingQuiz, setIsUploadingQuiz] = useState<string | null>(null);

  const [interactiveAnswers, setInteractiveAnswers] = useState<Record<number, number>>({});
  const [takingQuiz, setTakingQuiz] = useState<any>(null);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [purchasedSections, setPurchasedSections] = useState<Record<string, boolean>>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [buyingSection, setBuyingSection] = useState<string | null>(null);
  const [canvaQuizModal, setCanvaQuizModal] = useState<any>(null);
  const [canvaLiveScores, setCanvaLiveScores] = useState<Record<string, { score: number; total: number }>>({});

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CANVA_QUIZ_SCORE_UPDATE') {
        const { score, total } = e.data;
        if (canvaQuizModal?.id) {
          setCanvaLiveScores(prev => ({
            ...prev,
            [canvaQuizModal.id]: { score, total }
          }));
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [canvaQuizModal]);

  // Track video opens per server mirror
  useEffect(() => {
    if (!activeTopic || !sessionUser) return;
    const contentItems = activeTopic.content_items || [];
    const videoItems = contentItems.filter((i: any) => i.type === 'video' && (i.url || (Array.isArray(i.urls) && i.urls.some((u: string) => u))));
    const currentVideoItem = videoItems.length > 0 ? (videoItems[selectedVideoIndex] || videoItems[0]) : null;

    const rawUrls = currentVideoItem 
      ? (Array.isArray(currentVideoItem.urls) && currentVideoItem.urls.length > 0 ? currentVideoItem.urls : [currentVideoItem.url])
      : (activeTopic.youtube_url ? [activeTopic.youtube_url] : []);
    
    const activeUrls = rawUrls.filter((u: string) => u && typeof u === 'string' && u.trim().length > 0);
    if (activeUrls.length === 0) return;

    let autoAssignedIndex = 0;
    if (sessionUser?.id && activeUrls.length > 1) {
      let hash = 0;
      const uid = sessionUser.id;
      for (let i = 0; i < uid.length; i++) {
        hash = (hash << 5) - hash + uid.charCodeAt(i);
        hash |= 0;
      }
      autoAssignedIndex = Math.abs(hash) % activeUrls.length;
    }

    const currentMirrorIndex = selectedMirrorIndex !== null && selectedMirrorIndex < activeUrls.length
      ? selectedMirrorIndex
      : autoAssignedIndex;

    const currentVideoUrl = activeUrls[currentMirrorIndex] || activeUrls[0] || '';
    if (!currentVideoUrl) return;

    const contentItemId = currentVideoItem?.id || 'main_video';

    const trackOpen = async () => {
      try {
        await supabase.from('video_server_opens').insert({
          student_id: sessionUser.id,
          course_id: params.courseId,
          topic_id: activeTopic.id,
          content_item_id: contentItemId,
          server_index: currentMirrorIndex,
          server_url: currentVideoUrl
        });
      } catch (err) {
        console.error("Failed to track video server open:", err);
      }
    };

    trackOpen();
  }, [activeTopic?.id, selectedVideoIndex, selectedMirrorIndex, sessionUser?.id, params.courseId]);


  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // First verify enrollment
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }
        setSessionUser(session.user);

        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', session.user.id)
          .eq('course_id', params.courseId)
          .maybeSingle();

        if (!enrollment) {
          // Not enrolled, let's just log for now. In a real app we'd redirect.
          console.warn("Not enrolled in this course");
        }

        // Fetch manual submissions
        const { data: subData } = await supabase
          .from('manual_submissions')
          .select('*')
          .eq('student_id', session.user.id);
        
        if (subData) {
          const subMap: Record<string, any> = {};
          subData.forEach((sub: any) => {
            subMap[`${sub.topic_id}_${sub.type}`] = sub;
          });
          setManualSubmissions(subMap);
        }

        // Fetch course with sections and topics (flat queries to avoid PostgREST schema cache join issues)
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', params.courseId)
          .single();

        if (courseError || !courseData) {
          console.error("Error fetching course:", courseError);
          setIsLoading(false);
          return;
        }

        const { data: sectionsData } = await supabase
          .from('sections')
          .select('*')
          .eq('course_id', params.courseId)
          .order('order_index', { ascending: true });

        const sections = sectionsData || [];
        const sectionIds = sections.map((s: any) => s.id);

        let topics: any[] = [];
        if (sectionIds.length > 0) {
          const { data: tData } = await supabase
            .from('topics')
            .select('*')
            .in('section_id', sectionIds)
            .order('order_index', { ascending: true });
          topics = tData || [];
        }

        const topicIds = topics.map((t: any) => t.id);

        let pdfs: any[] = [];
        let quizzes: any[] = [];
        let quizSubs: any[] = [];
        let topicProg: any[] = [];

        if (topicIds.length > 0) {
          const [pdfsRes, quizzesRes, quizSubsRes, progRes] = await Promise.all([
            supabase.from('topic_pdfs').select('*').in('topic_id', topicIds),
            supabase.from('quizzes').select('*').in('topic_id', topicIds),
            supabase.from('quiz_submissions').select('*').eq('student_id', session.user.id),
            supabase.from('topic_progress').select('*').eq('student_id', session.user.id)
          ]);

          pdfs = pdfsRes.data || [];
          quizzes = quizzesRes.data || [];
          quizSubs = quizSubsRes.data || [];
          topicProg = progRes.data || [];
        }

        const progMap: Record<string, boolean> = {};

        topics.forEach((t: any) => {
          t.topic_pdfs = pdfs.filter((p: any) => p.topic_id === t.id);
          
          const tQuizzes = quizzes.filter((q: any) => q.topic_id === t.id);
          const tContentQuizzes = (t.content_items || []).filter((i: any) => i.type === 'quiz');

          tQuizzes.forEach((q: any, qIdx: number) => {
            q.quiz_submissions = quizSubs.filter((qs: any) => qs.quiz_id === q.id);
            const matchedCq = tContentQuizzes.find((cq: any) => 
              (cq.id && q.id && cq.id === q.id) ||
              (cq.quizPdfUrl && q.quiz_pdf_url && cq.quizPdfUrl === q.quiz_pdf_url) ||
              (cq.quizEmbedCode && q.embed_code && cq.quizEmbedCode === q.embed_code) ||
              (cq.title && q.settings?.title && cq.title === q.settings?.title)
            ) || tContentQuizzes[qIdx];

            q.title = q.settings?.title || matchedCq?.title || q.title || `Topic Quiz ${tQuizzes.length > 1 ? qIdx + 1 : ''}`.trim();
            q.answerPdfUrl = matchedCq?.answerPdfUrl || q.markscheme_pdf_url;
            q.answerVideoUrl = matchedCq?.answerVideoUrl;
          });
          t.quizzes = tQuizzes;

          const prog = topicProg.find((tp: any) => tp.topic_id === t.id);
          if (prog) {
            progMap[t.id] = prog.is_completed;
          }
        });

        sections.forEach((s: any) => {
          s.topics = topics.filter((t: any) => t.section_id === s.id);
        });

        setProgress(progMap);
        setCourse({ ...courseData, sections });

          // Fetch section purchases
          const { data: purchases } = await supabase
            .from('section_purchases')
            .select('section_id')
            .eq('student_id', session.user.id);
          if (purchases) {
            const pMap: Record<string, boolean> = {};
            purchases.forEach((p: any) => { pMap[p.section_id] = true; });
            setPurchasedSections(pMap);
          }

          // Fetch wallet balance
          const { data: prof } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', session.user.id)
            .single();
          setWalletBalance(prof?.wallet_balance || 0);
          
          // Open first section and set first topic active by default
          if (sections.length > 0) {
            setOpenSections({ [sections[0].id]: true });
            if (sections[0].topics && sections[0].topics.length > 0) {
              setActiveTopic(sections[0].topics[0]);
            }
          }
      } catch (err) {
        console.error("CoursePlayer fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [params.courseId]);

  // Timer Effect
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && takingQuiz && !quizResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && takingQuiz && !quizResult) {
      handleAutoSubmit();
    }
  }, [timeLeft, takingQuiz, quizResult]);

  const handleAutoSubmit = () => {
    // Calculate current score
    let correctCount = 0;
    shuffledQuestions.forEach((q: any, i: number) => {
      if (interactiveAnswers[i] === q.correctIndex) correctCount++;
    });
    handleQuizSubmit(takingQuiz.id, correctCount, interactiveAnswers);
    alert("Time is up! Your quiz has been submitted.");
  };

  const startQuiz = (quiz: any) => {
    let questions = [...(quiz.questions_data || [])];
    
    // Apply shuffling
    if (quiz.settings?.shuffle_questions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    if (quiz.settings?.shuffle_options) {
      questions = questions.map(q => {
        const optionsWithIndex = q.options.map((opt: string, idx: number) => ({ text: opt, originalIdx: idx }));
        const shuffled = optionsWithIndex.sort(() => Math.random() - 0.5);
        const newCorrectIdx = shuffled.findIndex((o: any) => o.originalIdx === q.correctIndex);
        return { ...q, options: shuffled.map((o: any) => o.text), correctIndex: newCorrectIdx };
      });
    }

    setShuffledQuestions(questions);
    setTakingQuiz(quiz);
    setInteractiveAnswers({});
    setQuizResult(null);
    if (quiz.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
      setQuizStartTime(Date.now());
    } else {
      setTimeLeft(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center flex-col">
        <h2 className="text-2xl font-bold mb-4">Course not found</h2>
        <Link href="/dashboard/courses" className="text-primary hover:underline">Back to My Courses</Link>
      </div>
    );
  }

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarkComplete = async (topicId: string) => {
    if (!sessionUser) return;
    const isComp = !progress[topicId];
    setProgress(p => ({ ...p, [topicId]: isComp }));
    const { error } = await supabase.from('topic_progress').upsert({
      student_id: sessionUser.id,
      topic_id: topicId,
      is_completed: isComp,
      last_accessed_at: new Date().toISOString()
    }, { onConflict: 'student_id,topic_id' });
    if (error) {
      console.error(error);
      alert("Failed to mark complete.");
    }
  };

  const handleQuizSubmit = async (quizId: string, interactiveScore: number, interactiveAnswers: any) => {
    if (!sessionUser) return;
    
    const { error } = await supabase.from('quiz_submissions').insert({
      student_id: sessionUser.id,
      quiz_id: quizId,
      score: interactiveScore,
      answers_data: interactiveAnswers
    });

    if (error) {
      alert("Error submitting quiz: " + error.message);
    } else {
      const total = shuffledQuestions.length;
      const pct = total > 0 ? Math.round((interactiveScore / total) * 100) : 0;
      const passed = interactiveScore >= ((takingQuiz.passing_score / 100) * total);
      setQuizResult({ score: interactiveScore, total, passed });

      // Notify admin about quiz completion
      await supabase.from('admin_notifications').insert({
        student_id: sessionUser.id,
        type: 'quiz_completed',
        title: `Quiz ${passed ? 'Passed' : 'Failed'}: ${activeTopic?.title || 'Unknown Topic'}`,
        message: `scored ${interactiveScore}/${total} (${pct}%)`,
        metadata: {
          quiz_id: quizId,
          course_id: params.courseId,
          topic_title: activeTopic?.title,
          score: interactiveScore,
          total,
          percentage: pct,
          passed
        }
      }).then(({ error: nErr }) => { if (nErr) console.error('Admin notify error:', nErr); });
    }
  };

  const handleWorksheetUpload = async (e: any, topicId: string, subType: string = 'worksheet', worksheetTitle?: string) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;
    
    setIsUploadingWorksheet(subType);
    try {
      const fileExt = file.name.split('.').pop();
      const safeSubType = subType.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${sessionUser.id}_${topicId}_${safeSubType}_${Date.now()}.${fileExt}`;
      const filePath = `worksheet_answers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-assets')
        .getPublicUrl(filePath);

      const finalUrl = publicUrl + `?t=${Date.now()}`;
      
      // Update manual submissions
      const { data: existing } = await supabase.from('manual_submissions')
         .select('id')
         .eq('student_id', sessionUser.id)
         .eq('topic_id', topicId)
         .eq('type', subType)
         .maybeSingle();

      if (existing) {
         await supabase.from('manual_submissions').update({ file_url: finalUrl, status: 'pending', submitted_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
         await supabase.from('manual_submissions').insert({
           student_id: sessionUser.id,
           topic_id: topicId,
           type: subType,
           file_url: finalUrl
         });
      }

      setManualSubmissions(prev => ({ 
        ...prev, 
        [`${topicId}_${subType}`]: { file_url: finalUrl, status: 'pending' },
        ...(subType.startsWith('worksheet') ? { [`${topicId}_worksheet`]: { file_url: finalUrl, status: 'pending' } } : {})
      }));

      // Notify admin about worksheet submission
      await supabase.from('admin_notifications').insert({
        student_id: sessionUser.id,
        type: 'worksheet_submitted',
        title: `Worksheet Submitted: ${worksheetTitle ? `${worksheetTitle} (${activeTopic?.title || ''})` : (activeTopic?.title || 'Unknown Topic')}`,
        message: 'uploaded worksheet answers for review',
        metadata: {
          course_id: params.courseId,
          topic_id: topicId,
          topic_title: activeTopic?.title,
          worksheet_title: worksheetTitle
        }
      }).then(({ error: nErr }) => { if (nErr) console.error('Admin notify error:', nErr); });

      alert("Worksheet answers uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error uploading worksheet: " + err.message);
    } finally {
      setIsUploadingWorksheet(null);
    }
  };

  const handlePdfQuizUpload = async (e: any, quizId: string, quizTitle?: string) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;
    
    setIsUploadingQuiz(quizId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `quiz-${sessionUser.id}-${quizId}-${Date.now()}.${fileExt}`;
      const filePath = `quiz_answers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-assets')
        .getPublicUrl(filePath);

      const finalUrl = publicUrl + `?t=${Date.now()}`;

      // Insert or update manual_submissions for PDF Quiz (per-quiz key with backward compatibility)
      const subType = `pdf_quiz_${quizId}`;
      const { data: existing } = await supabase.from('manual_submissions')
         .select('id')
         .eq('student_id', sessionUser.id)
         .eq('topic_id', activeTopic?.id)
         .in('type', [subType, 'pdf_quiz'])
         .maybeSingle();

      if (existing) {
         await supabase.from('manual_submissions').update({ file_url: finalUrl, status: 'pending', submitted_at: new Date().toISOString(), type: subType }).eq('id', existing.id);
      } else {
         await supabase.from('manual_submissions').insert({
           student_id: sessionUser.id,
           topic_id: activeTopic?.id,
           type: subType,
           file_url: finalUrl
         });
      }

      // We still insert into quiz_submissions so the UI knows it was submitted
      const { error: dbError } = await supabase.from('quiz_submissions').insert({
        student_id: sessionUser.id,
        quiz_id: quizId,
        score: 0,
        answers_data: { file_url: finalUrl, type: 'pdf_upload' }
      });

      if (dbError) throw dbError;

      // Notify admin about PDF quiz submission with specific quiz title
      await supabase.from('admin_notifications').insert({
        student_id: sessionUser.id,
        type: 'pdf_quiz_submitted',
        title: `Quiz Submitted: ${quizTitle || activeTopic?.title || 'Unknown Quiz'}`,
        message: `uploaded PDF quiz answers for ${quizTitle || 'Quiz'}`,
        metadata: {
          course_id: params.courseId,
          topic_id: activeTopic?.id,
          topic_title: activeTopic?.title,
          quiz_id: quizId,
          quiz_title: quizTitle
        }
      }).then(({ error: nErr }) => { if (nErr) console.error('Admin notify error:', nErr); });

      alert("Quiz answers uploaded successfully!");
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
      alert("Error uploading quiz answers: " + err.message);
    } finally {
      setIsUploadingQuiz(null);
    }
  };

  const moveToNextTopic = () => {
    if (!course || !activeTopic) return;
    let foundCurrent = false;
    for (const section of course.sections) {
      for (const topic of section.topics) {
        if (foundCurrent) {
          setActiveTopic(topic);
          setOpenSections(prev => ({ ...prev, [section.id]: true }));
          return;
        }
        if (topic.id === activeTopic.id) {
          foundCurrent = true;
        }
      }
    }
  };



  // Helper: purchase a section directly via Supabase client
  const purchaseSection = async (section: any) => {
    setBuyingSection(section.id);
    try {
      const price = section.price || 0;
      
      // Re-fetch latest wallet balance
      const { data: prof } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', sessionUser.id)
        .single();
      const currentBalance = prof?.wallet_balance || 0;
      
      if (currentBalance < price) {
        alert(`Not enough balance ($${currentBalance.toFixed(2)}). This section costs $${price.toFixed(2)}. Please top up your wallet.`);
        return;
      }

      const newBal = currentBalance - price;

      // Deduct from wallet
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBal })
        .eq('id', sessionUser.id);
      if (updErr) throw new Error('Balance update failed: ' + updErr.message);

      // Record purchase
      await supabase.from('section_purchases').insert({
        student_id: sessionUser.id,
        section_id: section.id,
        amount_paid: price,
      });

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        student_id: sessionUser.id,
        type: 'purchase',
        amount: price,
        description: `Purchased section: ${section.title}`,
      });

      setPurchasedSections(prev => ({ ...prev, [section.id]: true }));
      setWalletBalance(newBal);
    } catch (e: any) { alert(e.message); }
    finally { setBuyingSection(null); }
  };

  // Check if active topic belongs to a locked section
  const getActiveTopicSection = () => {
    if (!activeTopic || !course) return null;
    return (course.sections || []).find((s: any) => 
      (s.topics || []).some((t: any) => t.id === activeTopic.id)
    );
  };

  const activeSection = getActiveTopicSection();
  const activeSectionIdx = activeSection ? course?.sections.indexOf(activeSection) : 0;
  const isActiveTopicLocked = activeSection && activeSectionIdx > 0 && !purchasedSections[activeSection.id] && (activeSection.price || 0) > 0;


  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] md:min-h-screen relative overflow-hidden bg-background-alt">
      {/* Mobile/Tablet Backdrop for Syllabus Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content Sidebar */}
      <aside className={`
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0
        fixed inset-y-0 left-0 z-40 w-72 sm:w-80 shadow-2xl
        lg:relative lg:inset-auto lg:z-auto lg:shadow-none
        ${sidebarOpen ? 'translate-x-0 lg:w-72 xl:w-80' : '-translate-x-full lg:translate-x-0 lg:w-16'}
      `}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between h-14 shrink-0">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <Link href="/dashboard/courses" className="text-gray-400 hover:text-text shrink-0" title="Back to Courses">
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <h2 className="font-bold text-text truncate text-sm">{course.title}</h2>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="text-gray-400 hover:text-text p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                title="Close syllabus"
              >
                <X className="w-5 h-5 lg:hidden" />
                <ChevronLeft className="w-5 h-5 hidden lg:block" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="mx-auto text-gray-400 hover:text-text p-1" title="Open syllabus">
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            {(course.sections || []).map((section: any, sIdx: number) => {
              const isFreeSection = sIdx === 0;
              const isSectionUnlocked = isFreeSection || purchasedSections[section.id] || (section.price || 0) === 0;
              return (
              <div key={section.id} className="border-b border-gray-100">
                <div 
                  className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold text-sm text-text truncate">{section.title}</h3>
                    {!isSectionUnlocked && <Lock className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    {isFreeSection && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">FREE</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isFreeSection && !isSectionUnlocked && section.price > 0 && (
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">${section.price}</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSections[section.id] ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {openSections[section.id] && (
                  <div className="py-2">
                    {section.topics.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-gray-400">No topics in this section</p>
                    ) : (
                      section.topics.map((topic: any) => {
                        const isActive = activeTopic?.id === topic.id;
                        return (
                          <div 
                            key={topic.id}
                            onClick={() => {
                              setActiveTopic(topic);
                              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`px-4 py-2.5 border-l-4 flex items-start gap-3 cursor-pointer ${isActive ? 'bg-primary/5 border-primary' : 'hover:bg-gray-50 border-transparent'}`}
                          >
                            {!isSectionUnlocked ? (
                              <Lock className={`w-4 h-4 mt-0.5 flex-shrink-0 text-orange-400`} />
                            ) : (
                              <PlayCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${!isSectionUnlocked ? 'text-text/40' : isActive ? 'text-primary' : 'text-text'} truncate`}>{topic.title}</div>
                              {progress[topic.id] && <div className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</div>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-background-alt overflow-y-auto relative min-w-0 flex flex-col">
        {/* Top Navigation Bar inside Course Player */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text text-xs font-bold rounded-lg transition-colors shrink-0"
              title="Toggle syllabus sidebar"
            >
              <Menu className="w-4 h-4" />
              <span>Syllabus</span>
            </button>
            <div className="min-w-0">
              <div className="text-xs text-text/50 truncate flex items-center gap-1">
                <Link href="/dashboard/courses" className="hover:underline">My Courses</Link>
                <span>/</span>
                <span className="truncate">{course?.title}</span>
              </div>
              {activeTopic && (
                <h2 className="text-sm font-bold text-text truncate">{activeTopic.title}</h2>
              )}
            </div>
          </div>
          {activeTopic && progress[activeTopic.id] && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Completed</span>
            </span>
          )}
        </div>

        <div className="max-w-4xl mx-auto p-3 sm:p-5 md:p-8 w-full min-w-0">
          {/* Purchase Gate - shown when student clicks a topic in a locked section */}
          {isActiveTopicLocked && activeSection ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 max-w-md w-full">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-text mb-2">Section Locked</h2>
                <p className="text-text/60 mb-1">{activeSection.title}</p>
                <p className="text-sm text-text/40 mb-6">Purchase this section to unlock all its topics, videos, worksheets, and quizzes.</p>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text/60">Section price</span>
                    <span className="text-xl font-black text-primary">${activeSection.price || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text/60">Your wallet</span>
                    <span className={`text-sm font-bold ${walletBalance >= (activeSection.price || 0) ? 'text-green-600' : 'text-red-500'}`}>
                      ${walletBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {walletBalance >= (activeSection.price || 0) ? (
                  <button
                    onClick={() => purchaseSection(activeSection)}
                    disabled={buyingSection === activeSection.id}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 disabled:opacity-50 text-lg"
                  >
                    {buyingSection === activeSection.id ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Purchasing...</span>
                    ) : (
                      `Unlock for $${activeSection.price || 0}`
                    )}
                  </button>
                ) : (
                  <div>
                    <p className="text-sm text-red-500 font-medium mb-3">Insufficient balance. Please top up your wallet.</p>
                    <Link href="/dashboard/wallet" className="block w-full bg-text hover:bg-text/90 text-white font-bold py-4 rounded-xl text-center transition-colors">
                      Go to Wallet
                    </Link>
                  </div>
                )}
                
                <p className="text-[11px] text-text/30 mt-4">{activeSection.topics?.length || 0} topics included</p>
              </div>
            </div>
          ) : activeTopic ? (() => {
            const contentItems = activeTopic.content_items || [];
            const videoItems = contentItems.filter((i: any) => i.type === 'video' && (i.url || (Array.isArray(i.urls) && i.urls.some((u: string) => u))));
            const currentVideoItem = videoItems.length > 0 ? (videoItems[selectedVideoIndex] || videoItems[0]) : null;

            // Extract raw mirror URLs
            const rawUrls = currentVideoItem 
              ? (Array.isArray(currentVideoItem.urls) && currentVideoItem.urls.length > 0 ? currentVideoItem.urls : [currentVideoItem.url])
              : (activeTopic.youtube_url ? [activeTopic.youtube_url] : []);
            
            const activeUrls = rawUrls.filter((u: string) => u && typeof u === 'string' && u.trim().length > 0);

            // Compute student-assigned default mirror link based on sessionUser ID hash for load balancing
            let autoAssignedIndex = 0;
            if (sessionUser?.id && activeUrls.length > 1) {
              let hash = 0;
              const uid = sessionUser.id;
              for (let i = 0; i < uid.length; i++) {
                hash = (hash << 5) - hash + uid.charCodeAt(i);
                hash |= 0;
              }
              autoAssignedIndex = Math.abs(hash) % activeUrls.length;
            }

            const currentMirrorIndex = selectedMirrorIndex !== null && selectedMirrorIndex < activeUrls.length
              ? selectedMirrorIndex
              : autoAssignedIndex;

            const currentVideoUrl = activeUrls[currentMirrorIndex] || activeUrls[0] || '';

            // Extract all worksheets and notes (from content_items or legacy topic_pdfs)
            const contentWorksheets = contentItems.filter((i: any) => i.type === 'worksheet' && (i.url || i.file_url));
            const legacyWorksheets = (activeTopic.topic_pdfs || []).filter((p: any) => p.type === 'worksheet');
            const allWorksheets: any[] = contentWorksheets.length > 0 
              ? contentWorksheets 
              : legacyWorksheets.map((p: any, idx: number) => ({
                  id: p.id || `legacy_ws_${idx}`,
                  type: 'worksheet',
                  title: p.title || (legacyWorksheets.length > 1 ? `Worksheet ${idx + 1}` : 'Worksheet'),
                  url: p.file_url || p.url,
                  answerPdfUrl: p.answerPdfUrl,
                  answerVideoUrl: p.answerVideoUrl
                }));

            const contentNotes = contentItems.filter((i: any) => i.type === 'notes' && (i.url || i.file_url));
            const legacyNotes = (activeTopic.topic_pdfs || []).filter((p: any) => p.type === 'notes');
            const allNotes: any[] = contentNotes.length > 0 ? contentNotes : legacyNotes;

            // Extract all quizzes (from content_items and quizzes table)
            const contentQuizzes = contentItems.filter((i: any) => i.type === 'quiz');
            const rawDbQuizzes = activeTopic.quizzes || [];

            let allQuizzes: any[] = [];
            if (rawDbQuizzes.length > 0) {
              allQuizzes = rawDbQuizzes.map((dbQ: any, qIdx: number) => {
                const matchedCq = contentQuizzes.find((cq: any) => 
                  (cq.id && dbQ.id && cq.id === dbQ.id) ||
                  (cq.quizPdfUrl && dbQ.quiz_pdf_url && cq.quizPdfUrl === dbQ.quiz_pdf_url) ||
                  (cq.quizEmbedCode && dbQ.embed_code && cq.quizEmbedCode === dbQ.embed_code) ||
                  (cq.title && dbQ.settings?.title && cq.title === dbQ.settings?.title)
                ) || contentQuizzes[qIdx];

                const quizTitle = 
                  dbQ.title || 
                  dbQ.settings?.title || 
                  matchedCq?.title || 
                  contentQuizzes[qIdx]?.title || 
                  (rawDbQuizzes.length > 1 ? `Quiz ${qIdx + 1}` : 'Topic Quiz');

                return {
                  ...dbQ,
                  title: quizTitle,
                  quiz_pdf_url: dbQ.quiz_pdf_url || matchedCq?.quizPdfUrl || matchedCq?.url,
                  answerPdfUrl: matchedCq?.answerPdfUrl || dbQ.markscheme_pdf_url,
                  answerVideoUrl: matchedCq?.answerVideoUrl,
                  quizMode: matchedCq?.quizMode || (dbQ.questions_data && dbQ.questions_data.length > 0 ? 'manual' : (dbQ.embed_code ? 'canva' : 'upload_pdf'))
                };
              });
            } else if (contentQuizzes.length > 0) {
              allQuizzes = contentQuizzes.map((cq: any, qIdx: number) => ({
                id: cq.id || `quiz_${activeTopic.id}_${qIdx}`,
                topic_id: activeTopic.id,
                type: 'topic',
                title: cq.title || (contentQuizzes.length > 1 ? `Quiz ${qIdx + 1}` : 'Topic Quiz'),
                quiz_pdf_url: cq.quizPdfUrl || cq.url,
                markscheme_pdf_url: cq.answerPdfUrl,
                answerPdfUrl: cq.answerPdfUrl,
                answerVideoUrl: cq.answerVideoUrl,
                embed_code: cq.quizEmbedCode,
                questions_data: cq.quizQuestions,
                total_marks: (cq.quizQuestions && cq.quizQuestions.length) || 10,
                time_limit_minutes: parseInt(cq.quizTimeLimit) || null,
                passing_score: parseInt(cq.quizPassingScore) || 70,
                settings: {
                  title: cq.title,
                  shuffle_questions: cq.quizShuffleQuestions,
                  shuffle_options: cq.quizShuffleOptions,
                  embed_code: cq.quizEmbedCode
                },
                quiz_submissions: []
              }));
            }

            return (
            <>
              {/* TOPIC HEADER BAR */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    <span>{course?.title || 'Course Player'}</span>
                    <span>•</span>
                    <span>Topic Details</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight">{activeTopic.title}</h1>
                </div>
                <div>
                  {(() => {
                    let canComplete = true;
                    let lockReason = "";
                    
                    if (allWorksheets.length > 0) {
                      const allSubmitted = allWorksheets.every((ws: any, idx: number) => {
                        const subType = allWorksheets.length === 1 
                          ? 'worksheet' 
                          : (ws.id ? `worksheet_${ws.id}` : `worksheet_${idx}`);
                        const sub = manualSubmissions[`${activeTopic.id}_${subType}`]
                          || (idx === 0 ? manualSubmissions[`${activeTopic.id}_worksheet`] : null)
                          || manualSubmissions[`${activeTopic.id}_worksheet_${idx}`];
                        return !!sub;
                      });
                      if (!allSubmitted) {
                        canComplete = false;
                        lockReason = "upload all worksheet answers";
                      }
                    }

                    const hasQuiz = allQuizzes.length > 0;
                    if (hasQuiz && canComplete) {
                      const incompleteQuiz = allQuizzes.find((q: any) => !q.quiz_submissions || q.quiz_submissions.length === 0);
                      if (incompleteQuiz) {
                        canComplete = false;
                        lockReason = "complete all quizzes";
                      }
                    }

                    return (
                      <button 
                        onClick={() => {
                          if (!canComplete && !progress[activeTopic.id]) {
                            alert(`Please ${lockReason} to complete this topic.`);
                            return;
                          }
                          handleMarkComplete(activeTopic.id);
                          if (!progress[activeTopic.id] && canComplete) {
                            moveToNextTopic();
                          }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${progress[activeTopic.id] ? 'bg-green-100 text-green-700 hover:bg-green-200' : (!canComplete ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90')}`}
                      >
                        {!progress[activeTopic.id] && !canComplete ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} 
                        {progress[activeTopic.id] ? 'Completed' : 'Mark Topic Complete'}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* SESSION & LESSON VIDEOS CONTAINER */}
              <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-900 mb-8 space-y-6">
                
                {/* Big Bolder Video Header inside Player Box */}
                <div className="space-y-3 border-b border-slate-800/80 pb-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className={`px-3 py-1 text-white text-xs font-black rounded-lg uppercase tracking-wider shadow-sm ${selectedVideoIndex === 0 ? 'bg-primary' : (selectedVideoIndex === 1 ? 'bg-blue-600' : 'bg-purple-600')}`}>
                        {currentVideoItem?.title || (selectedVideoIndex === 0 ? '🍿 Core Concept Lesson' : (selectedVideoIndex === 1 ? '📚 Full Topic Lesson & Worked Examples' : '🎬 Step-by-Step Video Solution'))}
                      </span>
                    </div>

                    {/* Bandwidth Load Balancing / Server Mirror Selector */}
                    {activeUrls.length > 1 && (
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl text-xs border border-slate-800">
                        <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-bold text-gray-300">CDN Server Mirror:</span>
                        <div className="flex items-center gap-1">
                          {activeUrls.map((_url: string, mIdx: number) => {
                            const isAuto = mIdx === autoAssignedIndex;
                            const isSelected = mIdx === currentMirrorIndex;
                            return (
                              <button
                                key={mIdx}
                                onClick={() => setSelectedMirrorIndex(mIdx)}
                                className={`px-2.5 py-0.5 rounded-md font-bold transition-all text-[11px] ${
                                  isSelected
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                                }`}
                              >
                                Server {mIdx + 1}
                                {isAuto && <span className="text-[9px] opacity-75 ml-0.5">(Auto)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BIG VIDEO TITLE */}
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    {currentVideoItem?.title || (selectedVideoIndex === 0 ? `1. Core Concept Lesson: ${activeTopic.title}` : `2. Full Topic Lesson & Worked Examples: ${activeTopic.title}`)}
                  </h2>
                </div>

                {currentVideoUrl ? (
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
                    <VideoPlayer url={currentVideoUrl} />
                  </div>
                ) : null}

                {/* Integrated Video Playlist Strip */}
                {videoItems.length > 1 && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-primary" />
                      Topic Lesson Videos ({videoItems.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoItems.map((vid: any, idx: number) => {
                        const isSelected = selectedVideoIndex === idx;
                        const defaultLabel = idx === 0 ? '1. Core Concept Lesson' : (idx === 1 ? '2. Full Topic Lesson & Worked Examples' : `3. Video Solution Breakdown ${idx + 1}`);
                        const displayLabel = vid.title || defaultLabel;
                        return (
                          <button
                            key={vid.id || idx}
                            onClick={() => {
                              setSelectedVideoIndex(idx);
                              setSelectedMirrorIndex(null);
                            }}
                            className={`p-4 rounded-2xl text-left transition-all flex items-center gap-3.5 ${
                              isSelected
                                ? 'bg-slate-900 border-2 border-primary shadow-md'
                                : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-gray-400'}`}>
                              {idx === 0 ? '🍿' : (idx === 1 ? '📚' : '🎬')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm font-extrabold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {displayLabel}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                <span className={isSelected ? 'text-primary font-bold' : 'text-gray-400'}>
                                  {isSelected ? 'Currently Watching' : 'Click to Play'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* HOMEWORK PLACE CONTAINER */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm space-y-6 mb-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20">
                      📄
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-text">Homework Place</h2>
                      <p className="text-xs text-text/60">
                        {allWorksheets.length > 1 
                          ? `${allWorksheets.length} Worksheets assigned for this topic` 
                          : 'Worksheet PDF download, student submission, & teacher score/feedback'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lesson Notes if any */}
                {allNotes.length > 0 && (
                  <div className="flex items-center justify-between gap-3 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">📒</span>
                      <div>
                        <div className="text-xs font-bold text-blue-950">Topic Study Notes</div>
                        <div className="text-[10px] text-blue-600">Download reference notes and summaries</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {allNotes.map((note: any, nIdx: number) => (
                        <a
                          key={note.id || nIdx}
                          href={note.url || note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-white text-blue-800 border border-blue-200 hover:bg-blue-100/50 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>{note.title || `Notes ${nIdx + 1}`}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Worksheets List: Render dedicated 2-column card for EACH worksheet */}
                {allWorksheets.length > 0 ? (
                  <div className="space-y-6">
                    {allWorksheets.map((ws: any, wsIdx: number) => {
                      const subType = allWorksheets.length === 1 
                        ? 'worksheet' 
                        : (ws.id ? `worksheet_${ws.id}` : `worksheet_${wsIdx}`);
                      
                      const sub = manualSubmissions[`${activeTopic.id}_${subType}`]
                        || (wsIdx === 0 ? manualSubmissions[`${activeTopic.id}_worksheet`] : null)
                        || manualSubmissions[`${activeTopic.id}_worksheet_${wsIdx}`];
                      
                      const wsTitle = ws.title || (allWorksheets.length > 1 ? `Homework ${wsIdx + 1}` : 'Topic Homework');
                      const isUploadingThis = isUploadingWorksheet === subType;

                      return (
                        <div key={ws.id || wsIdx} className="space-y-4 pt-5 first:pt-0 border-t first:border-t-0 border-gray-100">
                          {allWorksheets.length > 1 && (
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                                  {wsIdx + 1}
                                </span>
                                <h3 className="text-base font-bold text-text">{wsTitle}</h3>
                              </div>
                              {sub && (
                                <span className={`px-2.5 py-0.5 font-bold text-xs rounded-full ${sub.status === 'reviewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                                  {sub.status === 'reviewed' ? `Graded ${sub.score !== null && sub.score !== undefined ? `(${sub.score})` : ''}` : 'Pending Review'}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Box 1: Download & Upload for this worksheet */}
                            <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-extrabold text-text/40 uppercase tracking-wider mb-3">Step 1 & 2: Worksheet & Submission</div>
                                
                                {/* Download this specific worksheet */}
                                <a 
                                  href={ws.url || ws.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-3 px-4 bg-white border border-gray-200 hover:border-orange-400 rounded-xl font-bold text-xs text-text shadow-sm transition-all flex items-center justify-between group mb-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-orange-500" />
                                    <span>Download {wsTitle}</span>
                                  </div>
                                  <span className="text-[10px] text-text/40 group-hover:text-orange-500 font-medium">Download →</span>
                                </a>

                                {/* Upload Status Card for this worksheet */}
                                {sub ? (
                                  <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold text-[10px]">PDF</div>
                                      <div className="truncate">
                                        <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-text hover:underline truncate block">
                                          View Uploaded Homework PDF
                                        </a>
                                        <span className="text-[10px] text-text/40 block">Submitted for Grading</span>
                                      </div>
                                    </div>
                                    {sub.status !== 'reviewed' && (
                                      <label className="cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg bg-gray-50">
                                        {isUploadingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleWorksheetUpload(e, activeTopic.id, subType, wsTitle)} disabled={isUploadingThis} />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center bg-white hover:border-primary/50 transition-colors">
                                    <Upload className="w-6 h-6 text-text/40 mx-auto mb-2" />
                                    <div className="text-xs font-bold text-text">Upload Your Answer PDF for {wsTitle}</div>
                                    <p className="text-[10px] text-text/50 mt-0.5 mb-3">Upload your completed handwritten solution</p>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm">
                                      <Upload className="w-3.5 h-3.5" /> Select PDF File
                                      <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleWorksheetUpload(e, activeTopic.id, subType, wsTitle)} disabled={isUploadingThis} />
                                    </label>
                                    {isUploadingThis && <span className="text-xs text-text/50 flex items-center justify-center gap-1 mt-2"><Loader2 className="w-3 h-3 animate-spin"/> Uploading...</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Box 2: Teacher Grading Feedback for this worksheet */}
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Step 3: Teacher Review</span>
                                  {sub?.score !== undefined && sub?.score !== null && (
                                    <span className="text-xs font-black text-primary bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                      Score: {sub.score}
                                    </span>
                                  )}
                                </div>
                                {sub?.status === 'reviewed' ? (
                                  <div className="space-y-3">
                                    <p className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-emerald-100 italic">
                                      "{sub.feedback_text || 'No written feedback provided.'}"
                                    </p>
                                    {sub.feedback_file_url && (
                                      <a 
                                        href={sub.feedback_file_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                      >
                                        <FileText className="w-4 h-4" /> Download Corrected PDF File
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-text/60 italic bg-white p-3 rounded-xl border border-emerald-100/60">
                                    {sub ? 'Your submission is being reviewed by Michael Gad. Feedback and scores will appear here.' : 'Submit your worksheet PDF to receive personalized teacher feedback.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Model Answer for this worksheet */}
                          {sub && (ws.answerPdfUrl || ws.answerVideoUrl) && (
                            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">📝</span>
                                <div>
                                  <div className="text-xs font-bold text-teal-950">Official Model Answers: {wsTitle}</div>
                                  <div className="text-[10px] text-teal-700">Unlocked after homework submission</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                {ws.answerPdfUrl && (
                                  <a 
                                    href={ws.answerPdfUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 bg-white text-teal-800 border border-teal-200 hover:bg-teal-100/50 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> Answer Sheet PDF
                                  </a>
                                )}
                                {ws.answerVideoUrl && (
                                  <a 
                                    href={ws.answerVideoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" /> Video Solution Breakdown
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text/40 italic">No worksheets assigned for this topic.</p>
                )}
              </div>

                {allQuizzes && allQuizzes.length > 0 && (
                  <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm space-y-6 mb-8">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-purple-600/20">
                        ✍️
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-text">Topic Quiz Hub</h2>
                        <p className="text-xs text-text/50">Test your understanding with instant auto-graded quizzes</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {allQuizzes.map((quiz: any, qIdx: number) => {
                        const rawSubmissions = Array.isArray(quiz.quiz_submissions) 
                          ? quiz.quiz_submissions 
                          : (quiz.quiz_submissions ? [quiz.quiz_submissions] : []);
                        const submission = rawSubmissions.length > 0 
                          ? [...rawSubmissions].sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] 
                          : null;
                        const hasQuestions = quiz.questions_data && quiz.questions_data.length > 0;
                        const isCanvaQuiz = !!(quiz.embed_code || quiz.settings?.embed_code);
                        const rawEmbed = quiz.embed_code || quiz.settings?.embed_code || activeTopic?.quizEmbedCode || '';
                        const actualTotalMarks = isCanvaQuiz 
                          ? (getCanvaQuizTotalMarks(rawEmbed) || (quiz.total_marks && quiz.total_marks > 1 ? quiz.total_marks : 8))
                          : (hasQuestions ? quiz.questions_data.length : (quiz.total_marks || 0));
                        const quizTitle = quiz.title || (allQuizzes.length > 1 ? `Quiz ${qIdx + 1}` : 'Topic Quiz');

                        if (takingQuiz && takingQuiz.id === quiz.id) {
                          // Interactive Quiz UI
                          return (
                            <div key={quiz.id}>
                              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-bold text-lg text-text">Taking: {quizTitle}</h4>
                                    <p className="text-sm text-text/60">{(quiz.questions_data || []).length} Questions</p>
                                  </div>
                                </div>
                              </div>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-text">{activeTopic.title}: {quizTitle}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text/60">Passing Score: {takingQuiz.passing_score || 70}%</span>
                  {timeLeft !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-text/70'}`}>
                      Time Left: {formatTime(timeLeft)}
                    </span>
                  )}
                </div>
              </div>
              {!quizResult && (
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to exit? Your progress will be lost.")) {
                      setTakingQuiz(null);
                      setInteractiveAnswers({});
                      setTimeLeft(null);
                    }
                  }} 
                  className="text-text/50 hover:text-text"
                >
                  Cancel
                </button>
              )}
              {quizResult && (
                 <button onClick={() => window.location.reload()} className="text-primary font-bold">Close & Save</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              {quizResult ? (
                /* Result View */
                <div className="space-y-8 pb-10">
                  <div className={`p-8 rounded-2xl text-center border-2 ${quizResult.passed ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="text-4xl font-black mb-2 tracking-tight">
                      {quizResult.score} / {quizResult.total}
                    </div>
                    <div className={`text-sm font-bold uppercase tracking-wider ${quizResult.passed ? 'text-green-600' : 'text-orange-600'}`}>
                      {quizResult.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                    </div>
                    <p className="text-xs text-text/60 mt-2">
                      {quizResult.passed ? 'Great job! You have mastered this topic.' : `You need at least ${Math.ceil((takingQuiz.passing_score/100)*quizResult.total)} correct answers to pass.`}
                    </p>
                  </div>

                  {/* Model Answer for MCQ Quiz - shown after submission */}
                  {(() => {
                    const quizItem = contentItems.find((i: any) => i.type === 'quiz');
                    const hasAnswerPdf = quizItem?.answerPdfUrl;
                    const hasAnswerVideo = quizItem?.answerVideoUrl;
                    if (!hasAnswerPdf && !hasAnswerVideo) return null;
                    return (
                      <div className="p-5 bg-teal-50 rounded-2xl border border-teal-200 space-y-4">
                        <h5 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-2">
                          📝 Model Answer
                        </h5>
                        {hasAnswerPdf && (
                          <a 
                            href={quizItem.answerPdfUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-teal-200 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-50 transition-colors shadow-sm"
                          >
                            <FileText className="w-4 h-4" /> View Mark Scheme / Answer Sheet
                          </a>
                        )}
                        {hasAnswerVideo && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-teal-800/70">Answer Video Explanation</label>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                              <VideoPlayer url={quizItem.answerVideoUrl} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-6">
                    <h3 className="font-bold text-text flex items-center gap-2">
                      Review Questions
                    </h3>
                    {shuffledQuestions.map((q: any, i: number) => {
                      const studentIdx = interactiveAnswers[i];
                      const isCorrect = studentIdx === q.correctIndex;
                      return (
                        <div key={i} className={`bg-white p-5 rounded-2xl border-2 ${isCorrect ? 'border-green-100' : 'border-red-100'} shadow-sm`}>
                          <div className="flex items-start gap-3 mb-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              {q.question && <div className="font-bold text-text leading-snug mb-2"><MathText text={q.question} block /></div>}
                              {q.imageUrl && (
                                <button onClick={() => setLightboxImage(q.imageUrl)} className="group relative cursor-zoom-in">
                                  <img src={q.imageUrl} alt={`Question ${i + 1}`} className="max-h-48 rounded-md border border-gray-100 object-contain transition-opacity group-hover:opacity-80" />
                                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn className="w-6 h-6 text-white drop-shadow-lg" /></span>
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            {q.options.map((opt: string, optIdx: number) => (
                              <div 
                                key={optIdx} 
                                className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
                                  optIdx === q.correctIndex ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 
                                  optIdx === studentIdx ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-100 text-text/50'
                                }`}
                              >
                                <MathText text={opt} />
                                {optIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                              <p className="text-[10px] uppercase font-bold text-primary/50 mb-1">Explanation</p>
                              <div className="text-sm text-text/80 leading-relaxed italic"><MathText text={q.explanation} block /></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Question List */
                <div className="space-y-8 pb-10">
                  {shuffledQuestions.map((q: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="font-bold text-primary text-lg shrink-0">Q{i + 1}.</span> 
                        <div className="flex-1">
                          {q.question && <div className="font-bold text-text text-lg mb-2"><MathText text={q.question} block /></div>}
                          {q.imageUrl && (
                            <button onClick={() => setLightboxImage(q.imageUrl)} className="group relative cursor-zoom-in">
                              <img src={q.imageUrl} alt={`Question ${i + 1}`} className="max-h-64 rounded-xl border border-gray-100 object-contain transition-opacity group-hover:opacity-80" />
                              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn className="w-6 h-6 text-white drop-shadow-lg" /></span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: string, optIndex: number) => (
                          <button 
                            key={optIndex}
                            onClick={() => setInteractiveAnswers(p => ({ ...p, [i]: optIndex }))}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              interactiveAnswers[i] === optIndex 
                                ? 'border-primary bg-primary/5 text-primary font-bold' 
                                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 text-text/70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${
                                interactiveAnswers[i] === optIndex ? 'border-primary bg-primary text-white' : 'border-gray-300'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <MathText text={opt} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!quizResult && (
              <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex justify-end shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <button 
                  onClick={() => {
                    // Calculate score
                    let correctCount = 0;
                    shuffledQuestions.forEach((q: any, i: number) => {
                      if (interactiveAnswers[i] === q.correctIndex) correctCount++;
                    });
                    handleQuizSubmit(takingQuiz.id, correctCount, interactiveAnswers);
                  }}
                  disabled={Object.keys(interactiveAnswers).length !== shuffledQuestions.length}
                  className="px-10 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg hover:shadow-primary/25 disabled:shadow-none uppercase tracking-widest text-sm"
                >
                  Submit Quiz
                </button>
              </div>
            )}
          </div>
        </div>
                            </div>
                          );
                        }

                        const quizManualSub = manualSubmissions[`${activeTopic.id}_pdf_quiz_${quiz.id}`] || (qIdx === 0 ? manualSubmissions[`${activeTopic.id}_pdf_quiz`] : null);

                        return (
                          <div key={quiz.id} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* Box 1: Questions & Attempt/Submission */}
                              <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-extrabold text-text/40 uppercase tracking-wider">
                                      Step 1 & 2: Quiz & Submission
                                    </div>
                                    <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                                      {isCanvaQuiz ? 'Interactive Canva' : (hasQuestions ? 'Interactive MCQ' : 'Past Paper Quiz')}
                                    </span>
                                  </div>

                                  {/* Custom Quiz Title */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base md:text-lg font-black text-text tracking-tight">
                                      {quizTitle}
                                    </h3>
                                  </div>
                                  <div className="text-xs font-semibold text-text/50 mb-4 flex items-center gap-2 flex-wrap">
                                    <span>Total Marks: {actualTotalMarks}</span>
                                    {quiz.time_limit_minutes && (
                                      <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-bold">⏱️ {quiz.time_limit_minutes} mins</span>
                                    )}
                                    {quiz.passing_score && (
                                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">🎯 Pass: {quiz.passing_score}%</span>
                                    )}
                                  </div>

                                  {/* Download Quiz PDF button */}
                                  {quiz.quiz_pdf_url && (
                                    <a 
                                      href={quiz.quiz_pdf_url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="w-full py-3 px-4 bg-white border border-gray-200 hover:border-purple-400 rounded-xl font-bold text-xs text-text shadow-sm transition-all flex items-center justify-between group mb-4"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                                        <span className="truncate">Download {quizTitle} PDF</span>
                                      </div>
                                      <span className="text-[10px] text-text/40 group-hover:text-purple-600 font-medium shrink-0">Download →</span>
                                    </a>
                                  )}

                                  {/* Interactive / Canva Quiz Start Buttons */}
                                  {isCanvaQuiz ? (
                                    <button 
                                      onClick={() => setCanvaQuizModal(quiz)}
                                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                      <PlayCircle className="w-4 h-4" />
                                      {submission ? `Retake ${quizTitle}` : `Start ${quizTitle}`}
                                    </button>
                                  ) : hasQuestions ? (
                                    <button 
                                      onClick={() => startQuiz(quiz)} 
                                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                      <PlayCircle className="w-4 h-4" />
                                      {submission ? `Retake ${quizTitle}` : `Take ${quizTitle} Now`}
                                    </button>
                                  ) : (
                                    /* Past Paper PDF Quiz Answer Upload */
                                    <div>
                                      {submission && submission.answers_data?.file_url ? (
                                        <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-[10px]">PDF</div>
                                            <div className="truncate">
                                              <a href={submission.answers_data.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-text hover:underline truncate block">
                                                View Uploaded {quizTitle} Answers
                                              </a>
                                              <span className="text-[10px] text-text/40 block">Submitted for Grading</span>
                                            </div>
                                          </div>
                                          {quizManualSub?.status !== 'reviewed' && (
                                            <label className="cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg bg-gray-50 shrink-0">
                                              {isUploadingQuiz === quiz.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                                              <input type="file" className="hidden" accept=".pdf" onChange={(e) => handlePdfQuizUpload(e, quiz.id, quizTitle)} disabled={isUploadingQuiz === quiz.id} />
                                            </label>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center bg-white hover:border-purple-400/50 transition-colors">
                                          <Upload className="w-6 h-6 text-text/40 mx-auto mb-2" />
                                          <div className="text-xs font-bold text-text">Upload Your {quizTitle} Answer PDF</div>
                                          <p className="text-[10px] text-text/50 mt-0.5 mb-3">Upload your completed handwritten solution to be reviewed</p>
                                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm">
                                            <Upload className="w-3.5 h-3.5" /> Select PDF File
                                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => handlePdfQuizUpload(e, quiz.id, quizTitle)} disabled={isUploadingQuiz === quiz.id} />
                                          </label>
                                          {isUploadingQuiz === quiz.id && <span className="text-xs text-text/50 flex items-center justify-center gap-1 mt-2"><Loader2 className="w-3 h-3 animate-spin"/> Uploading...</span>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Box 2: Teacher Review & Result */}
                              <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-extrabold text-purple-800 uppercase tracking-wider">Step 3: Score & Review</span>
                                    {submission ? (
                                      <span className="text-xs font-black text-purple-700 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200 shadow-sm">
                                        Score: {submission.score} / {actualTotalMarks}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-bold text-text/40 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                                        Not Attempted
                                      </span>
                                    )}
                                  </div>

                                  {submission ? (
                                    <div className="space-y-3">
                                      <div className="bg-white p-3.5 rounded-xl border border-purple-100 space-y-1">
                                        <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                          {hasQuestions || isCanvaQuiz ? 'Quiz Completed & Graded' : 'Answers Submitted'}
                                        </div>
                                        <p className="text-xs text-text/70 italic">
                                          {quizManualSub?.feedback_text 
                                            || (submission.score >= actualTotalMarks * 0.7 ? 'Great job! Passing score achieved.' : 'Review your solutions or retake the quiz to improve your score.')}
                                        </p>
                                      </div>

                                      {quizManualSub?.feedback_file_url && (
                                        <a 
                                          href={quizManualSub.feedback_file_url} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                        >
                                          <FileText className="w-4 h-4" /> Download Corrected Quiz PDF
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-text/60 italic bg-white p-3.5 rounded-xl border border-purple-100/60">
                                      Complete and submit {quizTitle} to see your final score, teacher feedback, and solutions.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Model Answer / Mark Scheme (Unlocked after submission) */}
                            {submission && (quiz.answerPdfUrl || quiz.answerVideoUrl) && (
                              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl">📝</span>
                                  <div>
                                    <div className="text-xs font-bold text-teal-950">Official Model Answers: {quizTitle}</div>
                                    <div className="text-[10px] text-teal-700">Unlocked after quiz submission</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  {quiz.answerPdfUrl && (
                                    <a 
                                      href={quiz.answerPdfUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="px-3.5 py-1.5 bg-white text-teal-800 border border-teal-200 hover:bg-teal-100/50 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                                    >
                                      <FileText className="w-3.5 h-3.5" /> Mark Scheme PDF
                                    </a>
                                  )}
                                  {quiz.answerVideoUrl && (
                                    <a 
                                      href={quiz.answerVideoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3.5 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" /> Video Solution Breakdown
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </>
            );
          })() : (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center py-20">
              <h2 className="text-xl font-bold text-text mb-2">Select a topic</h2>
              <p className="text-text/60">Choose a lesson from the sidebar to begin.</p>
            </div>
          )}
        </div>
      </main>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Zoomed question" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Interactive Quiz Fullscreen Modal */}
      {canvaQuizModal && (() => {
        const rawCode = (canvaQuizModal.embed_code || canvaQuizModal.settings?.embed_code || '').trim();
        const isDirectUrl = rawCode.startsWith('http://') || rawCode.startsWith('https://');

        // Robust preparation helper for Canva AI HTML embeds
        const prepareSrcDoc = (html: string) => {
          if (!html) return '';
          
          const styleAndScriptInjection = `
            <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:wght@700;900&display=swap" rel="stylesheet">
            <style id="canva-exact-original-fix">
              html, body {
                background: linear-gradient(135deg, #1e1b4b 0%, #252262 50%, #1e1b4b 100%) !important;
                background-color: #1e1b4b !important;
                color: #ffffff !important;
                margin: 0 !important;
                padding: clamp(16px, 3vh, 32px) clamp(12px, 2vw, 24px) !important;
                min-height: 100vh !important;
                height: auto !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                box-sizing: border-box !important;
                font-family: 'DM Sans', system-ui, sans-serif !important;
              }
              * { box-sizing: border-box !important; }
              header { width: 100% !important; max-width: min(720px, 94vw) !important; text-align: center !important; margin-bottom: 2rem !important; }
              header h1, .heading-font, [data-template-id="quiz-title"] {
                font-family: 'Fraunces', Georgia, serif !important;
                color: #ffffff !important;
                font-size: clamp(1.75rem, 1.2rem + 1.5vw, 2.75rem) !important;
                font-weight: 900 !important;
                margin: 0 0 0.5rem 0 !important;
              }
              header p, [data-template-id="quiz-subtitle"] {
                color: #cbd5e1 !important;
                font-size: clamp(0.95rem, 0.85rem + 0.3vw, 1.15rem) !important;
                margin: 0 !important;
              }
              .canva-card, #quiz-card {
                background-color: #ffffff !important;
                color: #1e293b !important;
                border-radius: 1.25rem !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
                max-width: min(720px, 94vw) !important;
                width: 100% !important;
                padding: clamp(20px, 3.5vh, 32px) clamp(20px, 3.5vw, 32px) !important;
                box-sizing: border-box !important;
              }
              [data-template-id="question-label"] {
                color: #6366f1 !important;
                font-weight: 600 !important;
              }
              #score-display {
                color: #0f172a !important;
                font-weight: 700 !important;
              }
              .canva-card p, #quiz-card p, #question-text {
                color: #0f172a !important;
                font-size: clamp(1.05rem, 0.95rem + 0.4vw, 1.3rem) !important;
                font-weight: 500 !important;
              }
              /* Default Option Buttons */
              .opt-btn:not(.correct):not(.incorrect) {
                background-color: #ffffff !important;
                color: #1e293b !important;
                border: 2px solid #cbd5e1 !important;
                border-radius: 0.75rem !important;
                padding: 0.75rem 1rem !important;
                font-weight: 500 !important;
                transition: all 0.2s ease !important;
              }
              .opt-btn:not(.correct):not(.incorrect):hover:not(:disabled) {
                border-color: #818cf8 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
              }
              /* Correct Option Button -> GREEN */
              .correct, .opt-btn.correct, button.correct {
                background: #059669 !important;
                background-color: #059669 !important;
                color: #ffffff !important;
                border-color: #059669 !important;
                opacity: 1 !important;
              }
              .correct *, .opt-btn.correct *, button.correct * {
                color: #ffffff !important;
              }
              /* Incorrect Option Button -> RED */
              .incorrect, .opt-btn.incorrect, button.incorrect {
                background: #dc2626 !important;
                background-color: #dc2626 !important;
                color: #ffffff !important;
                border-color: #dc2626 !important;
                opacity: 1 !important;
              }
              .incorrect *, .opt-btn.incorrect *, button.incorrect * {
                color: #ffffff !important;
              }
              /* Next / Restart Buttons */
              .canva-button, #next-btn, #restart-btn {
                background-color: #4f46e5 !important;
                color: #ffffff !important;
                font-weight: 700 !important;
                border: none !important;
                border-radius: 0.75rem !important;
                padding: 12px 24px !important;
                min-height: 48px !important;
                font-size: 1.125rem !important;
                line-height: 1.5 !important;
                text-indent: 0 !important;
                text-align: center !important;
                overflow: visible !important;
                letter-spacing: normal !important;
                box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
                width: 100% !important;
                margin-top: 1.5rem !important;
                cursor: pointer !important;
              }
              .canva-button *, #next-btn *, #restart-btn * { 
                color: #ffffff !important; 
                font-size: inherit !important;
                visibility: visible !important;
              }
              .canva-button.hidden, #next-btn.hidden, #restart-btn.hidden, #results.hidden, #question-area.hidden, #score-bar.hidden {
                display: none !important;
              }
            </style>
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                function sendScoreToParent() {
                  var scoreText = '';
                  // Try multiple possible score element selectors
                  var candidates = [
                    document.getElementById('score-display'),
                    document.querySelector('[data-template-id="score-display"]'),
                    document.querySelector('.score-display'),
                    document.querySelector('#score-bar span'),
                    document.querySelector('#score-bar')
                  ];
                  for (var i = 0; i < candidates.length; i++) {
                    if (candidates[i]) {
                      var t = (candidates[i].textContent || candidates[i].innerText || '').trim();
                      if (t.match(/\d+\s*\/\s*\d+/)) { scoreText = t; break; }
                    }
                  }
                  // Fallback: search all elements for "X / Y" pattern
                  if (!scoreText) {
                    var allEls = document.querySelectorAll('span, div, p, h1, h2, h3, h4, h5, h6');
                    for (var j = 0; j < allEls.length; j++) {
                      var elText = (allEls[j].textContent || '').trim();
                      if (elText.match(/^\d+\s*\/\s*\d+$/) || elText.match(/^Score\s*:?\s*\d+\s*\/\s*\d+$/i)) {
                        scoreText = elText; break;
                      }
                    }
                  }
                  // Also try reading the score variable directly from window
                  if (!scoreText && typeof window.score !== 'undefined' && typeof window.questions !== 'undefined') {
                    scoreText = window.score + ' / ' + window.questions.length;
                  }
                  if (scoreText) {
                    var match = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
                    if (match) {
                      window.parent.postMessage({
                        type: 'CANVA_QUIZ_SCORE_UPDATE',
                        score: parseInt(match[1], 10),
                        total: parseInt(match[2], 10)
                      }, '*');
                    }
                  }
                }

                function fixCanvaOriginal() {
                  var nextBtn = document.getElementById('next-btn');
                  if (nextBtn) {
                    nextBtn.innerHTML = 'Next Question \\u2192';
                    nextBtn.style.color = '#ffffff';
                    nextBtn.style.fontSize = '1.125rem';
                    nextBtn.style.fontWeight = '700';
                    nextBtn.style.lineHeight = '1.5';
                    nextBtn.style.textIndent = '0';
                    nextBtn.style.letterSpacing = 'normal';
                    nextBtn.style.textAlign = 'center';
                    nextBtn.style.overflow = 'visible';
                  }
                  var restartBtn = document.getElementById('restart-btn');
                  if (restartBtn) {
                    restartBtn.innerHTML = 'Restart Quiz \\u21BA';
                    restartBtn.style.color = '#ffffff';
                    restartBtn.style.fontSize = '1.125rem';
                    restartBtn.style.fontWeight = '700';
                    restartBtn.style.lineHeight = '1.5';
                    restartBtn.style.textIndent = '0';
                    restartBtn.style.letterSpacing = 'normal';
                    restartBtn.style.textAlign = 'center';
                    restartBtn.style.overflow = 'visible';
                  }
                  var qLabel = document.querySelector('[data-template-id="question-label"]');
                  if (qLabel) {
                    qLabel.textContent = 'Score';
                  }
                  var qTitle = document.querySelector('[data-template-id="quiz-title"]');
                  if (qTitle && (!qTitle.textContent || !qTitle.textContent.trim())) {
                    qTitle.textContent = 'Quadratic Transformations';
                  }
                  var qSub = document.querySelector('[data-template-id="quiz-subtitle"]');
                  if (qSub && (!qSub.textContent || !qSub.textContent.trim())) {
                    qSub.textContent = 'Test your knowledge of parabola shifts, stretches & reflections';
                  }
                  sendScoreToParent();
                }

                fixCanvaOriginal();
                setTimeout(fixCanvaOriginal, 100);
                setTimeout(fixCanvaOriginal, 400);

                var observer = new MutationObserver(function() {
                  fixCanvaOriginal();
                  sendScoreToParent();
                });
                var card = document.getElementById('quiz-card') || document.body;
                if (card) observer.observe(card, { childList: true, subtree: true, characterData: true });

                document.addEventListener('click', function() {
                  setTimeout(sendScoreToParent, 50);
                });
              });
            </script>
          `;

          if (html.includes('</head>')) {
            return html.replace('</head>', `${styleAndScriptInjection}</head>`);
          } else if (html.includes('<body')) {
            return html.replace(/<body([^>]*)>/i, `<head>${styleAndScriptInjection}</head><body$1>`);
          }
          return `<!DOCTYPE html><html><head>${styleAndScriptInjection}</head><body>${html}</body></html>`;
        };

        const formattedHtml = isDirectUrl ? '' : prepareSrcDoc(rawCode);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-text text-base sm:text-lg truncate">{canvaQuizModal.title || `${activeTopic?.title || 'Quiz'}: Quiz`}</h3>
                    <p className="text-xs text-text/60 truncate">Complete the interactive questions below</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCanvaQuizModal(null)} 
                  className="text-text/50 hover:text-text p-2 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-[#1e1b4b] p-0 relative overflow-hidden min-h-0">
                {isDirectUrl ? (
                  <iframe 
                    src={rawCode} 
                    className="w-full h-full border-0 bg-[#1e1b4b]"
                    title="Interactive Quiz"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                  />
                ) : (
                  <iframe 
                    srcDoc={formattedHtml} 
                    className="w-full h-full border-0 bg-[#1e1b4b]"
                    title="Interactive Quiz"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                  />
                )}
              </div>

              <div className="p-3 sm:p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-text/60 truncate">Interactive Quiz</span>
                <button 
                  onClick={async () => {
                    if (!sessionUser || !canvaQuizModal) return;
                    let liveScore = canvaLiveScores[canvaQuizModal.id];
                    const modalRaw = canvaQuizModal.embed_code || canvaQuizModal.settings?.embed_code || activeTopic?.quizEmbedCode || '';
                    const totalQuestionsCount = liveScore?.total || getCanvaQuizTotalMarks(modalRaw) || 8;

                    // If no postMessage score, try reading iframe DOM directly
                    if (!liveScore) {
                      try {
                        const iframeEl = document.querySelector('iframe[title="Interactive Quiz"]') as HTMLIFrameElement;
                        if (iframeEl?.contentDocument) {
                          const doc = iframeEl.contentDocument;
                          // Try reading score variable directly
                          const win = iframeEl.contentWindow as any;
                          if (win && typeof win.score !== 'undefined' && typeof win.questions !== 'undefined') {
                            liveScore = { score: Number(win.score), total: win.questions.length };
                          }
                          // Try reading score from DOM
                          if (!liveScore) {
                            const allEls = doc.querySelectorAll('span, div, p');
                            for (let k = 0; k < allEls.length; k++) {
                              const elText = (allEls[k].textContent || '').trim();
                              const m = elText.match(/^(\d+)\s*\/\s*(\d+)$/);
                              if (m) {
                                liveScore = { score: parseInt(m[1], 10), total: parseInt(m[2], 10) };
                                break;
                              }
                            }
                          }
                        }
                      } catch (e) {
                        console.log('Could not read iframe score:', e);
                      }
                    }

                    // Default to 0 if we still couldn't get the score
                    const scoreToSubmit = liveScore ? liveScore.score : 0;

                    const { error: subErr } = await supabase.from('quiz_submissions').insert({
                      student_id: sessionUser.id,
                      quiz_id: canvaQuizModal.id,
                      score: scoreToSubmit,
                      answers_data: { canva_quiz: true, total_marks: totalQuestionsCount }
                    });

                    if (subErr) {
                      console.error("Quiz submission error:", subErr);
                    } else {
                      if (!progress[activeTopic.id]) {
                        handleMarkComplete(activeTopic.id);
                      }
                    }

                    const { data: updatedCourse } = await supabase
                      .from('courses')
                      .select(`
                        *,
                        sections (
                          *,
                          topics (
                            *,
                            quizzes (*, quiz_submissions(*))
                          )
                        )
                      `)
                      .eq('id', params.courseId)
                      .single();

                    if (updatedCourse) {
                      setCourse(updatedCourse);
                      if (activeTopic) {
                        const refreshedTopic = updatedCourse.sections
                          ?.flatMap((s: any) => s.topics || [])
                          ?.find((t: any) => t.id === activeTopic.id);
                        if (refreshedTopic) setActiveTopic(refreshedTopic);
                      }
                    }

                    setCanvaQuizModal(null);
                  }}
                  className="px-4 sm:px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-md flex items-center gap-2 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Quiz as Completed
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
