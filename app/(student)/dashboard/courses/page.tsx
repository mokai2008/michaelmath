"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { BookOpen, PlayCircle, Award, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateCourseProgress } from "@/lib/progress";
import { getCourseSpokenLanguage } from "@/lib/utils";

export default function MyCoursesPage() {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch user enrollments
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('id, enrolled_at, course_id')
        .eq('student_id', session.user.id)
        .order('enrolled_at', { ascending: false });

      if (error) {
        console.error('Error fetching enrollments:', error);
        setEnrolledCourses([]);
        setIsLoading(false);
        return;
      }

      if (!enrollments || enrollments.length === 0) {
        setEnrolledCourses([]);
        setIsLoading(false);
        return;
      }

      const courseIds = enrollments.map((e: any) => e.course_id);

      // 2. Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, total_price')
        .in('id', courseIds);

      const coursesMap = new Map((coursesData || []).map((c: any) => [c.id, c]));

      // 3. Fetch sections & topics to calculate progress
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, course_id')
        .in('course_id', courseIds);

      const sectionIds = (sectionsData || []).map((s: any) => s.id);

      let topicsData: any[] = [];
      if (sectionIds.length > 0) {
        const { data: tData, error: tErr } = await supabase
          .from('topics')
          .select('id, section_id, progress_percentage, content_items')
          .in('section_id', sectionIds);
        
        if (tErr) {
          const fallback = await supabase
            .from('topics')
            .select('id, section_id, content_items')
            .in('section_id', sectionIds);
          topicsData = fallback.data || [];
        } else {
          topicsData = tData || [];
        }
      }

      const sectionToCourseMap = new Map((sectionsData || []).map((s: any) => [s.id, s.course_id]));

      const courseTopicsMap: Record<string, any[]> = {};
      topicsData.forEach((t: any) => {
        const cId = sectionToCourseMap.get(t.section_id);
        if (cId) {
          if (!courseTopicsMap[cId]) courseTopicsMap[cId] = [];
          courseTopicsMap[cId].push(t);
        }
      });

      // 4. Fetch completed topics
      const { data: compData } = await supabase
        .from('topic_progress')
        .select('topic_id')
        .eq('student_id', session.user.id)
        .eq('is_completed', true);

      const compSet = new Set(compData?.map(d => d.topic_id) || []);

      const finalEnrolledCourses = enrollments
        .map((e: any) => {
          const c = coursesMap.get(e.course_id);
          if (!c) return null;
          const courseTopics = courseTopicsMap[c.id] || [];
          const { progressPercentage } = calculateCourseProgress(courseTopics, compSet);
          return {
            ...c,
            enrolled_at: e.enrolled_at,
            progress: progressPercentage
          };
        })
        .filter(Boolean);

      setEnrolledCourses(finalEnrolledCourses);

      setIsLoading(false);
    };

    fetchEnrolledCourses();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text/60">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">My Courses</h1>
          <p className="text-text/60 text-sm">Pick up where you left off.</p>
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text mb-2">No courses enrolled</h3>
          <p className="text-text/60 mb-6">You haven't enrolled in any courses yet.</p>
          <Link href="/courses" className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-colors">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {enrolledCourses.map((course) => {
            const spokenLang = getCourseSpokenLanguage(course);
            return (
              <div key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-background-alt relative flex-shrink-0">
                  {spokenLang && (
                    <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md border border-white/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{spokenLang}</span>
                    </div>
                  )}
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                {course.progress === 100 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                    <Award className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-bold text-xl text-text mb-4 line-clamp-2">{course.title}</h3>
                
                <div className="mt-auto space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span className="text-text/60">Progress</span>
                      <span className={course.progress === 100 ? 'text-green-500' : 'text-primary'}>{course.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${course.progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/courses/${course.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
                      course.progress === 100 
                        ? 'bg-gray-100 text-text hover:bg-gray-200' 
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5" />
                    {course.progress === 100 ? 'Review Course' : course.progress === 0 ? 'Start Course' : 'Continue'}
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
