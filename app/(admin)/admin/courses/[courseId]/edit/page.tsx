"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Plus, GripVertical, Settings, ChevronRight, Loader2, ArrowLeft, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminCourseEditor() {
  const { courseId } = useParams();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fieldId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      callback(data.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload: " + err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [coursePrice, setCoursePrice] = useState("0.00");
  const [courseKeywords, setCourseKeywords] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        // Fetch course
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (courseError) throw courseError;
        
        setCourseTitle(course.title);
        setCourseDescription(course.description || "");
        setCourseThumbnail(course.thumbnail_url || "");
        setCoursePrice(course.total_price?.toString() || "0.00");
        setCourseKeywords(course.keywords?.join(', ') || "");
        setIsPublished(course.is_published || false);

        // Fetch sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index');
          
        if (sectionsError) throw sectionsError;

        // Fetch topics and quizzes for each section
        const mappedSections = await Promise.all(sectionsData.map(async (sec) => {
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select(`
              *,
              topic_pdfs(*),
              quizzes(*)
            `)
            .eq('section_id', sec.id)
            .order('order_index');
            
          if (topicsError) throw topicsError;

          const mappedTopics = topicsData.map((topic) => {
            const notes = topic.topic_pdfs.find((p: any) => p.type === 'notes');
            const worksheet = topic.topic_pdfs.find((p: any) => p.type === 'worksheet');
              const mcqQuiz = topic.quizzes?.find((q: any) => q.questions_data && q.questions_data.length > 0);
              const pastPaperQuiz = topic.quizzes?.find((q: any) => q.quiz_pdf_url);

              return {
                id: topic.id,
                title: topic.title,
                isExpanded: false,
                youtubeUrl: topic.youtube_url || '',
                pdfNotesUrl: notes ? notes.file_url : '',
                pdfWorksheetUrl: worksheet ? worksheet.file_url : '',
                quizQuestions: mcqQuiz && mcqQuiz.questions_data ? mcqQuiz.questions_data.map((q: any) => ({ ...q, imageUrl: q.imageUrl || '' })) : [],
                quizTimeLimit: mcqQuiz?.time_limit_minutes || '',
                quizPassingScore: mcqQuiz?.passing_score || '70',
                quizShuffleQuestions: mcqQuiz?.settings?.shuffle_questions || false,
                quizShuffleOptions: mcqQuiz?.settings?.shuffle_options || false
              };
          });

          return {
            id: sec.id,
            title: sec.title,
            price: sec.price || 0,
            topics: mappedTopics
          };
        }));

        setSections(mappedSections);
      } catch (e: any) {
        console.error(e);
        alert("Error loading course: " + e.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const handleAddSection = () => {
    const newId = sections.length ? Math.max(...sections.map(s => typeof s.id === 'number' ? s.id : 0)) + 1 : 1;
    setSections([
      ...sections,
      { id: newId, title: `Section ${newId}: New Section`, price: 0, topics: [] }
    ]);
  };

  const handleAddTopic = (sectionId: string | number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newTopicId = section.topics.length ? Math.max(...section.topics.map((t: any) => typeof t.id === 'number' ? t.id : 0)) + 1 : 1;
        return {
          ...section,
          topics: [...section.topics, { 
            id: newTopicId, 
            title: `Topic ${newTopicId}: New Topic`,
            isExpanded: true,
            youtubeUrl: '',
            pdfNotesUrl: '',
            pdfWorksheetUrl: '',
            quizQuestions: [],
            quizTimeLimit: '',
            quizPassingScore: '70',
            quizShuffleQuestions: false,
            quizShuffleOptions: false
          }]
        };
      }
      return section;
    }));
  };

  const updateSectionTitle = (id: string | number, title: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
  };

  const updateSectionPrice = (id: string | number, price: number) => {
    setSections(sections.map(s => s.id === id ? { ...s, price } : s));
  };

  const updateTopicTitle = (sectionId: string | number, topicId: string | number, title: string) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, title } : t)
    } : s));
  };

  const updateTopicField = (sectionId: string | number, topicId: string | number, field: string, value: any) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, [field]: value } : t)
    } : s));
  };

  const toggleTopicExpand = (sectionId: string | number, topicId: string | number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t)
    } : s));
  };

  const addQuizQuestion = (sectionId: string | number, topicId: string | number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { 
        ...t, 
        quizQuestions: [...(t.quizQuestions || []), { question: '', imageUrl: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }] 
      } : t)
    } : s));
  };

  const updateQuizQuestion = (sectionId: string | number, topicId: string | number, qIndex: number, field: string, value: any, optIndex?: number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => {
        if (t.id === topicId) {
          const newQs = [...t.quizQuestions];
          if (field === 'question') newQs[qIndex].question = value;
          else if (field === 'imageUrl') newQs[qIndex].imageUrl = value;
          else if (field === 'correctIndex') newQs[qIndex].correctIndex = value;
          else if (field === 'explanation') newQs[qIndex].explanation = value;
          else if (field === 'option') newQs[qIndex].options[optIndex!] = value;
          else if (field === 'delete') newQs.splice(qIndex, 1);
          return { ...t, quizQuestions: newQs };
        }
        return t;
      })
    } : s));
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!courseTitle) {
      alert("Please enter a course title.");
      return;
    }

    setIsSaving(true);
    
    try {
      const finalIsPublished = publishOverride !== undefined ? publishOverride : isPublished;
      // 1. Update Course
      const { error: courseError } = await supabase
        .from('courses')
        .update({
          title: courseTitle,
          description: courseDescription,
          thumbnail_url: courseThumbnail,
          total_price: parseFloat(coursePrice) || 0,
          is_published: finalIsPublished,
          keywords: courseKeywords.split(',').map(k => k.trim()).filter(Boolean)
        })
        .eq('id', courseId);

      if (courseError) throw courseError;

      // 2. Upsert Sections & Topics
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const sectionPayload = {
          course_id: courseId,
          title: section.title,
          order_index: sIdx,
          price: section.price
        };
        
        let dbSectionId = section.id;
        if (typeof section.id === 'string') {
          // Update existing
          await supabase.from('sections').update(sectionPayload).eq('id', section.id);
        } else {
          // Insert new
          const { data } = await supabase.from('sections').insert(sectionPayload).select().single();
          dbSectionId = data.id;
        }

        for (let tIdx = 0; tIdx < section.topics.length; tIdx++) {
          const topic = section.topics[tIdx];
          const topicPayload = {
            section_id: dbSectionId,
            title: topic.title,
            order_index: tIdx,
            youtube_url: topic.youtubeUrl
          };
          
          let dbTopicId = topic.id;
          if (typeof topic.id === 'string') {
             // Update existing
             await supabase.from('topics').update(topicPayload).eq('id', topic.id);
          } else {
             // Insert new
             const { data } = await supabase.from('topics').insert(topicPayload).select().single();
             dbTopicId = data.id;
          }

          // Handle PDFs (safest to delete and re-insert for updates without foreign key cascades)
          const { error: pdfDeleteError } = await supabase.from('topic_pdfs').delete().eq('topic_id', dbTopicId);
          if (pdfDeleteError) {
            console.error('PDF delete error:', pdfDeleteError);
            throw pdfDeleteError;
          }
          if (topic.pdfNotesUrl) {
            const { error: notesError } = await supabase.from('topic_pdfs').insert({ topic_id: dbTopicId, type: 'notes', file_url: topic.pdfNotesUrl });
            if (notesError) {
              console.error('PDF notes insert error:', notesError);
              throw notesError;
            }
          }
          if (topic.pdfWorksheetUrl) {
            const { error: worksheetError } = await supabase.from('topic_pdfs').insert({ topic_id: dbTopicId, type: 'worksheet', file_url: topic.pdfWorksheetUrl });
            if (worksheetError) {
              console.error('PDF worksheet insert error:', worksheetError);
              throw worksheetError;
            }
          }

          // Handle Quizzes
          const { data: existingQuizzes, error: quizFetchError } = await supabase.from('quizzes').select('*').eq('topic_id', dbTopicId);
          if (quizFetchError) {
            console.error('Quiz fetch error:', quizFetchError);
            throw quizFetchError;
          }
          const existingMcqQuiz = existingQuizzes?.find(q => q.questions_data && q.questions_data.length > 0) || null;

          // MCQ Quiz — save or update
          if (topic.quizQuestions && topic.quizQuestions.length > 0) {
            const quizPayload = { 
              questions_data: topic.quizQuestions, 
              total_marks: topic.quizQuestions.length,
              time_limit_minutes: parseInt(topic.quizTimeLimit) || null,
              passing_score: parseInt(topic.quizPassingScore) || null,
              settings: {
                shuffle_questions: topic.quizShuffleQuestions,
                shuffle_options: topic.quizShuffleOptions
              }
            };

            if (existingMcqQuiz) {
               const { error: quizUpdateError } = await supabase.from('quizzes').update(quizPayload).eq('id', existingMcqQuiz.id);
               if (quizUpdateError) {
                 console.error('Quiz update error:', quizUpdateError);
                 throw quizUpdateError;
               }
            } else {
               // Check if there's any existing quiz for this topic we can reuse
               const existingAny = existingQuizzes && existingQuizzes.length > 0 ? existingQuizzes[0] : null;
               if (existingAny) {
                 const { error: quizUpdateError } = await supabase.from('quizzes').update(quizPayload).eq('id', existingAny.id);
                 if (quizUpdateError) {
                   console.error('Quiz update error:', quizUpdateError);
                   throw quizUpdateError;
                 }
               } else {
                 const { error: quizInsertError } = await supabase.from('quizzes').insert({ 
                   topic_id: dbTopicId, 
                   section_id: dbSectionId, 
                   type: 'topic', 
                   ...quizPayload
                 });
                 if (quizInsertError) {
                   console.error('Quiz insert error:', quizInsertError);
                   throw quizInsertError;
                 }
               }
            }
          } else if (existingMcqQuiz) {
            // If questions were removed, clear the quiz data
            const { error: quizClearError } = await supabase.from('quizzes').update({ questions_data: null, total_marks: 0 }).eq('id', existingMcqQuiz.id);
            if (quizClearError) {
              console.error('Quiz clear error:', quizClearError);
              throw quizClearError;
            }
          }


        }
      }

      alert("Course successfully updated!");
      router.push('/admin/courses');
      
    } catch (error: any) {
      console.error(error);
      alert("Error saving course: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-text/60">
            <Link href="/admin/courses" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Courses
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-text">Edit Course</h1>
          <p className="text-text/60 text-sm">Update your syllabus and pricing.</p>
        </div>
        <button 
          onClick={() => handleSave()}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>1</div>
          <span className="font-medium">Course Details</span>
        </div>
        <div className={`w-16 h-px mx-4 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>2</div>
          <span className="font-medium">Syllabus Builder</span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Course Title</label>
            <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Complete Algebra Masterclass" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Description</label>
            <textarea rows={4} value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Write a detailed description..."></textarea>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Thumbnail URL or Upload</label>
              <div className="flex gap-2">
                <input type="text" value={courseThumbnail} onChange={(e) => setCourseThumbnail(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="https://..." />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[100px]">
                  {uploadingField === 'thumbnail' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'thumbnail', setCourseThumbnail)} disabled={uploadingField === 'thumbnail'} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Total Price (£)</label>
              <input type="number" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="99.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Keywords (comma-separated)</label>
            <input type="text" value={courseKeywords} onChange={(e) => setCourseKeywords(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Algebra, GCSE, Basics..." />
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-text text-white px-6 py-2 rounded-lg font-medium hover:bg-text/90 transition-colors"
            >
              Continue to Syllabus <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {sections.map(section => (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-move">
                <div className="flex items-center gap-3 w-full max-w-md">
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input 
                    type="text" 
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="font-bold text-text bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-primary/20 rounded px-2"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text/60">Price: £</span>
                  <input 
                    type="number" 
                    value={section.price}
                    onChange={(e) => updateSectionPrice(section.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button className="text-gray-400 hover:text-primary ml-2"><Settings className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {section.topics.map((topic: any) => (
                  <div key={topic.id} className="bg-gray-50 border border-gray-100 rounded-lg overflow-hidden transition-all">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 w-full">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-move" />
                        <input 
                          type="text" 
                          value={topic.title}
                          onChange={(e) => updateTopicTitle(section.id, topic.id, e.target.value)}
                          className="text-sm font-medium bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-primary/20 rounded px-2"
                        />
                      </div>
                      <button 
                        onClick={() => toggleTopicExpand(section.id, topic.id)}
                        className="text-gray-400 hover:text-primary px-2"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {topic.isExpanded && (
                      <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-4 bg-white/50">
                        {/* Core Media Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-text/70 mb-1">Video URL or Upload Video</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={topic.youtubeUrl}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'youtubeUrl', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                placeholder="https://youtube.com/watch?v=..." 
                              />
                              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center min-w-[100px] text-sm">
                                {uploadingField === `video_${topic.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Video'}
                                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, `video_${topic.id}`, (url) => updateTopicField(section.id, topic.id, 'youtubeUrl', url))} disabled={uploadingField === `video_${topic.id}`} />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text/70 mb-1">PDF Notes URL or Upload</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={topic.pdfNotesUrl}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'pdfNotesUrl', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                placeholder="https://..." 
                              />
                              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center min-w-[100px] text-sm">
                                {uploadingField === `notes_${topic.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload PDF'}
                                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, `notes_${topic.id}`, (url) => updateTopicField(section.id, topic.id, 'pdfNotesUrl', url))} disabled={uploadingField === `notes_${topic.id}`} />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text/70 mb-1">PDF Worksheet URL or Upload</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={topic.pdfWorksheetUrl}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'pdfWorksheetUrl', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                placeholder="https://..." 
                              />
                              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center min-w-[100px] text-sm">
                                {uploadingField === `worksheet_${topic.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload PDF'}
                                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, `worksheet_${topic.id}`, (url) => updateTopicField(section.id, topic.id, 'pdfWorksheetUrl', url))} disabled={uploadingField === `worksheet_${topic.id}`} />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Quiz Builder */}
                        <div className="pt-4 border-t border-gray-200">


                          <div className="flex items-center justify-between mb-4 mt-8">
                            <div>
                              <h4 className="font-bold text-sm text-text">MCQ Quiz Maker</h4>
                              <p className="text-xs text-text/60">Generate auto-correcting multiple choice questions for this topic.</p>
                            </div>
                            <button 
                              onClick={() => addQuizQuestion(section.id, topic.id)}
                              className="text-xs font-bold text-white bg-text px-3 py-2 rounded-lg hover:bg-text/90 shadow-sm"
                            >
                              + Add Question
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Time Limit (Min)</label>
                              <input 
                                type="number" 
                                value={topic.quizTimeLimit}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'quizTimeLimit', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-primary"
                                placeholder="None"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Passing Score (%)</label>
                              <input 
                                type="number" 
                                value={topic.quizPassingScore}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'quizPassingScore', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-primary"
                                placeholder="70"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <input 
                                type="checkbox" 
                                id={`shuffle-q-${topic.id}`}
                                checked={topic.quizShuffleQuestions}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'quizShuffleQuestions', e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                              />
                              <label htmlFor={`shuffle-q-${topic.id}`} className="text-xs font-medium text-text/70">Shuffle Qs</label>
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <input 
                                type="checkbox" 
                                id={`shuffle-o-${topic.id}`}
                                checked={topic.quizShuffleOptions}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'quizShuffleOptions', e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                              />
                              <label htmlFor={`shuffle-o-${topic.id}`} className="text-xs font-medium text-text/70">Shuffle Options</label>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {topic.quizQuestions?.map((q: any, qIndex: number) => (
                              <div key={qIndex} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                                <button 
                                  onClick={() => updateQuizQuestion(section.id, topic.id, qIndex, 'delete', null)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex gap-4 mb-4 pr-8">
                                  <div className="flex-1">
                                    <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Question Text (Optional if using image)</label>
                                    <input 
                                      type="text" 
                                      value={q.question}
                                      onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'question', e.target.value)}
                                      placeholder={`Enter question ${qIndex + 1} here...`}
                                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none font-bold text-text" 
                                    />
                                  </div>
                                  <div className="w-1/3">
                                    <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Question Image (Optional)</label>
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        value={q.imageUrl || ''}
                                        onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'imageUrl', e.target.value)}
                                        placeholder={`Image URL`}
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                      />
                                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-3 py-2 rounded-md font-medium transition-colors flex items-center justify-center text-sm">
                                        {uploadingField === `q_img_${topic.id}_${qIndex}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4" />}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, `q_img_${topic.id}_${qIndex}`, (url) => updateQuizQuestion(section.id, topic.id, qIndex, 'imageUrl', url))} disabled={uploadingField === `q_img_${topic.id}_${qIndex}`} />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                {q.imageUrl && (
                                  <div className="mb-4">
                                    <img src={q.imageUrl} alt={`Question ${qIndex + 1}`} className="max-h-48 rounded-md object-contain border border-gray-200" />
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((opt: string, optIndex: number) => (
                                    <div key={optIndex} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                      <div className="relative flex items-center justify-center">
                                        <input 
                                          type="radio" 
                                          name={`correct-${section.id}-${topic.id}-${qIndex}`}
                                          checked={q.correctIndex === optIndex}
                                          onChange={() => updateQuizQuestion(section.id, topic.id, qIndex, 'correctIndex', optIndex)}
                                          className="w-4 h-4 text-green-500 focus:ring-green-500 border-gray-300 cursor-pointer"
                                        />
                                      </div>
                                      <input 
                                        type="text" 
                                        value={opt}
                                        onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'option', e.target.value, optIndex)}
                                        placeholder={`Option ${optIndex + 1}`}
                                        className="w-full text-xs px-2 py-1.5 border border-gray-200 bg-white rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                      />
                                      {q.correctIndex === optIndex && (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Correct</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4">
                                  <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Explanation (Shown after submission)</label>
                                  <textarea 
                                    value={q.explanation}
                                    onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'explanation', e.target.value)}
                                    placeholder="Explain why the correct answer is right..."
                                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none h-16 resize-none"
                                  />
                                </div>
                              </div>
                            ))}
                            {(!topic.quizQuestions || topic.quizQuestions.length === 0) && (
                              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <p className="text-sm text-text/60">No quiz questions added yet.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => handleAddTopic(section.id)}
                  className="flex items-center gap-2 text-primary font-medium text-sm p-2 hover:bg-primary/5 rounded-lg w-full mt-2 border border-dashed border-primary/30"
                >
                  <Plus className="w-4 h-4" /> Add Topic
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAddSection}
            className="flex items-center justify-center gap-2 text-text font-medium bg-white border border-dashed border-gray-300 w-full py-4 rounded-2xl hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" /> Add New Section
          </button>
          
          <div className="pt-8 flex justify-between">
            <button 
              onClick={() => setStep(1)}
              className="text-text/70 font-medium hover:text-text"
            >
              Back to Details
            </button>
            <button 
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-70"
            >
              {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Publishing...' : 'Update Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
