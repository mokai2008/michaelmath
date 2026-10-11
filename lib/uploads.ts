/**
 * Upload Path Sanitization & Formatting Helpers
 */

/**
 * Sanitizes a course name or title into a safe, URL-friendly and filesystem-safe folder name.
 * Supports English, Arabic, numbers, and hyphens/underscores.
 *
 * Example:
 * "Year 1 Pure Mathematics" -> "year-1-pure-mathematics"
 * "IGCSE Maths (Core & Extended)" -> "igcse-maths-core-extended"
 * "رياضيات 1 - جبر و تفاضل" -> "رياضيات-1-جبر-و-تفاضل"
 */
function cleanSlugSegment(input: string): string {
  try {
    return input.replace(new RegExp("[^\\p{L}\\p{N}_-]+", "gu"), "-");
  } catch {
    return input.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]+/g, "-");
  }
}

export function sanitizeCourseFolder(name?: string | null): string {
  if (!name || typeof name !== "string") return "general";
  const cleaned = cleanSlugSegment(name.trim().toLowerCase())
    .replace(/-+/g, "-")                // Collapse consecutive hyphens
    .replace(/^-|-$/g, "");             // Trim leading/trailing hyphens
  return cleaned || "general";
}

/**
 * Sanitizes a multi-segment folder path (e.g. "Year 1 / Submissions").
 */
export function sanitizeFolderPath(rawPath?: string | null): string {
  if (!rawPath || typeof rawPath !== "string") return "";
  const segments = rawPath
    .split(/[\/\\]+/)
    .map((seg) =>
      cleanSlugSegment(seg.trim().toLowerCase())
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .filter((seg) => seg && seg !== "." && seg !== "..");
  return segments.join("/");
}

/**
 * Checks if a given URL is an unorganized root upload (e.g. "/uploads/12345_video.mp4").
 */
export function isRootUploadUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  // Matches /uploads/filename.ext or http(s)://.../uploads/filename.ext
  // without any intermediate subfolder
  const match = trimmed.match(/(?:^|https?:\/\/[^\/]+)\/uploads\/([^\/]+)$/);
  return Boolean(match);
}

/**
 * Converts an unorganized root upload URL into a course-specific upload URL.
 *
 * Example:
 * toCourseUploadUrl("/uploads/1791218546326_t347xq.mp4", "Year 1 Pure Math")
 * -> "/uploads/year-1-pure-math/1791218546326_t347xq.mp4"
 */
export function toCourseUploadUrl(url: string, courseName: string): string {
  if (!url || typeof url !== "string" || !courseName) return url;
  const folder = sanitizeCourseFolder(courseName);
  if (!folder) return url;

  const trimmed = url.trim();
  // Extract path portion
  let pathname = trimmed;
  let origin = "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      origin = parsed.origin;
      pathname = parsed.pathname;
    } catch {
      return url;
    }
  }

  if (!pathname.startsWith("/uploads/")) return url;

  const relPath = pathname.replace(/^\/uploads\/?/, "");
  // If already inside a subfolder (contains '/'), do not re-nest
  if (relPath.includes("/")) return url;

  const newPath = `/uploads/${folder}/${relPath}`;
  return origin ? `${origin}${newPath}` : newPath;
}
