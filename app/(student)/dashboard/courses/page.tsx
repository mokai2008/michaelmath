"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { BookOpen, PlayCircle, Award, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          course_id,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            total_price,
            sections ( topics ( id ) )
          )
        `)
        .eq('student_id', session.user.id)
        .order('enrolled_at', { ascending: false });

      const { data: compData } = await supabase
        .from('topic_progress')
        .select('topic_id')
        .eq('student_id', session.user.id)
        .eq('is_completed', true);
      const compSet = new Set(compData?.map(d => d.topic_id) || []);

      if (error) {
        console.error('Error fetching enrolled courses:', error);
      } else if (enrollments) {
        const coursesData = enrollments
          .filter((e: any) => e.courses)
          .map((e: any) => {
            let total = 0;
            let comp = 0;
            e.courses.sections?.forEach((s: any) => {
              s.topics?.forEach((t: any) => {
                total++;
                if (compSet.has(t.id)) comp++;
              });
            });
            const progress = total > 0 ? Math.round((comp / total) * 100) : 0;
            return {
              ...e.courses,
              enrolled_at: e.enrolled_at,
              progress,
            };
          });
        setEnrolledCourses(coursesData);
      }

      setIsLoading(false);
    };

    fetchEnrolledCourses();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text/60">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
          {enrolledCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] bg-background-alt relative flex-shrink-0">
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
          ))}
        </div>
      )}
    </div>
  );
}
