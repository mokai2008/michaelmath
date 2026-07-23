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
  ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MathText from "@/components/MathText";
import VideoPlayer from "@/components/VideoPlayer";

export default function CoursePlayerPage({ params }: { params: { courseId: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [manualSubmissions, setManualSubmissions] = useState<Record<string, any>>({});
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isUploadingWorksheet, setIsUploadingWorksheet] = useState(false);
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

        // Fetch course with sections and topics
        const { data: courseData, error } = await supabase
          .from('courses')
          .select(`
            *,
            sections (
              id, title, order_index, price,
              topics (
                id, title, order_index, youtube_url, 
                topic_pdfs (id, type, file_url),
                quizzes (*, quiz_submissions(*)),
                topic_progress (is_completed)
              )
            )
          `)
          .eq('id', params.courseId)
          .single();

        if (error) {
          console.error("Error fetching course:", error);
        }

        if (courseData) {
          // Sort sections and topics
          const progMap: Record<string, boolean> = {};
          const sections = courseData.sections || [];
          sections.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          sections.forEach((s: any) => {
            s.topics = s.topics || [];
            s.topics.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
            s.topics.forEach((t: any) => {
              t.topic_pdfs = t.topic_pdfs || [];
              t.quizzes = t.quizzes || [];
              if (t.topic_progress && t.topic_progress.length > 0) {
                progMap[t.id] = t.topic_progress[0].is_completed;
              }
            });
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

  const handleWorksheetUpload = async (e: any, topicId: string) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;
    
    setIsUploadingWorksheet(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionUser.id}_${topicId}.${fileExt}`;
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
         .eq('type', 'worksheet')
         .maybeSingle();

      if (existing) {
         await supabase.from('manual_submissions').update({ file_url: finalUrl, status: 'pending', submitted_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
         await supabase.from('manual_submissions').insert({
           student_id: sessionUser.id,
           topic_id: topicId,
           type: 'worksheet',
           file_url: finalUrl
         });
      }

      setManualSubmissions(prev => ({ ...prev, [`${topicId}_worksheet`]: { file_url: finalUrl, status: 'pending' } }));

      // Notify admin about worksheet submission
      await supabase.from('admin_notifications').insert({
        student_id: sessionUser.id,
        type: 'worksheet_submitted',
        title: `Worksheet Submitted: ${activeTopic?.title || 'Unknown Topic'}`,
        message: 'uploaded worksheet answers for review',
        metadata: {
          course_id: params.courseId,
          topic_id: topicId,
          topic_title: activeTopic?.title
        }
      }).then(({ error: nErr }) => { if (nErr) console.error('Admin notify error:', nErr); });

      alert("Worksheet answers uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error uploading worksheet: " + err.message);
    } finally {
      setIsUploadingWorksheet(false);
    }
  };

  const handlePdfQuizUpload = async (e: any, quizId: string) => {
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

      // Insert or update manual_submissions for PDF Quiz
      const { data: existing } = await supabase.from('manual_submissions')
         .select('id')
         .eq('student_id', sessionUser.id)
         .eq('topic_id', activeTopic?.id)
         .eq('type', 'pdf_quiz')
         .maybeSingle();

      if (existing) {
         await supabase.from('manual_submissions').update({ file_url: finalUrl, status: 'pending', submitted_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
         await supabase.from('manual_submissions').insert({
           student_id: sessionUser.id,
           topic_id: activeTopic?.id,
           type: 'pdf_quiz',
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

      // Notify admin about PDF quiz submission
      await supabase.from('admin_notifications').insert({
        student_id: sessionUser.id,
        type: 'pdf_quiz_submitted',
        title: `PDF Quiz Submitted: ${activeTopic?.title || 'Unknown Topic'}`,
        message: 'uploaded PDF quiz answers for review',
        metadata: {
          course_id: params.courseId,
          topic_id: activeTopic?.id,
          topic_title: activeTopic?.title,
          quiz_id: quizId
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
            return (
            <>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl mb-8 relative">
                <VideoPlayer url={activeTopic.youtube_url} />
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-text mb-4">{activeTopic.title}</h1>
                <p className="text-text/70 leading-relaxed mb-6">
                  {/* Topic description could go here if added to schema */}
                </p>
                <div className="flex flex-col gap-4 pt-6 border-t border-gray-100">
                  <div className="flex flex-wrap gap-4">
                    {activeTopic.topic_pdfs && activeTopic.topic_pdfs.map((pdf: any) => (
                      <a 
                        key={pdf.id}
                        href={pdf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text rounded-lg font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4" /> View {pdf.type === 'notes' ? 'Notes' : 'Worksheet'}
                      </a>
                    ))}
                    
                    {(() => {
                      let canComplete = true;
                      let lockReason = "";
                      
                      const worksheetSub = manualSubmissions[`${activeTopic.id}_worksheet`];
                      const hasWorksheet = activeTopic.topic_pdfs?.some((pdf: any) => pdf.type === 'worksheet');
                      if (hasWorksheet && !worksheetSub) {
                        canComplete = false;
                        lockReason = "upload worksheet answers";
                      }

                      const hasQuiz = activeTopic.quizzes && activeTopic.quizzes.length > 0;
                      if (hasQuiz && canComplete) {
                        const incompleteQuiz = activeTopic.quizzes.find((q: any) => !q.quiz_submissions || q.quiz_submissions.length === 0);
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
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ml-auto ${progress[activeTopic.id] ? 'bg-green-100 text-green-700 hover:bg-green-200' : (!canComplete ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90')}`}
                        >
                          {!progress[activeTopic.id] && !canComplete ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} 
                          {progress[activeTopic.id] ? 'Completed' : 'Mark as Complete'}
                        </button>
                      );
                    })()}
                  </div>

                  {activeTopic.topic_pdfs && activeTopic.topic_pdfs.some((pdf: any) => pdf.type === 'worksheet') && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mt-2">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h4 className="font-bold text-sm text-text">Worksheet Answers</h4>
                          <p className="text-xs text-text/60">Upload your answers as a PDF to complete this topic.</p>
                        </div>
                        {manualSubmissions[`${activeTopic.id}_worksheet`] ? (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <a href={manualSubmissions[`${activeTopic.id}_worksheet`].file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
                                <FileText className="w-4 h-4"/> View Submitted
                              </a>
                              <span className={`text-[10px] font-bold uppercase mt-1 ${manualSubmissions[`${activeTopic.id}_worksheet`].status === 'reviewed' ? 'text-green-600' : 'text-orange-500'}`}>
                                {manualSubmissions[`${activeTopic.id}_worksheet`].status === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                              </span>
                            </div>
                            {manualSubmissions[`${activeTopic.id}_worksheet`].status !== 'reviewed' && (
                              <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                Update File
                                <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleWorksheetUpload(e, activeTopic.id)} />
                              </label>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
                              <Upload className="w-4 h-4" /> Upload PDF
                              <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleWorksheetUpload(e, activeTopic.id)} disabled={isUploadingWorksheet} />
                            </label>
                            {isUploadingWorksheet && <span className="text-xs text-text/50 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Uploading...</span>}
                          </div>
                        )}
                      </div>
                      
                      {manualSubmissions[`${activeTopic.id}_worksheet`]?.status === 'reviewed' && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                          <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Admin Feedback</h5>
                          {manualSubmissions[`${activeTopic.id}_worksheet`].score !== null && (
                            <div className="mb-2 font-bold text-text">Score: <span className="text-primary">{manualSubmissions[`${activeTopic.id}_worksheet`].score}</span></div>
                          )}
                          <p className="text-sm text-text/80 mb-3">{manualSubmissions[`${activeTopic.id}_worksheet`].feedback_text || 'No written feedback provided.'}</p>
                          {manualSubmissions[`${activeTopic.id}_worksheet`].feedback_file_url && (
                            <a 
                              href={manualSubmissions[`${activeTopic.id}_worksheet`].feedback_file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-sm font-bold hover:bg-green-50 transition-colors shadow-sm"
                            >
                              <FileText className="w-4 h-4" /> Download Reviewed File
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {activeTopic.quizzes && activeTopic.quizzes.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <h3 className="font-bold text-lg text-text mb-1">Quizzes</h3>
                    <p className="text-sm text-text/50 mb-4">Quizzes created by your instructor</p>
                    <div className="space-y-4">
                      {(activeTopic.quizzes || []).map((quiz: any) => {
                        const rawSubmissions = Array.isArray(quiz.quiz_submissions) 
                          ? quiz.quiz_submissions 
                          : (quiz.quiz_submissions ? [quiz.quiz_submissions] : []);
                        const submission = rawSubmissions.length > 0 
                          ? [...rawSubmissions].sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] 
                          : null;
                        const hasQuestions = quiz.questions_data && quiz.questions_data.length > 0;
                        const isCanvaQuiz = !!(quiz.embed_code || quiz.settings?.embed_code);

                        if (takingQuiz && takingQuiz.id === quiz.id) {
                          // Interactive Quiz UI
                          return (
                            <div key={quiz.id}>
                              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-bold text-lg text-text">Taking Topic Quiz</h4>
                                    <p className="text-sm text-text/60">{(quiz.questions_data || []).length} Questions</p>
                                  </div>
                                </div>
                              </div>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-text">{activeTopic.title}: Quiz</h2>
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

                        return (
                          <div key={quiz.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-text flex items-center gap-2">
                                {isCanvaQuiz ? 'Interactive Quiz' : (hasQuestions ? 'Interactive MCQ Quiz' : 'Past Paper Quiz')}
                              </div>
                              <div className="text-sm text-text/60">{isCanvaQuiz ? `Total Marks: ${quiz.total_marks || 10}` : `Total Marks: ${quiz.total_marks}`}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {quiz.quiz_pdf_url && (
                                <a href={quiz.quiz_pdf_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-text shadow-sm">View PDF Questions</a>
                              )}
                              
                              <div className="flex items-center gap-2 ml-auto flex-wrap justify-end w-full md:w-auto mt-4 md:mt-0">
                                {submission && (
                                  <div className="flex flex-col gap-2 w-full md:w-auto mr-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      {hasQuestions || isCanvaQuiz ? (
                                        <span className="font-bold text-green-700">Score: {submission.score} / {quiz.total_marks || 10}</span>
                                      ) : (
                                        <span className="font-bold text-green-700">Answers Submitted</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {isCanvaQuiz ? (
                                  <button 
                                    onClick={() => setCanvaQuizModal(quiz)}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
                                  >
                                    {submission ? 'Retake Quiz' : 'Start Quiz'}
                                  </button>
                                ) : hasQuestions ? (
                                  <button onClick={() => startQuiz(quiz)} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm">
                                    {submission ? 'Retake Quiz' : 'Take Quiz Now'}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {submission && submission.answers_data?.file_url ? (
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                          <a href={submission.answers_data.file_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-text shadow-sm flex items-center gap-1">
                                            <FileText className="w-4 h-4"/> View Upload
                                          </a>
                                          {manualSubmissions[`${activeTopic.id}_pdf_quiz`] && (
                                            <span className={`text-[10px] font-bold uppercase mt-1 ${manualSubmissions[`${activeTopic.id}_pdf_quiz`].status === 'reviewed' ? 'text-green-600' : 'text-orange-500'}`}>
                                              {manualSubmissions[`${activeTopic.id}_pdf_quiz`].status === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                                            </span>
                                          )}
                                        </div>
                                        {manualSubmissions[`${activeTopic.id}_pdf_quiz`]?.status !== 'reviewed' && (
                                          <label className="cursor-pointer px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm">
                                            {isUploadingQuiz === quiz.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                            Re-upload
                                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => handlePdfQuizUpload(e, quiz.id)} disabled={isUploadingQuiz === quiz.id} />
                                          </label>
                                        )}
                                      </div>
                                    ) : (
                                      <label className="cursor-pointer px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm">
                                        {isUploadingQuiz === quiz.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                        Upload Answers
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handlePdfQuizUpload(e, quiz.id)} disabled={isUploadingQuiz === quiz.id} />
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {!hasQuestions && manualSubmissions[`${activeTopic.id}_pdf_quiz`]?.status === 'reviewed' && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 w-full">
                                  <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Admin Feedback</h5>
                                  {manualSubmissions[`${activeTopic.id}_pdf_quiz`].score !== null && (
                                    <div className="mb-2 font-bold text-text">Score: <span className="text-primary">{manualSubmissions[`${activeTopic.id}_pdf_quiz`].score}</span></div>
                                  )}
                                  <p className="text-sm text-text/80 mb-3">{manualSubmissions[`${activeTopic.id}_pdf_quiz`].feedback_text || 'No written feedback provided.'}</p>
                                  {manualSubmissions[`${activeTopic.id}_pdf_quiz`].feedback_file_url && (
                                    <a 
                                      href={manualSubmissions[`${activeTopic.id}_pdf_quiz`].feedback_file_url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-sm font-bold hover:bg-green-50 transition-colors shadow-sm"
                                    >
                                      <FileText className="w-4 h-4" /> Download Reviewed File
                                    </a>
                                  )}
                                </div>
                              )}

                              </div>
                            </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
            <style id="canva-ai-lms-fix">
              html, body {
                background: linear-gradient(135deg, #1e1b4b 0%, #252262 50%, #1e1b4b 100%) !important;
                background-color: #1e1b4b !important;
                color: #ffffff !important;
                margin: 0 !important;
                padding: 24px 16px !important;
                min-height: 100vh !important;
                height: auto !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                overflow-y: auto !important;
                box-sizing: border-box !important;
                font-family: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
              }
              * {
                box-sizing: border-box !important;
              }
              header h1, header p, .canva-text, [data-template-id="quiz-title"], [data-template-id="quiz-subtitle"] {
                color: #ffffff !important;
              }
              .canva-card, #quiz-card {
                background-color: #ffffff !important;
                color: #1e293b !important;
                border-radius: 1.25rem !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
                max-width: 760px !important;
                width: 100% !important;
              }
              .canva-card p, #quiz-card p, #question-text {
                color: #0f172a !important;
              }
              #score-display {
                color: #4f46e5 !important;
              }
              #score-bar span {
                color: #475569 !important;
              }
              #feedback {
                font-weight: 600 !important;
              }
              #feedback span {
                color: #475569 !important;
                font-weight: 500 !important;
              }
              .canva-button, #next-btn, #restart-btn, .opt-btn.canva-button {
                background-color: #4f46e5 !important;
                color: #ffffff !important;
                font-weight: 700 !important;
                border: none !important;
                border-radius: 0.75rem !important;
                padding: 12px 24px !important;
                min-height: 48px !important;
                font-size: 1.125rem !important;
                box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
                transition: all 0.2s ease !important;
                opacity: 1 !important;
                visibility: visible !important;
                display: inline-block !important;
                cursor: pointer !important;
              }
              .canva-button.hidden, #next-btn.hidden, #restart-btn.hidden, #results.hidden, #question-area.hidden, #score-bar.hidden {
                display: none !important;
              }
              .canva-button:hover:not(:disabled), #next-btn:hover:not(:disabled), #restart-btn:hover:not(:disabled) {
                background-color: #4338ca !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45) !important;
              }
              .canva-button *, #next-btn *, #restart-btn * {
                color: #ffffff !important;
              }
              .opt-btn:not(.canva-button) {
                border: 2px solid #cbd5e1 !important;
                color: #1e293b !important;
                background-color: #ffffff !important;
                font-weight: 500 !important;
              }
              .opt-btn:not(.canva-button):hover:not(:disabled) {
                border-color: #818cf8 !important;
                background-color: #f8fafc !important;
              }
              .correct {
                background-color: #059669 !important;
                color: #ffffff !important;
                border-color: #059669 !important;
              }
              .correct * { color: #ffffff !important; }
              .incorrect {
                background-color: #dc2626 !important;
                color: #ffffff !important;
                border-color: #dc2626 !important;
              }
              .incorrect * { color: #ffffff !important; }
            </style>
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                function fixCanvaTemplate() {
                  var nextBtn = document.getElementById('next-btn');
                  if (nextBtn && (!nextBtn.textContent || !nextBtn.textContent.trim())) {
                    nextBtn.textContent = 'Next Question →';
                  }
                  var restartBtn = document.getElementById('restart-btn');
                  if (restartBtn && (!restartBtn.textContent || !restartBtn.textContent.trim())) {
                    restartBtn.textContent = 'Restart Quiz ↺';
                  }
                  var qLabel = document.querySelector('[data-template-id="question-label"]');
                  if (qLabel && (!qLabel.textContent || !qLabel.textContent.trim())) {
                    qLabel.textContent = 'Question';
                  }
                  var qTitle = document.querySelector('[data-template-id="quiz-title"]');
                  if (qTitle && (!qTitle.textContent || !qTitle.textContent.trim())) {
                    qTitle.textContent = 'Quadratic Transformations';
                  }
                  var qSub = document.querySelector('[data-template-id="quiz-subtitle"]');
                  if (qSub && (!qSub.textContent || !qSub.textContent.trim())) {
                    qSub.textContent = 'Test your knowledge of parabola shifts, stretches & reflections';
                  }
                }
                fixCanvaTemplate();
                setTimeout(fixCanvaTemplate, 100);
                setTimeout(fixCanvaTemplate, 500);

                var observer = new MutationObserver(function() {
                  fixCanvaTemplate();
                  var fb = document.getElementById('feedback');
                  if (fb) {
                    var spans = fb.getElementsByTagName('span');
                    for (var i = 0; i < spans.length; i++) {
                      spans[i].style.setProperty('color', '#475569', 'important');
                    }
                  }
                });
                var card = document.getElementById('quiz-card') || document.body;
                if (card) observer.observe(card, { childList: true, subtree: true, characterData: true });
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
                    <h3 className="font-bold text-text text-base sm:text-lg truncate">{activeTopic?.title || 'Quiz'}: Quiz</h3>
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
                  onClick={() => {
                    handleQuizSubmit(canvaQuizModal.id, 10, {});
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
