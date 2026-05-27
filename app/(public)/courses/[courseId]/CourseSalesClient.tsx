"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayCircle, FileText, CheckCircle2, ChevronDown, ChevronUp, Star, Clock, Award, ShieldCheck, Video, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CourseSalesClient({ course }: { course: any }) {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [purchasedSections, setPurchasedSections] = useState<Record<string, boolean>>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [buyingSection, setBuyingSection] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndEnrollment = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        // Check if already enrolled
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', session.user.id)
          .eq('course_id', course.id)
          .maybeSingle();
        setIsEnrolled(!!enrollment);

        // Fetch purchased sections
        const { data: purchases } = await supabase
          .from('section_purchases')
          .select('section_id')
          .eq('student_id', session.user.id);
        if (purchases) {
          const map: Record<string, boolean> = {};
          purchases.forEach((p: any) => { map[p.section_id] = true; });
          setPurchasedSections(map);
        }

        // Fetch wallet balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', session.user.id)
          .single();
        setWalletBalance(profile?.wallet_balance || 0);
      }
      setIsCheckingAuth(false);
    };
    checkAuthAndEnrollment();
  }, [course.id]);

  const handleEnroll = async () => {
    if (!userId) {
      // Not logged in — send to login with redirect back here
      router.push(`/login?redirect=/courses/${course.id}`);
      return;
    }

    if (isEnrolled) {
      // Already enrolled — go to course player
      router.push(`/dashboard/courses/${course.id}`);
      return;
    }

    // Enroll the student
    setIsEnrolling(true);
    try {
      // Ensure profile exists (trigger may not have run on signup)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            role: user.email === 'mokai2008@gmail.com' ? 'admin' : 'student',
          });
        }
      }

      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: userId,
          course_id: course.id,
        });

      if (error && error.code !== '23505') { // 23505 is the unique_violation error code
        throw error;
      }

      setIsEnrolled(true);
      router.push(`/dashboard/courses/${course.id}`);
    } catch (err: any) {
      console.error('Enrollment error:', err);
      alert('Failed to enroll: ' + (err.message || 'Unknown error'));
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleBuySection = async (sectionId: string) => {
    if (!userId) { router.push(`/login?redirect=/courses/${course.id}`); return; }
    if (!isEnrolled) { alert('Please enroll in the course first.'); return; }
    setBuyingSection(sectionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');
      const res = await fetch('/api/purchase-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ sectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Insufficient wallet balance') {
          alert(`Not enough balance ($${data.balance.toFixed(2)}). Section costs $${data.price.toFixed(2)}. Please top up your wallet.`);
          router.push('/dashboard/wallet');
        } else { throw new Error(data.error); }
        return;
      }
      setPurchasedSections(prev => ({ ...prev, [sectionId]: true }));
      setWalletBalance(data.newBalance);
      alert('Section purchased successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setBuyingSection(null);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalTopics = course.sections?.reduce((acc: number, section: any) => acc + (section.topics?.length || 0), 0) || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-white py-16 md:py-24 relative overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span>Premium Math Course</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {course.title}
              </h1>
              <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-xl">
                {course.description || "Master the concepts, solve complex problems with ease, and prepare perfectly for your exams with Michael Gad's expert guidance."}
              </p>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">MG</div>
                  <div>
                    <div className="text-sm text-white/70">Instructor</div>
                    <div className="font-bold">Michael Gad</div>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-accent" />
                  <span className="font-medium">{totalTopics} Lessons</span>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black/20 flex items-center justify-center backdrop-blur-sm">
                    <Video className="w-20 h-20 text-white/40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Left Column - Syllabus */}
            <div className="lg:col-span-2 space-y-12">
              
              {/* What you'll learn */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-text mb-6">What you'll learn</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Master all foundational and advanced topics.",
                    "Access high-quality PDF notes and worksheets.",
                    "Auto-correcting quizzes to test your knowledge.",
                    "Step-by-step video solutions by Michael Gad."
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-text/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Syllabus Accordion */}
              <div>
                <h2 className="text-2xl font-bold text-text mb-6">Course Syllabus</h2>
                <div className="space-y-4">
                  {course.sections?.map((section: any, idx: number) => (
                    <div key={section.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-6 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-primary mb-1">Section {idx + 1}</span>
                          <span className="text-lg font-bold text-text">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-text/50 hidden sm:block">
                            {section.topics?.length || 0} topics
                          </span>
                          {openSections[section.id] ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      
                      {openSections[section.id] && (
                        <div className="divide-y divide-gray-100 border-t border-gray-100">
                          {section.topics?.length > 0 ? (
                            section.topics.map((topic: any, tIdx: number) => (
                              <div key={topic.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <PlayCircle className="w-5 h-5 text-primary/60" />
                                  <span className="text-text font-medium">{topic.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {idx === 0 ? (
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Free Intro</span>
                                  ) : section.price > 0 ? (
                                    <span className="text-xs font-bold text-text/60 bg-gray-100 px-2 py-1 rounded">${section.price}</span>
                                  ) : (
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Free</span>
                                  )}
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">Locked</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-text/50 text-sm">
                              Topics are being added to this section.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!course.sections || course.sections.length === 0) && (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-text/60">Syllabus is currently being built by the instructor.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
                <div className="lg:hidden aspect-video relative">
                   {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Video className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="p-8">
                  <div className="mb-2">
                    <span className="text-sm text-text/50 line-through mr-2">£{course.total_price}</span>
                    <span className="text-3xl font-black text-primary">FREE</span>
                  </div>
                  <p className="text-xs text-text/50 mb-6">Enroll free, purchase chapters from your wallet.</p>
                  
                  <button 
                    onClick={handleEnroll}
                    disabled={isEnrolling || isCheckingAuth}
                    className="block w-full bg-primary hover:bg-primary/90 text-white text-center py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all mb-4 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isEnrolling ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Enrolling...
                      </span>
                    ) : isEnrolled ? "Go to Course" : "Enroll Free"}
                  </button>
                  <p className="text-center text-xs text-text/50 font-medium mb-8">
                    {isEnrolled ? 'You are enrolled' : 'Free enrollment. First chapter is free.'}
                  </p>

                  <div className="space-y-4">
                    <div className="font-bold text-text mb-4">This course includes:</div>
                    {[
                      { icon: PlayCircle, text: "On-demand video lessons" },
                      { icon: FileText, text: "Downloadable PDF worksheets" },
                      { icon: ShieldCheck, text: "Auto-correcting mock quizzes" },
                      { icon: Award, text: "Certificate of completion" }
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <feature.icon className="w-5 h-5 text-primary/70 flex-shrink-0" />
                        <span className="text-sm text-text/80 font-medium">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}
