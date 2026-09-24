import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import CourseSalesClient from "./CourseSalesClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CourseSalesPage({ params }: { params: { courseId: string } }) {
  // Fetch course with nested sections and topics
  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      *,
      sections (
        id, title, order_index, price,
        topics (id, title, order_index)
      )
    `)
    .eq('id', params.courseId)
    .single();

  if (error || !course) {
    console.error("Course fetch error:", error, "course data:", course);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-lg border border-red-100">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Course Not Found (Diagnostic Info)</h1>
          <p className="text-text/80 mb-4">The course could not be retrieved from the database.</p>
          <div className="bg-gray-50 p-4 rounded-xl text-xs font-mono space-y-2 overflow-auto max-h-60 border border-gray-200">
            <div><strong>Requested Course ID:</strong> {params.courseId}</div>
            <div><strong>Supabase Error:</strong> {error ? JSON.stringify(error, null, 2) : "None (data was null)"}</div>
            <div><strong>Course Data:</strong> {JSON.stringify(course)}</div>
          </div>
          <div className="mt-6 flex gap-4">
            <a href="/courses" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Back to Courses List</a>
            <a href="/admin/courses" className="bg-gray-100 text-text px-4 py-2 rounded-lg text-sm font-medium">Go to Admin</a>
          </div>
        </div>
      </div>
    );
  }

  // Sort the nested data
  if (course.sections) {
    course.sections.sort((a: any, b: any) => a.order_index - b.order_index);
    course.sections.forEach((section: any) => {
      if (section.topics) {
        section.topics.sort((a: any, b: any) => a.order_index - b.order_index);
      }
    });
  }

  return <CourseSalesClient course={course} />;
}
