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
    notFound();
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
