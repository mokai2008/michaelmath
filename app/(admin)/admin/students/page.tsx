"use client";

import { useState, useEffect } from "react";
import { Users, Search, Mail, BookOpen, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          parent_email,
          parent_whatsapp,
          created_at,
          enrollments (
            id,
            courses (title)
          )
        `)
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching students:", error);
      } else {
        setStudents(data || []);
      }
      setIsLoading(false);
    };

    fetchStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Students</h1>
          <p className="text-text/60 text-sm">
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-72">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-text/60">
              {searchQuery ? "No students match your search." : "No students registered yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((student) => {
              const courseCount = student.enrollments?.length || 0;
              const courseNames = student.enrollments
                ?.map((e: any) => e.courses?.title)
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={student.id}
                  className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">
                      {student.full_name || "Unnamed Student"}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text/50 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-medium text-text flex items-center gap-1 justify-end">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {courseCount} course{courseCount !== 1 ? "s" : ""}
                      </span>
                      {courseNames && (
                        <p className="text-xs text-text/40 mt-0.5 max-w-48 truncate">{courseNames}</p>
                      )}
                    </div>
                    <span className="text-xs text-text/30">
                      {new Date(student.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
