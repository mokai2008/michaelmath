import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import CourseSalesClient from "./CourseSalesClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CourseSalesPage({ params }: { params: { courseId: string } }) {
  // 1. Fetch main course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (courseError || !course) {
    console.error("Course fetch error:", courseError);
    notFound();
  }

  // 2. Fetch sections for this course
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('course_id', params.courseId)
    .order('order_index', { ascending: true });

  let sectionsWithTopics = sections || [];

  // 3. Fetch topics for sections if any sections exist
  if (sectionsWithTopics.length > 0) {
    const sectionIds = sectionsWithTopics.map((s: any) => s.id);
    const { data: topics } = await supabase
      .from('topics')
      .select('*')
      .in('section_id', sectionIds)
      .order('order_index', { ascending: true });

    sectionsWithTopics = sectionsWithTopics.map((section: any) => ({
      ...section,
      topics: (topics || []).filter((t: any) => t.section_id === section.id)
    }));
  }

  course.sections = sectionsWithTopics;

  return <CourseSalesClient course={course} />;
}
