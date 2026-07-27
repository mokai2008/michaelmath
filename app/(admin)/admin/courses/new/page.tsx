"use client";

import { useState } from "react";
import { 
  Save, Plus, GripVertical, Settings, ChevronRight, Loader2, Upload, Trash2, 
  Sparkles, Code, FileText, Video, HelpCircle, BookOpen, ArrowUp, ArrowDown, Layers 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MathText from "@/components/MathText";

export default function AdminNewCourse() {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [courseIntroVideo, setCourseIntroVideo] = useState("");
  const [coursePrice, setCoursePrice] = useState("0.00");
  const [courseKeywords, setCourseKeywords] = useState("");

  const [sections, setSections] = useState([
    {
      id: 1,
      title: "Section 1: Introduction",
      price: 0,
      topics: [
        {
          id: 1,
          title: "Lesson 1: Getting Started",
          isExpanded: true,
          items: [
            {
              id: "item_init_1",
              type: "video",
              title: "Video 1: Overview & Basics",
              url: ""
            }
          ]
        }
      ]
    }
  ]);

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
            title: `Lesson ${newTopicId}: New Lesson`,
            isExpanded: true,
            items: []
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

  const toggleTopicExpand = (sectionId: number, topicId: number) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      topics: s.topics.map((t: any) => t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t)
    } : s));
  };

  const handleAddItemToTopic = (sectionId: number, topicId: number, type: 'video' | 'quiz' | 'worksheet' | 'notes') => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              const items = topic.items || [];
              const newItemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
              let defaultTitle = '';
              if (type === 'video') defaultTitle = `Video ${items.filter((i: any) => i.type === 'video').length + 1}`;
              else if (type === 'quiz') defaultTitle = `Quiz ${items.filter((i: any) => i.type === 'quiz').length + 1}`;
              else if (type === 'worksheet') defaultTitle = `Worksheet ${items.filter((i: any) => i.type === 'worksheet').length + 1}`;
              else if (type === 'notes') defaultTitle = `Notes ${items.filter((i: any) => i.type === 'notes').length + 1}`;

              const newItem: any = {
                id: newItemId,
                type,
                title: defaultTitle,
                url: '',
                quizMode: 'manual',
                quizQuestions: [],
                quizEmbedCode: '',
                quizTimeLimit: '',
                quizPassingScore: '70',
                quizShuffleQuestions: false,
                quizShuffleOptions: false
              };

              return {
                ...topic,
                items: [...items, newItem]
              };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleUpdateItemField = (sectionId: number, topicId: number, itemId: string | number, field: string, value: any) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              return {
                ...topic,
                items: (topic.items || []).map((item: any) => {
                  if (item.id === itemId) {
                    return { ...item, [field]: value };
                  }
                  return item;
                })
              };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleDeleteItemFromTopic = (sectionId: number, topicId: number, itemId: string | number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              return {
                ...topic,
                items: (topic.items || []).filter((item: any) => item.id !== itemId)
              };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleMoveItemInTopic = (sectionId: number, topicId: number, itemIdx: number, direction: 'up' | 'down') => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              const items = [...(topic.items || [])];
              const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
              if (targetIdx >= 0 && targetIdx < items.length) {
                const temp = items[itemIdx];
                items[itemIdx] = items[targetIdx];
                items[targetIdx] = temp;
              }
              return { ...topic, items };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleAddQuestionToItem = (sectionId: number, topicId: number, itemId: string | number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              return {
                ...topic,
                items: (topic.items || []).map((item: any) => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      quizQuestions: [...(item.quizQuestions || []), {
                        question: '',
                        imageUrl: '',
                        options: ['', '', '', ''],
                        optionImages: ['', '', '', ''],
                        correctIndex: 0,
                        explanation: '',
                        explanationImageUrl: ''
                      }]
                    };
                  }
                  return item;
                })
              };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleUpdateQuestionInItem = (sectionId: number, topicId: number, itemId: string | number, qIndex: number, field: string, value: any, optIndex?: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          topics: section.topics.map((topic: any) => {
            if (topic.id === topicId) {
              return {
                ...topic,
                items: (topic.items || []).map((item: any) => {
                  if (item.id === itemId && item.quizQuestions) {
                    const newQs = [...item.quizQuestions];
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
                    return { ...item, quizQuestions: newQs };
                  }
                  return item;
                })
              };
            }
            return topic;
          })
        };
      }
      return section;
    }));
  };

  const handleSave = async (publish: boolean) => {
    if (!courseTitle) {
      alert("Please enter a course title.");
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. Create Course
      const coursePayload: any = {
        title: courseTitle,
        description: courseDescription,
        thumbnail_url: courseThumbnail,
        intro_video_url: courseIntroVideo,
        total_price: parseFloat(coursePrice) || 0,
        is_published: publish,
        keywords: courseKeywords.split(',').map(k => k.trim()).filter(Boolean)
      };

      let { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert(coursePayload)
        .select()
        .single();

      if (courseError && (courseError.message?.includes('intro_video_url') || courseError.message?.includes('keywords'))) {
        if (courseError.message.includes('intro_video_url')) delete coursePayload.intro_video_url;
        if (courseError.message.includes('keywords')) delete coursePayload.keywords;
        const retry = await supabase.from('courses').insert(coursePayload).select().single();
        courseData = retry.data;
        courseError = retry.error;
      }

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
          const items = topic.items || [];
          const firstVideo = items.find((i: any) => i.type === 'video');

          const topicPayload: any = {
            section_id: sectionId,
            title: topic.title,
            order_index: tIdx,
            youtube_url: firstVideo?.url || '',
            content_items: items
          };

          let { data: topicData, error: topicError } = await supabase
            .from('topics')
            .insert(topicPayload)
            .select()
            .single();

          if (topicError && topicError.message?.includes('content_items')) {
            delete topicPayload.content_items;
            const retry = await supabase.from('topics').insert(topicPayload).select().single();
            topicData = retry.data;
            topicError = retry.error;
          }

          if (topicError) throw topicError;
          const topicId = topicData.id;

          // Insert PDFs for backwards compatibility & submission tracking
          for (const item of items) {
            if ((item.type === 'worksheet' || item.type === 'notes') && item.url) {
              await supabase.from('topic_pdfs').insert({
                topic_id: topicId,
                type: item.type,
                file_url: item.url
              });
            }
          }

          // Insert Quizzes for backwards compatibility & quiz submission tracking
          for (const item of items) {
            if (item.type === 'quiz') {
              const hasQuestions = item.quizQuestions && item.quizQuestions.length > 0;
              const hasEmbed = item.quizEmbedCode && item.quizEmbedCode.trim().length > 0;

              if (hasQuestions || hasEmbed) {
                const quizPayload: any = {
                  topic_id: topicId,
                  section_id: sectionId,
                  type: 'topic',
                  questions_data: hasQuestions ? item.quizQuestions : [],
                  embed_code: hasEmbed ? item.quizEmbedCode : null,
                  total_marks: hasQuestions ? item.quizQuestions.length : (hasEmbed ? 10 : 0),
                  time_limit_minutes: parseInt(item.quizTimeLimit) || null,
                  passing_score: parseInt(item.quizPassingScore) || null,
                  settings: {
                    title: item.title || 'Lesson Quiz',
                    shuffle_questions: item.quizShuffleQuestions,
                    shuffle_options: item.quizShuffleOptions,
                    embed_code: hasEmbed ? item.quizEmbedCode : null
                  }
                };

                const { error: quizError } = await supabase.from('quizzes').insert(quizPayload);
                if (quizError && quizError.message?.includes('embed_code')) {
                  delete quizPayload.embed_code;
                  await supabase.from('quizzes').insert(quizPayload);
                }
              }
            }
          }
        }
      }

      alert("Course successfully created and saved!");
      window.location.href = "/admin/courses";
      
    } catch (error: any) {
      console.error(error);
      alert("Error saving course: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Create New Course</h1>
          <p className="text-text/60 text-sm">Build your syllabus and set up pricing.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center gap-2 bg-white border border-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-text/70" />}
            Save Draft
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className={`flex items-center gap-2 font-semibold ${step === 1 ? 'text-primary' : 'text-text/50'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-primary text-white' : 'bg-gray-100'}`}>1</span>
          Course Information
        </div>
        <ChevronRight className="w-4 h-4 text-text/30" />
        <div className={`flex items-center gap-2 font-semibold ${step === 2 ? 'text-primary' : 'text-text/50'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-primary text-white' : 'bg-gray-100'}`}>2</span>
          Curriculum Builder & Lessons
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Course Title</label>
            <input 
              type="text" 
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
              placeholder="e.g. Pure Mathematics 1 (P1) Masterclass"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Description</label>
            <textarea 
              rows={4} 
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
              placeholder="Write a detailed description..."
            ></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Thumbnail URL or Upload</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={courseThumbnail}
                  onChange={(e) => setCourseThumbnail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="https://..." 
                />
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[100px] text-sm shrink-0">
                  {uploadingField === 'thumbnail' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'thumbnail', setCourseThumbnail)} disabled={uploadingField === 'thumbnail'} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Total Price (£)</label>
              <input 
                type="number" 
                value={coursePrice}
                onChange={(e) => setCoursePrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                placeholder="99.00" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Course Entrance / Intro Video (YouTube, Google Drive, or Upload)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={courseIntroVideo}
                onChange={(e) => setCourseIntroVideo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                placeholder="YouTube, Google Drive link, or upload video" 
              />
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[120px] text-sm shrink-0">
                {uploadingField === 'intro_video' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Video'}
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'intro_video', setCourseIntroVideo)} disabled={uploadingField === 'intro_video'} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-2">Keywords (comma-separated)</label>
            <input 
              type="text" 
              value={courseKeywords}
              onChange={(e) => setCourseKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
              placeholder="Algebra, A-Level, Edexcel..." 
            />
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-text text-white px-6 py-2.5 rounded-lg font-bold hover:bg-text/90 transition-colors"
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
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
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

              <div className="p-4 space-y-4">
                {section.topics.map((topic: any) => (
                  <div key={topic.id} className="bg-gray-50/80 border border-gray-200 rounded-xl overflow-hidden transition-all shadow-xs">
                    {/* Lesson Header */}
                    <div className="flex items-center justify-between p-3.5 bg-white border-b border-gray-100">
                      <div className="flex items-center gap-3 w-full max-w-xl">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-move" />
                        <div className="w-full">
                          <label className="text-[10px] uppercase font-bold text-primary block mb-0.5">Lesson Title</label>
                          <input 
                            type="text" 
                            value={topic.title}
                            onChange={(e) => updateTopicTitle(section.id, topic.id, e.target.value)}
                            className="text-base font-bold bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-primary/20 rounded px-1.5 py-0.5 text-text"
                            placeholder="e.g. Lesson 1: Introduction to Algebra"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text/50 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                          {topic.items?.length || 0} Content {topic.items?.length === 1 ? 'Item' : 'Items'}
                        </span>
                        <button 
                          onClick={() => toggleTopicExpand(section.id, topic.id)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Settings className="w-4 h-4" /> {topic.isExpanded ? 'Collapse' : 'Edit Content'}
                        </button>
                      </div>
                    </div>

                    {/* Lesson Content Items Editor */}
                    {topic.isExpanded && (
                      <div className="p-5 space-y-6 bg-slate-50/50">
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                          <div>
                            <h4 className="font-bold text-sm text-text flex items-center gap-2">
                              <Layers className="w-4 h-4 text-primary" /> Lesson Sections & Content Items
                            </h4>
                            <p className="text-xs text-text/60">Add videos, quizzes, worksheets, or notes to this lesson. Add as many videos or quizzes as needed.</p>
                          </div>

                          {/* Add Item Quick Actions */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAddItemToTopic(section.id, topic.id, 'video')}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <Video className="w-3.5 h-3.5" /> + Video
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddItemToTopic(section.id, topic.id, 'quiz')}
                              className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <HelpCircle className="w-3.5 h-3.5" /> + Quiz
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddItemToTopic(section.id, topic.id, 'worksheet')}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" /> + Worksheet
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddItemToTopic(section.id, topic.id, 'notes')}
                              className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> + Notes
                            </button>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-4">
                          {topic.items && topic.items.length > 0 ? (
                            topic.items.map((item: any, itemIdx: number) => {
                              const isVideo = item.type === 'video';
                              const isQuiz = item.type === 'quiz';
                              const isWorksheet = item.type === 'worksheet';
                              const isNotes = item.type === 'notes';

                              return (
                                <div 
                                  key={item.id || itemIdx} 
                                  className={`bg-white rounded-xl border p-4 shadow-xs space-y-4 transition-all ${
                                    isVideo ? 'border-blue-200 border-l-4 border-l-blue-500' :
                                    isQuiz ? 'border-purple-200 border-l-4 border-l-purple-500' :
                                    isWorksheet ? 'border-emerald-200 border-l-4 border-l-emerald-500' :
                                    'border-amber-200 border-l-4 border-l-amber-500'
                                  }`}
                                >
                                  {/* Item Header & Title */}
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                                        isVideo ? 'bg-blue-100 text-blue-800' :
                                        isQuiz ? 'bg-purple-100 text-purple-800' :
                                        isWorksheet ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isVideo && <Video className="w-3 h-3" />}
                                        {isQuiz && <HelpCircle className="w-3 h-3" />}
                                        {isWorksheet && <FileText className="w-3 h-3" />}
                                        {isNotes && <BookOpen className="w-3 h-3" />}
                                        {item.type}
                                      </span>

                                      <input 
                                        type="text" 
                                        value={item.title}
                                        onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'title', e.target.value)}
                                        placeholder={`Enter ${item.type} title...`}
                                        className="font-bold text-sm text-text border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-full"
                                      />
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        type="button" 
                                        disabled={itemIdx === 0}
                                        onClick={() => handleMoveItemInTopic(section.id, topic.id, itemIdx, 'up')}
                                        className="p-1.5 text-gray-400 hover:text-text disabled:opacity-30 rounded hover:bg-gray-100"
                                      >
                                        <ArrowUp className="w-4 h-4" />
                                      </button>
                                      <button 
                                        type="button" 
                                        disabled={itemIdx === topic.items.length - 1}
                                        onClick={() => handleMoveItemInTopic(section.id, topic.id, itemIdx, 'down')}
                                        className="p-1.5 text-gray-400 hover:text-text disabled:opacity-30 rounded hover:bg-gray-100"
                                      >
                                        <ArrowDown className="w-4 h-4" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteItemFromTopic(section.id, topic.id, item.id)}
                                        className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 ml-1"
                                        title="Delete section item"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Item Body: VIDEO */}
                                  {isVideo && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                      <label className="block text-xs font-semibold text-text/70">Video Link (YouTube, Google Drive) or Video Upload</label>
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          value={item.url || ''}
                                          onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'url', e.target.value)}
                                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                          placeholder="https://youtube.com/watch?... or https://drive.google.com/..."
                                        />
                                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center min-w-[110px] shrink-0">
                                          {uploadingField === `vid_${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Video'}
                                          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, `vid_${item.id}`, (url) => handleUpdateItemField(section.id, topic.id, item.id, 'url', url))} disabled={uploadingField === `vid_${item.id}`} />
                                        </label>
                                      </div>
                                    </div>
                                  )}

                                  {/* Item Body: WORKSHEET or NOTES */}
                                  {(isWorksheet || isNotes) && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                      <label className="block text-xs font-semibold text-text/70">{isWorksheet ? 'Worksheet PDF Link or Upload' : 'Notes PDF Link or Upload'}</label>
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          value={item.url || ''}
                                          onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'url', e.target.value)}
                                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                          placeholder="https://..."
                                        />
                                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-text px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center min-w-[100px] shrink-0">
                                          {uploadingField === `pdf_${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload PDF'}
                                          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, `pdf_${item.id}`, (url) => handleUpdateItemField(section.id, topic.id, item.id, 'url', url))} disabled={uploadingField === `pdf_${item.id}`} />
                                        </label>
                                      </div>
                                    </div>
                                  )}

                                  {/* Item Body: QUIZ */}
                                  {isQuiz && (
                                    <div className="space-y-4 pt-3 border-t border-gray-100">
                                      {/* Quiz Mode Selector */}
                                      <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <span className="text-xs font-bold text-text">Quiz Creation Method:</span>
                                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateItemField(section.id, topic.id, item.id, 'quizMode', 'manual')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                              (item.quizMode || 'manual') === 'manual' ? 'bg-white text-text shadow-sm' : 'text-text/60 hover:text-text'
                                            }`}
                                          >
                                            <FileText className="w-3.5 h-3.5" /> Manual MCQ
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateItemField(section.id, topic.id, item.id, 'quizMode', 'canva')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                              item.quizMode === 'canva' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:bg-purple-50'
                                            }`}
                                          >
                                            <Sparkles className="w-3.5 h-3.5" /> Canva AI Code
                                          </button>
                                        </div>
                                      </div>

                                      {/* Settings Row */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div>
                                          <label className="block text-[10px] uppercase font-bold text-text/60 mb-1">Time Limit (Min)</label>
                                          <input 
                                            type="number" 
                                            value={item.quizTimeLimit || ''}
                                            onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'quizTimeLimit', e.target.value)}
                                            className="w-full text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-primary bg-white"
                                            placeholder="None"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] uppercase font-bold text-text/60 mb-1">Passing Score (%)</label>
                                          <input 
                                            type="number" 
                                            value={item.quizPassingScore || '70'}
                                            onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'quizPassingScore', e.target.value)}
                                            className="w-full text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-primary bg-white"
                                            placeholder="70"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-4">
                                          <input 
                                            type="checkbox" 
                                            id={`sq_${item.id}`}
                                            checked={item.quizShuffleQuestions || false}
                                            onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'quizShuffleQuestions', e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                                          />
                                          <label htmlFor={`sq_${item.id}`} className="text-xs font-medium text-text/70">Shuffle Qs</label>
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-4">
                                          <input 
                                            type="checkbox" 
                                            id={`so_${item.id}`}
                                            checked={item.quizShuffleOptions || false}
                                            onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'quizShuffleOptions', e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                                          />
                                          <label htmlFor={`so_${item.id}`} className="text-xs font-medium text-text/70">Shuffle Options</label>
                                        </div>
                                      </div>

                                      {/* Mode: CANVA AI */}
                                      {item.quizMode === 'canva' ? (
                                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h5 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                                              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Canva AI HTML Code
                                            </h5>
                                            {item.quizEmbedCode && (
                                              <button 
                                                type="button"
                                                onClick={() => handleUpdateItemField(section.id, topic.id, item.id, 'quizEmbedCode', '')}
                                                className="text-[11px] text-red-500 font-bold hover:underline"
                                              >
                                                Clear Code
                                              </button>
                                            )}
                                          </div>
                                          <textarea 
                                            value={item.quizEmbedCode || ''}
                                            onChange={(e) => handleUpdateItemField(section.id, topic.id, item.id, 'quizEmbedCode', e.target.value)}
                                            placeholder="Paste your Canva AI interactive HTML code here..."
                                            className="w-full text-xs font-mono p-3 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 h-28 bg-white"
                                          />
                                        </div>
                                      ) : (
                                        /* Mode: MANUAL MCQ */
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-text">Questions ({item.quizQuestions?.length || 0})</span>
                                            <button 
                                              type="button"
                                              onClick={() => handleAddQuestionToItem(section.id, topic.id, item.id)}
                                              className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                              <Plus className="w-3.5 h-3.5" /> Add Question
                                            </button>
                                          </div>

                                          <div className="space-y-3">
                                            {item.quizQuestions?.map((q: any, qIndex: number) => (
                                              <div key={qIndex} className="bg-gray-50/70 p-3.5 rounded-lg border border-gray-200 relative space-y-3">
                                                <button 
                                                  type="button"
                                                  onClick={() => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'delete', null)}
                                                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                                                  title="Delete question"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>

                                                <div className="pr-6">
                                                  <label className="block text-[10px] uppercase font-bold text-text/50 mb-1">Question {qIndex + 1} Text — <span className="normal-case font-normal">use <code className="bg-gray-200 px-1 rounded">$...$</code> for math</span></label>
                                                  <textarea 
                                                    value={q.question}
                                                    onChange={(e) => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'question', e.target.value)}
                                                    placeholder="Enter question text..."
                                                    className="w-full text-xs font-bold p-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-primary h-14 bg-white"
                                                  />
                                                  {q.question && /\$/.test(q.question) && (
                                                    <div className="mt-1 p-1.5 bg-blue-50 border border-blue-100 rounded">
                                                      <MathText text={q.question} className="text-xs font-bold text-text" block />
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Image Upload */}
                                                <div className="flex gap-2 items-center">
                                                  <input 
                                                    type="text" 
                                                    value={q.imageUrl || ''}
                                                    onChange={(e) => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'imageUrl', e.target.value)}
                                                    placeholder="Question Image URL (Optional)"
                                                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md outline-none bg-white"
                                                  />
                                                  <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-text p-1.5 rounded-md font-medium text-xs shrink-0">
                                                    {uploadingField === `q_img_${item.id}_${qIndex}` ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5" />}
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, `q_img_${item.id}_${qIndex}`, (url) => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'imageUrl', url))} disabled={uploadingField === `q_img_${item.id}_${qIndex}`} />
                                                  </label>
                                                </div>

                                                {/* Options A, B, C, D */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                  {q.options.map((opt: string, optIndex: number) => (
                                                    <div key={optIndex} className="bg-white p-2 rounded border border-gray-200 flex items-center gap-2">
                                                      <input 
                                                        type="radio" 
                                                        name={`correct-${item.id}-${qIndex}`}
                                                        checked={q.correctIndex === optIndex}
                                                        onChange={() => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'correctIndex', optIndex)}
                                                        className="w-3.5 h-3.5 text-green-600 focus:ring-green-500 cursor-pointer"
                                                      />
                                                      <input 
                                                        type="text" 
                                                        value={opt}
                                                        onChange={(e) => handleUpdateQuestionInItem(section.id, topic.id, item.id, qIndex, 'option', e.target.value, optIndex)}
                                                        placeholder={`Option ${optIndex + 1}`}
                                                        className="w-full text-xs p-1 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-primary"
                                                      />
                                                      {q.correctIndex === optIndex && (
                                                        <span className="text-[9px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded">✓</span>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}

                                            {(!item.quizQuestions || item.quizQuestions.length === 0) && (
                                              <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-xs text-text/60">
                                                No questions added yet. Click "+ Add Question" above.
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white space-y-3">
                              <Layers className="w-8 h-8 text-gray-300 mx-auto" />
                              <p className="text-xs font-semibold text-text/60">No content items added to this lesson yet.</p>
                              <p className="text-[11px] text-text/40">Use the buttons above to add videos, quizzes, worksheets, or notes.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  onClick={() => handleAddTopic(section.id)}
                  className="flex items-center justify-center gap-2 text-primary font-bold text-sm p-3 hover:bg-primary/5 rounded-xl w-full border border-dashed border-primary/40 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Lesson to Section
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAddSection}
            className="flex items-center justify-center gap-2 text-text font-bold bg-white border-2 border-dashed border-gray-300 w-full py-4 rounded-2xl hover:border-primary hover:text-primary transition-colors shadow-xs"
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
              {isSaving ? 'Publishing...' : 'Save & Publish Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
