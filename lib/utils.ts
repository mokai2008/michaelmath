import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the spoken language for a course.
 * Priority:
 * 1. If explicitly empty string -> null (badge cleared)
 * 2. course.spoken_language (if present and non-empty)
 * 3. Tag in course.keywords like 'lang:Arabic Spoken'
 * 4. Default: 'Arabic Spoken'
 */
export function getCourseSpokenLanguage(course: any): string | null {
  if (!course) return null;
  if (course.spoken_language === "") return null;
  if (typeof course.spoken_language === "string" && course.spoken_language.trim()) {
    return course.spoken_language.trim();
  }
  if (Array.isArray(course.keywords)) {
    const langTag = course.keywords.find(
      (k: any) => typeof k === "string" && k.toLowerCase().startsWith("lang:")
    );
    if (langTag) {
      const parsed = langTag.slice(5).trim();
      if (parsed) return parsed;
    }
  }
  return "Arabic Spoken";
}

