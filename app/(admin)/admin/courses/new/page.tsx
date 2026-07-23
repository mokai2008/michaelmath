"use client";

import { useState } from "react";
import { Save, Plus, GripVertical, Settings, ChevronRight, Loader2, Upload, Trash2, Sparkles, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MathText from "@/components/MathText";

export default function AdminCourseBuilder() {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [courseIntroVideo, setCourseIntroVideo] = useState("");
  const [coursePrice, setCoursePrice] = useState("99.00");
  const [courseKeywords, setCourseKeywords] = useState("");

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

  const handleAddSection = () => {
    const newId = sections.length ? Math.max(...sections.map(s => s.id)) + 1 : 1;
    setSections([
      ...sections,
      { id: newId, title: `Section ${newId}: New Section`, price: 0, topics: [] }
    ]);
  };

  const handleAddTopic = (sectionId: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newTopicId = section.topics.length ? Math.max(...section.topics.map((t: any) => t.id)) + 1 : 1;
        return {
          ...section,
          topics: [...section.topics, { 
            id: newTopicId, 
            title: `Topic ${newTopicId}: New Topic`,
            isExpanded: true,
            youtubeUrl: '',
            pdfNotesUrl: '',
            pdfWorksheetUrl: '',
            quizMode: 'manual',
            quizEmbedCode: '',
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

  const updateSectionTitle = (id: number, title: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
  };

  const updateSectionPrice = (id: number, price: number) => {
    setSections(sections.map(s => s.id === id ? { ...s, price } : s));
  };

  const updateTopicTitle = (sectionId: number, topicId: number, title: string) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, title } : t)
    } : s));
  };

  const updateTopicField = (sectionId: number, topicId: number, field: string, value: any) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, [field]: value } : t)
    } : s));
  };

  const toggleTopicExpand = (sectionId: number, topicId: number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t)
    } : s));
  };

  const addQuizQuestion = (sectionId: number, topicId: number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { 
        ...t, 
        quizQuestions: [...(t.quizQuestions || []), { question: '', imageUrl: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], correctIndex: 0, explanation: '', explanationImageUrl: '' }] 
      } : t)
    } : s));
  };

  const updateQuizQuestion = (sectionId: number, topicId: number, qIndex: number, field: string, value: any, optIndex?: number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => {
        if (t.id === topicId) {
          const newQs = [...t.quizQuestions];
          if (field === 'question') newQs[qIndex].question = value;
          else if (field === 'imageUrl') newQs[qIndex].imageUrl = value;
          else if (field === 'correctIndex') newQs[qIndex].correctIndex = value;
          else if (field === 'explanation') newQs[qIndex].explanation = value;
          else if (field === 'explanationImageUrl') newQs[qIndex].explanationImageUrl = value;
          else if (field === 'option') newQs[qIndex].options[optIndex!] = value;
          else if (field === 'optionImage') {
            if (!newQs[qIndex].optionImages) newQs[qIndex].optionImages = ['', '', '', ''];
            newQs[qIndex].optionImages[optIndex!] = value;
          }
          else if (field === 'delete') newQs.splice(qIndex, 1);
          return { ...t, quizQuestions: newQs };
        }
        return t;
      })
    } : s));
  };

  const handleSave = async (isPublished: boolean = false) => {
    if (!courseTitle) {
      alert("Please enter a course title.");
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. Insert Course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: courseTitle,
          description: courseDescription,
          thumbnail_url: courseThumbnail,
          intro_video_url: courseIntroVideo,
          total_price: parseFloat(coursePrice) || 0,
          is_published: isPublished,
          keywords: courseKeywords.split(',').map(k => k.trim()).filter(Boolean)
        })
        .select()
        .single();

      if (courseError) throw courseError;
      const courseId = courseData.id;

      // 2. Insert Sections & Topics
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const section = sections[sIdx];
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .insert({
            course_id: courseId,
            title: section.title,
            order_index: sIdx,
            price: section.price
          })
          .select()
          .single();

        if (sectionError) throw sectionError;
        const sectionId = sectionData.id;

        for (let tIdx = 0; tIdx < section.topics.length; tIdx++) {
          const topic = section.topics[tIdx];
          const { data: topicData, error: topicError } = await supabase
            .from('topics')
            .insert({
              section_id: sectionId,
              title: topic.title,
              order_index: tIdx,
              youtube_url: topic.youtubeUrl
            })
            .select()
            .single();

          if (topicError) throw topicError;
          const topicId = topicData.id;

          // Insert PDFs
          if (topic.pdfNotesUrl) {
            const { error: notesError } = await supabase.from('topic_pdfs').insert({ topic_id: topicId, type: 'notes', file_url: topic.pdfNotesUrl });
            if (notesError) {
              console.error('PDF notes insert error:', notesError);
              throw notesError;
            }
          }
          if (topic.pdfWorksheetUrl) {
            const { error: worksheetError } = await supabase.from('topic_pdfs').insert({ topic_id: topicId, type: 'worksheet', file_url: topic.pdfWorksheetUrl });
            if (worksheetError) {
              console.error('PDF worksheet insert error:', worksheetError);
              throw worksheetError;
            }
          }

          const hasQuestions = topic.quizQuestions && topic.quizQuestions.length > 0;
          const hasEmbed = topic.quizEmbedCode && topic.quizEmbedCode.trim().length > 0;

          if (hasQuestions || hasEmbed) {
            const quizPayload: any = {
              topic_id: topicId,
              section_id: sectionId,
              type: 'topic',
              quiz_pdf_url: null,
              questions_data: topic.quizQuestions || [],
              embed_code: topic.quizEmbedCode || null,
              total_marks: (topic.quizQuestions || []).length,
              time_limit_minutes: parseInt(topic.quizTimeLimit) || null,
              passing_score: parseInt(topic.quizPassingScore) || null,
              settings: {
                shuffle_questions: topic.quizShuffleQuestions,
                shuffle_options: topic.quizShuffleOptions,
                embed_code: topic.quizEmbedCode || null
              }
            };

            const { error: quizError } = await supabase.from('quizzes').insert(quizPayload);
            if (quizError) {
              if (quizError.message?.includes('embed_code') || quizError.code === '42703') {
                delete quizPayload.embed_code;
                const { error: fallbackErr } = await supabase.from('quizzes').insert(quizPayload);
                if (fallbackErr) throw fallbackErr;
              } else {
                throw quizError;
              }
            }
          }
        }
      }

      alert("Course successfully saved to database!");
      
    } catch (error: any) {
      console.error(error);
      alert("Error saving course: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Create New Course</h1>
          <p className="text-text/60 text-sm">Build your syllabus and set up pricing.</p>
        </div>
        <button 
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="flex items-center gap-2 bg-white border border-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-text/70" />}
          Save Draft
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className={`flex items-center gap-2 font-semibold ${step === 1 ? 'text-primary' : 'text-text/50'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-primary text-white' : 'bg-gray-100'}`}>1</span>
          Course Information
        </div>
        <ChevronRight className="w-4 h-4 text-text/30" />
        <div className={`flex items-center gap-2 font-semibold ${step === 2 ? 'text-primary' : 'text-text/50'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-primary text-white' : 'bg-gray-100'}`}>2</span>
          Curriculum Builder & Quizzes
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-text border-b border-gray-100 pb-4">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Course Title</label>
            <input 
              type="text" 
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
              placeholder="e.g. Master IGCSE Additional Mathematics (0606)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Description</label>
            <textarea 
              rows={4}
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder="Detailed course summary and outline..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Keywords / Tags (Comma separated)</label>
            <input 
              type="text" 
              value={courseKeywords}
              onChange={(e) => setCourseKeywords(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder="e.g. IGCSE, Calculus, Algebra, Past Papers, Grade 10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Thumbnail URL or Upload</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={courseThumbnail}
                  onChange={(e) => setCourseThumbnail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="https://..."
                />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[110px] text-sm">
                  {uploadingField === 'course_thumb' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'course_thumb', setCourseThumbnail)} disabled={uploadingField === 'course_thumb'} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Intro Video URL or Upload</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={courseIntroVideo}
                  onChange={(e) => setCourseIntroVideo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="https://..."
                />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[110px] text-sm">
                  {uploadingField === 'course_intro' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'course_intro', setCourseIntroVideo)} disabled={uploadingField === 'course_intro'} />
                </label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Full Course Price ($)</label>
            <input 
              type="number" 
              value={coursePrice}
              onChange={(e) => setCoursePrice(e.target.value)}
              className="w-full md:w-1/3 px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              placeholder="99.00"
            />
          </div>
          <div className="pt-6 flex justify-end">
            <button 
              onClick={() => setStep(2)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
            >
              Continue to Curriculum
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <input 
                    type="text" 
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="font-bold text-text bg-transparent border-b border-dashed border-gray-300 focus:border-primary outline-none px-1 py-0.5 text-base w-full md:w-2/3"
                  />
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className="text-xs text-text/60 font-medium">Price: $</span>
                  <input 
                    type="number" 
                    value={section.price}
                    onChange={(e) => updateSectionPrice(section.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-200 rounded bg-white text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-4 space-y-4">
                {section.topics.map((topic: any) => (
                  <div key={topic.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div 
                      onClick={() => toggleTopicExpand(section.id, topic.id)}
                      className="p-3 bg-gray-50/50 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`w-4 h-4 text-text/60 transition-transform ${topic.isExpanded ? 'rotate-90' : ''}`} />
                        <span className="font-semibold text-sm text-text">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text/50">
                          {topic.quizQuestions?.length ? `${topic.quizQuestions.length} Qs` : topic.quizEmbedCode ? 'Canva Quiz' : 'No Quiz'}
                        </span>
                      </div>
                    </div>

                    {topic.isExpanded && (
                      <div className="p-4 space-y-4 bg-white">
                        <div>
                          <label className="block text-xs font-medium text-text/70 mb-1">Topic Title</label>
                          <input 
                            type="text" 
                            value={topic.title}
                            onChange={(e) => updateTopicTitle(section.id, topic.id, e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-text/70 mb-1">Video URL (YouTube or Google Drive) or Upload</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={topic.youtubeUrl}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'youtubeUrl', e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                placeholder="YouTube, Google Drive link, or upload a file" 
                              />
                              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center min-w-[100px] text-sm">
                                {uploadingField === `video_${topic.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Video'}
                                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, `video_${topic.id}`, (url) => updateTopicField(section.id, topic.id, 'youtubeUrl', url))} disabled={uploadingField === `video_${topic.id}`} />
                              </label>
                            </div>
                            <p className="text-[11px] text-text/40 mt-1">Supports YouTube links, Google Drive share links (drive.google.com/file/d/...), or direct video file uploads.</p>
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
                        <div className="pt-6 border-t border-gray-200 mt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                              <h4 className="font-bold text-base text-text flex items-center gap-2">
                                Topic Quiz
                              </h4>
                              <p className="text-xs text-text/60">Select how to create the quiz for this topic:</p>
                            </div>

                            {/* Mode Switcher Tabs */}
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/60 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateTopicField(section.id, topic.id, 'quizMode', 'manual')}
                                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                  (topic.quizMode || (topic.quizEmbedCode && (!topic.quizQuestions || topic.quizQuestions.length === 0) ? 'canva' : 'manual')) === 'manual' 
                                    ? 'bg-white text-text shadow-sm' 
                                    : 'text-text/60 hover:text-text'
                                }`}
                              >
                                <FileText className="w-4 h-4" /> Create Quiz Manually (MCQ)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTopicField(section.id, topic.id, 'quizMode', 'canva')}
                                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                  (topic.quizMode || (topic.quizEmbedCode && (!topic.quizQuestions || topic.quizQuestions.length === 0) ? 'canva' : 'manual')) === 'canva' 
                                    ? 'bg-purple-600 text-white shadow-sm' 
                                    : 'text-purple-700 hover:bg-purple-50'
                                }`}
                              >
                                <Sparkles className="w-4 h-4" /> Embed Canva AI Code
                              </button>
                            </div>
                          </div>

                          {(topic.quizMode || (topic.quizEmbedCode && (!topic.quizQuestions || topic.quizQuestions.length === 0) ? 'canva' : 'manual')) === 'canva' ? (
                            /* CANVA AI MODE */
                            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-6 rounded-2xl border border-purple-200 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h5 className="font-bold text-sm text-text flex items-center gap-2">
                                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">Canva AI</span>
                                    Copy & Paste Canva HTML Code
                                  </h5>
                                  <p className="text-xs text-text/60 mt-1">Paste the full HTML code generated by Canva AI below (starts with <code className="bg-purple-100 text-purple-800 px-1 rounded">&lt;!doctype html&gt;</code> or <code className="bg-purple-100 text-purple-800 px-1 rounded">&lt;iframe&gt;</code>).</p>
                                </div>
                                {topic.quizEmbedCode && (
                                  <button 
                                    type="button"
                                    onClick={() => updateTopicField(section.id, topic.id, 'quizEmbedCode', '')}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2.5 py-1 rounded-md bg-white border border-red-100 shadow-xs"
                                  >
                                    Clear Code
                                  </button>
                                )}
                              </div>

                              <textarea 
                                value={topic.quizEmbedCode || ''}
                                onChange={(e) => updateTopicField(section.id, topic.id, 'quizEmbedCode', e.target.value)}
                                placeholder="<!doctype html>... Paste your Canva AI interactive quiz code here"
                                className="w-full text-xs font-mono p-4 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-36 bg-white shadow-inner resize-y"
                              />

                              {topic.quizEmbedCode ? (
                                <div className="mt-4 bg-gray-900 rounded-xl p-4 overflow-hidden border border-gray-800">
                                  <div className="flex items-center justify-between text-white text-xs mb-3 pb-2 border-b border-gray-800">
                                    <span className="font-bold flex items-center gap-2 text-purple-400">
                                      <Sparkles className="w-4 h-4" /> Live Interactive Canva Quiz Preview
                                    </span>
                                    <span className="text-[10px] text-gray-400">Student Interactive View</span>
                                  </div>
                                  <div className="bg-white rounded-lg overflow-hidden border border-gray-700 h-[70vh] min-h-[550px] max-h-[850px]">
                                    <iframe 
                                      srcDoc={(() => {
                                        const html = topic.quizEmbedCode || '';
                                        if (!html) return '';
                                        const isUrl = html.trim().startsWith('http://') || html.trim().startsWith('https://');
                                        if (isUrl) return '';
                                        const patchScriptAndStyle = `
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
                                              box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
                                              width: 100% !important;
                                              margin-top: 1.5rem !important;
                                              cursor: pointer !important;
                                            }
                                            .canva-button *, #next-btn *, #restart-btn * { color: #ffffff !important; }
                                            .canva-button.hidden, #next-btn.hidden, #restart-btn.hidden, #results.hidden, #question-area.hidden, #score-bar.hidden {
                                              display: none !important;
                                            }
                                          </style>
                                          <script>
                                            document.addEventListener('DOMContentLoaded', function() {
                                              function fixCanvaOriginal() {
                                                var nextBtn = document.getElementById('next-btn');
                                                if (nextBtn && (!nextBtn.textContent || !nextBtn.textContent.trim())) {
                                                  nextBtn.textContent = 'Next Question →';
                                                }
                                                var restartBtn = document.getElementById('restart-btn');
                                                if (restartBtn && (!restartBtn.textContent || !restartBtn.textContent.trim())) {
                                                  restartBtn.textContent = 'Restart Quiz ↺';
                                                }
                                                var qLabel = document.querySelector('[data-template-id="question-label"]');
                                                if (qLabel && (!qLabel.textContent || !qLabel.textContent.trim() || qLabel.textContent.trim() === 'Question')) {
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
                                              }
                                              fixCanvaOriginal();
                                              setTimeout(fixCanvaOriginal, 100);
                                              setTimeout(fixCanvaOriginal, 400);

                                              var observer = new MutationObserver(function() {
                                                fixCanvaOriginal();
                                              });
                                              var card = document.getElementById('quiz-card') || document.body;
                                              if (card) observer.observe(card, { childList: true, subtree: true, characterData: true });
                                            });
                                          </script>
                                        `;
                                        if (html.includes('</head>')) return html.replace('</head>', `${patchScriptAndStyle}</head>`);
                                        return `<!DOCTYPE html><html><head>${patchScriptAndStyle}</head><body>${html}</body></html>`;
                                      })()}
                                      className="w-full h-full border-0"
                                      title="Canva Quiz Preview"
                                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 p-4 bg-purple-50/60 rounded-xl border border-dashed border-purple-200 text-center">
                                  <p className="text-xs text-purple-700 font-medium">
                                    Paste your Canva AI code in the box above to generate and preview the interactive quiz widget.
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* MANUAL MCQ QUIZ MAKER MODE */
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h5 className="font-bold text-sm text-text">Multiple Choice (MCQ) Questions</h5>
                                  <p className="text-xs text-text/60">Generate auto-correcting multiple choice questions for this topic.</p>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => addQuizQuestion(section.id, topic.id)}
                                  className="text-xs font-bold text-white bg-text px-4 py-2.5 rounded-xl hover:bg-text/90 shadow-sm flex items-center gap-1"
                                >
                                  <Plus className="w-4 h-4" /> Add Question
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
                                      type="button"
                                      onClick={() => updateQuizQuestion(section.id, topic.id, qIndex, 'delete', null)}
                                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Delete Question"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex gap-4 mb-4 pr-8">
                                      <div className="flex-1">
                                        <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Question Text (Optional if using image) — <span className="normal-case font-normal">use <code className="bg-gray-100 px-1 rounded">$...$</code> for math</span></label>
                                        <textarea 
                                          value={q.question}
                                          onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'question', e.target.value)}
                                          placeholder={`Enter question ${qIndex + 1} here... Use $x^2$ for math`}
                                          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none font-bold text-text resize-none h-16" 
                                        />
                                        {q.question && /\$/.test(q.question) && (
                                          <div className="mt-1.5 p-2 bg-blue-50 border border-blue-100 rounded-md">
                                            <span className="text-[9px] uppercase font-bold text-blue-400 block mb-0.5">Preview</span>
                                            <MathText text={q.question} className="text-sm font-bold text-text" block />
                                          </div>
                                        )}
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
                                          <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-3 py-2 rounded-md font-medium transition-colors flex items-center justify-center text-sm shrink-0">
                                            {uploadingField === `q_img_${topic.id}_${qIndex}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, `q_img_${topic.id}_${qIndex}`, (url) => updateQuizQuestion(section.id, topic.id, qIndex, 'imageUrl', url))} disabled={uploadingField === `q_img_${topic.id}_${qIndex}`} />
                                          </label>
                                          {q.imageUrl && (
                                            <button 
                                              type="button"
                                              onClick={() => updateQuizQuestion(section.id, topic.id, qIndex, 'imageUrl', '')}
                                              className="text-gray-400 hover:text-red-500 p-2"
                                              title="Remove Question Image"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {q.imageUrl && (
                                      <div className="mb-4">
                                        <img src={q.imageUrl} alt={`Question ${qIndex + 1}`} className="max-h-48 rounded-md object-contain border border-gray-200" />
                                      </div>
                                    )}

                                    {/* Answer Options */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {q.options.map((opt: string, optIndex: number) => (
                                        <div key={optIndex} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-2">
                                          <div className="flex items-center gap-3">
                                            <div className="relative flex items-center justify-center">
                                              <input 
                                                type="radio" 
                                                name={`correct-${section.id}-${topic.id}-${qIndex}`}
                                                checked={q.correctIndex === optIndex}
                                                onChange={() => updateQuizQuestion(section.id, topic.id, qIndex, 'correctIndex', optIndex)}
                                                className="w-4 h-4 text-green-500 focus:ring-green-500 border-gray-300 cursor-pointer"
                                              />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <input 
                                                type="text" 
                                                value={opt}
                                                onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'option', e.target.value, optIndex)}
                                                placeholder={`Option ${optIndex + 1} — use $...$ for math`}
                                                className="w-full text-xs px-2 py-1.5 border border-gray-200 bg-white rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                              />
                                              {opt && /\$/.test(opt) && (
                                                <MathText text={opt} className="block mt-1 text-xs text-text/70 px-2" />
                                              )}
                                            </div>
                                            {q.correctIndex === optIndex && (
                                              <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Correct</span>
                                            )}
                                          </div>

                                          {/* Option Image Field */}
                                          <div className="pl-7 flex items-center gap-2">
                                            <input 
                                              type="text" 
                                              value={q.optionImages?.[optIndex] || ''}
                                              onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'optionImage', e.target.value, optIndex)}
                                              placeholder={`Option ${optIndex + 1} Image URL (Optional)`}
                                              className="w-full text-[11px] px-2 py-1 border border-gray-200 bg-white rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                            />
                                            <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-text px-2 py-1 rounded-md font-medium transition-colors flex items-center justify-center text-xs shrink-0" title="Upload Option Image">
                                              {uploadingField === `opt_img_${topic.id}_${qIndex}_${optIndex}` ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5" />}
                                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, `opt_img_${topic.id}_${qIndex}_${optIndex}`, (url) => updateQuizQuestion(section.id, topic.id, qIndex, 'optionImage', url, optIndex))} disabled={uploadingField === `opt_img_${topic.id}_${qIndex}_${optIndex}`} />
                                            </label>
                                            {q.optionImages?.[optIndex] && (
                                              <button 
                                                type="button"
                                                onClick={() => updateQuizQuestion(section.id, topic.id, qIndex, 'optionImage', '', optIndex)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Remove Option Image"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                          {q.optionImages?.[optIndex] && (
                                            <div className="pl-7">
                                              <img src={q.optionImages[optIndex]} alt={`Option ${optIndex + 1}`} className="max-h-24 rounded-md object-contain border border-gray-200 bg-white" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Explanation / Feedback */}
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="md:col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Explanation / Feedback (Shown after submission) — <span className="normal-case font-normal">use <code className="bg-gray-100 px-1 rounded">$...$</code> for math</span></label>
                                        <textarea 
                                          value={q.explanation}
                                          onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'explanation', e.target.value)}
                                          placeholder="Explain why the correct answer is right... Use $x^2$ for math"
                                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none h-20 resize-none"
                                        />
                                        {q.explanation && /\$/.test(q.explanation) && (
                                          <div className="mt-1.5 p-2 bg-blue-50 border border-blue-100 rounded-md">
                                            <span className="text-[9px] uppercase font-bold text-blue-400 block mb-0.5">Preview</span>
                                            <MathText text={q.explanation} className="text-xs text-text/80" block />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Feedback Image (Optional)</label>
                                        <div className="flex gap-2">
                                          <input 
                                            type="text" 
                                            value={q.explanationImageUrl || ''}
                                            onChange={(e) => updateQuizQuestion(section.id, topic.id, qIndex, 'explanationImageUrl', e.target.value)}
                                            placeholder="Feedback Image URL"
                                            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none" 
                                          />
                                          <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-3 py-2 rounded-md font-medium transition-colors flex items-center justify-center text-sm shrink-0">
                                            {uploadingField === `exp_img_${topic.id}_${qIndex}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, `exp_img_${topic.id}_${qIndex}`, (url) => updateQuizQuestion(section.id, topic.id, qIndex, 'explanationImageUrl', url))} disabled={uploadingField === `exp_img_${topic.id}_${qIndex}`} />
                                          </label>
                                          {q.explanationImageUrl && (
                                            <button 
                                              type="button"
                                              onClick={() => updateQuizQuestion(section.id, topic.id, qIndex, 'explanationImageUrl', '')}
                                              className="text-gray-400 hover:text-red-500 p-2"
                                              title="Remove Feedback Image"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                        {q.explanationImageUrl && (
                                          <div className="mt-2">
                                            <img src={q.explanationImageUrl} alt="Feedback explanation" className="max-h-32 rounded-md object-contain border border-gray-200 bg-white" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(!topic.quizQuestions || topic.quizQuestions.length === 0) && (
                                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                    <p className="text-sm text-text/60">No MCQ quiz questions added yet. Click "+ Add Question" above.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => handleAddTopic(section.id)}
                  className="flex items-center gap-2 text-primary font-medium text-sm p-2 hover:bg-primary/5 rounded-lg w-full mt-2 border border-dashed border-primary/30"
                >
                  <Plus className="w-4 h-4" /> Add Topic
                </button>
              </div>
            </div>
          ))}

          <button 
            type="button"
            onClick={handleAddSection}
            className="flex items-center justify-center gap-2 text-text font-medium bg-white border border-dashed border-gray-300 w-full py-4 rounded-2xl hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" /> Add New Section
          </button>
          
          <div className="pt-8 flex justify-between">
            <button 
              type="button"
              onClick={() => setStep(1)}
              className="text-text/70 font-medium hover:text-text"
            >
              Back to Details
            </button>
            <button 
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-70"
            >
              {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Publishing...' : 'Publish Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
