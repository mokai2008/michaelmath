"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchCourses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setCourses(prev =>
      prev.map(c => (c.id === courseId ? { ...c, is_published: !currentStatus } : c))
    );

    const { error } = await supabase
      .from("courses")
      .update({ is_published: !currentStatus })
      .eq("id", courseId);

    if (error) {
      console.error("Error toggling publication status:", error);
      alert("Failed to update course status: " + error.message);
      // Revert if error
      setCourses(prev =>
        prev.map(c => (c.id === courseId ? { ...c, is_published: currentStatus } : c))
      );
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone and will delete all sections, topics, and quizzes.")) return;
    
    setIsDeleting(courseId);
    
    // Deleting the course relies on ON DELETE CASCADE in the database to clean up nested relations
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
      
    if (error) {
      alert("Error deleting course: " + error.message);
    } else {
      setCourses(courses.filter(c => c.id !== courseId));
    }
    setIsDeleting(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Course Management</h1>
          <p className="text-text/60 text-sm">Manage your syllabus, pricing, and content.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchCourses} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-text px-4 py-2 rounded-lg font-medium transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/admin/courses/new" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
            <Plus className="w-5 h-5" />
            Create New Course
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg text-text mb-2">No courses yet</h3>
            <p className="text-text/60 mb-6">You haven't created any courses. Click the button above to get started.</p>
            <Link href="/admin/courses/new" className="text-primary font-medium hover:underline">
              Go to Course Builder
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-text/60 text-sm border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Course Title</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text">{course.title}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">£{course.total_price}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(course.id, course.is_published)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer hover:scale-105 active:scale-95 ${
                          course.is_published
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                        title={course.is_published ? "Click to Unpublish" : "Click to Publish"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${course.is_published ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
                        {course.is_published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-text/60">
                      {new Date(course.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/courses/${course.id}/edit`} className="p-2 text-text/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(course.id)}
                          disabled={isDeleting === course.id}
                          className="p-2 text-text/60 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {isDeleting === course.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
