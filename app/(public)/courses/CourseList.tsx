"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, BookOpen, Star } from "lucide-react";

export default function CourseList({ courses }: { courses: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Extract all unique keywords from courses to use as filters
  const allKeywords = useMemo(() => {
    const keywords = new Set<string>();
    courses.forEach(course => {
      if (course.keywords && Array.isArray(course.keywords)) {
        course.keywords.forEach((kw: string) => keywords.add(kw));
      }
    });
    return Array.from(keywords).sort();
  }, [courses]);

  // Use predefined categories if no keywords are present in DB yet
  const filters = ['All', ...allKeywords];
  if (filters.length === 1) {
    filters.push('Algebra', 'Calculus', 'Geometry', 'Statistics');
  }

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // 1. Keyword Filter
      const matchesFilter = selectedFilter === "All" || 
        (course.keywords && course.keywords.includes(selectedFilter)) || 
        (!course.keywords && ['Algebra', 'Calculus', 'Geometry', 'Statistics'].includes(selectedFilter) && course.title?.includes(selectedFilter));

      // 2. Search Filter (by title, description, or keyword)
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || 
        course.title?.toLowerCase().includes(query) || 
        course.description?.toLowerCase().includes(query) ||
        (course.keywords && course.keywords.some((k: string) => k.toLowerCase().includes(query)));

      return matchesFilter && matchesSearch;
    });
  }, [courses, selectedFilter, searchQuery]);

  return (
    <>
      {/* Filter and Search Bar */}
      <section className="py-8 border-b border-gray-200 bg-white sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="flex items-center gap-2 bg-background-alt text-text px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              <Filter className="w-5 h-5" /> Filter
            </button>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {filters.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedFilter(cat)}
                  className={`px-4 py-2 whitespace-nowrap rounded-lg font-medium transition-colors ${
                    selectedFilter === cat 
                      ? "bg-primary text-white shadow-sm" 
                      : "bg-background text-text hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-text mb-2">No courses available</h3>
              <p className="text-text/60">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course: any, idx: number) => (
                <Link href={`/courses/${course.id}`} key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 border border-gray-100 group flex flex-col hover:-translate-y-1 transition-transform">
                  <div className="aspect-[4/3] bg-background-alt relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-4 left-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                      {idx === 0 ? 'NEW' : 'HOT'}
                    </div>
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <BookOpen className="w-16 h-16 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-sm text-text/60 mb-3">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="font-semibold text-text">5.0</span>
                    </div>
                    <h3 className="font-bold text-xl text-text mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-text/70 text-sm mb-4 line-clamp-2 flex-grow">{course.description || "Comprehensive syllabus covering everything from basics to advanced problem solving."}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">MG</div>
                        <span className="text-sm font-medium text-text">Michael Gad</span>
                      </div>
                      <div className="font-bold text-xl text-primary">£{course.total_price}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
