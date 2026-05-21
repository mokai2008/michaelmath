import Link from "next/link";
import { Search, Filter, BookOpen, Star, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CourseList from "./CourseList";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoursesPage() {
  // Fetch published courses from Supabase
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching courses:", error);
  }

  const displayCourses = courses || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <section className="bg-primary py-20 text-white text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">All Courses</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Browse our comprehensive collection of mathematics courses designed to help you excel in your studies and exams.
          </p>
        </div>
      </section>

      <CourseList courses={displayCourses} />
    </div>
  );
}
