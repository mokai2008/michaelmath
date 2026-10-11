import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink, stat, rename, link } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { sanitizeFolderPath, sanitizeCourseFolder } from "@/lib/uploads";

export const dynamic = "force-dynamic";

async function safelyDeleteUpload(urlOrPath: string | null | undefined, currentNewFileDiskPath?: string) {
  if (!urlOrPath || typeof urlOrPath !== "string") return;
  try {
    const trimmed = urlOrPath.trim();
    if (!trimmed) return;

    // Parse URL if full URL or extract pathname
    let pathname = trimmed;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        pathname = new URL(trimmed).pathname;
      } catch {
        return;
      }
    }

    // Must be in the /uploads/ path
    if (!pathname.startsWith("/uploads/")) return;

    // Extract relative path within /uploads/, e.g. "year-1-pure-math/video.mp4" or "video.mp4"
    const relPath = pathname.replace(/^\/uploads\/?/, "");
    if (!relPath || relPath.includes("..")) return;

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsDir, relPath);

    // Prevent deleting the file we just uploaded
    if (currentNewFileDiskPath && targetPath === path.resolve(currentNewFileDiskPath)) {
      return;
    }

    // Must strictly be inside uploadsDir (prevents path traversal)
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      return;
    }

    if (existsSync(targetPath)) {
      const stats = await stat(targetPath);
      if (stats.isFile()) {
        await unlink(targetPath);
        console.log(`[Upload] Successfully deleted replaced/old file from disk: ${relPath}`);
      }
    }
  } catch (err) {
    console.warn("[Upload] Failed to safely delete old upload:", err);
  }
}

/**
 * Organizes an unorganized file (sitting in /public/uploads/filename) into /public/uploads/<courseFolder>/filename.
 * If the file was already organized or doesn't exist in root, returns the updated URL structure.
 */
async function organizeUploadFile(url: string, courseName: string): Promise<string> {
  if (!url || typeof url !== "string" || !courseName) return url;
  const cleanFolder = sanitizeCourseFolder(courseName);
  if (!cleanFolder) return url;

  const trimmed = url.trim();
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
  // If already inside a subfolder, e.g. "year-1-pure-math/video.mp4", return as-is
  if (relPath.includes("/")) return url;

  const filename = path.basename(relPath);
  if (!filename || filename === "." || filename === ".." || filename.startsWith(".")) return url;

  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const oldDiskPath = path.resolve(uploadsDir, filename);
  const targetDir = path.resolve(uploadsDir, cleanFolder);
  const newDiskPath = path.resolve(targetDir, filename);

  try {
    await mkdir(targetDir, { recursive: true });
    if (existsSync(oldDiskPath)) {
      if (!existsSync(newDiskPath)) {
        await link(oldDiskPath, newDiskPath).catch(async () => {
          await rename(oldDiskPath, newDiskPath);
        });
      }
      console.log(`[Upload] Linked loose file ${filename} -> ${cleanFolder}/${filename}`);
    } else if (existsSync(newDiskPath) && !existsSync(oldDiskPath)) {
      await link(newDiskPath, oldDiskPath).catch(() => {});
    }
  } catch (err) {
    console.warn(`[Upload] Failed to organize file to ${cleanFolder}:`, err);
  }

  const newPath = `/uploads/${cleanFolder}/${filename}`;
  return origin ? `${origin}${newPath}` : newPath;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle JSON requests (e.g. organizing existing course uploads)
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      if (body?.action === "organize_course" && body.course_name && Array.isArray(body.urls)) {
        const mapping: Record<string, string> = {};
        for (const u of body.urls) {
          if (typeof u === "string") {
            mapping[u] = await organizeUploadFile(u, body.course_name);
          }
        }
        return NextResponse.json({ success: true, mapping });
      }
      return NextResponse.json({ error: "Unsupported JSON action" }, { status: 400 });
    }

    // Handle Multipart Form Data for File Uploads
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const oldUrls = formData.getAll("oldUrl");
    const courseName = (formData.get("course_name") || formData.get("courseTitle") || formData.get("folder") || "") as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine subfolder path, e.g. "year-1-pure-math" or "year-1-pure-math/submissions"
    const folderSlug = sanitizeFolderPath(courseName);

    // Generate safe unique filename
    const origExt = file.name ? file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') : '';
    const fileExt = origExt || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Target directory: public/uploads/<course_name> on the VPS disk
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const targetDir = folderSlug ? path.resolve(uploadsDir, folderSlug) : uploadsDir;
    await mkdir(targetDir, { recursive: true });

    const diskPath = path.join(targetDir, filename);

    // Stream directly to VPS disk for high performance, fast IO, and low memory usage
    if (typeof file.stream === "function") {
      const stream = Readable.fromWeb(file.stream() as any);
      await pipeline(stream, createWriteStream(diskPath));
    } else {
      const bytes = await file.arrayBuffer();
      await writeFile(diskPath, Buffer.from(bytes));
    }

    // Optimize MP4 container: ensure FastStart (moov atom at start of file) for instant web playback
    if (["mp4", "mov", "m4v"].includes(fileExt.toLowerCase())) {
      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        const fastStartPath = path.join(targetDir, `fast_${filename}`);
        
        // Relocates moov atom to beginning of MP4 in <0.5s without transcoding (-c copy)
        await execAsync(`ffmpeg -y -i "${diskPath}" -c copy -movflags +faststart "${fastStartPath}"`, { timeout: 15000 });
        if (existsSync(fastStartPath)) {
          await rename(fastStartPath, diskPath);
          console.log(`[Upload] Applied FastStart (+faststart) to ${folderSlug ? folderSlug + '/' : ''}${filename}`);
        }
      } catch (fastStartErr) {
        console.debug("[Upload] FastStart skipped/unavailable:", fastStartErr);
      }
    }

    // Ensure backwards compatibility: create root hard link if inside a subfolder
    if (folderSlug) {
      const rootDiskPath = path.resolve(uploadsDir, filename);
      if (!existsSync(rootDiskPath)) {
        await link(diskPath, rootDiskPath).catch(() => {});
      }
    }

    // If previous files were replaced, delete them to free up disk space on the VPS
    for (const oldUrl of oldUrls) {
      if (typeof oldUrl === "string") {
        await safelyDeleteUpload(oldUrl, diskPath);
      }
    }

    // Return public relative path formatted with course name: /uploads/course_name/video_name
    const publicUrl = folderSlug ? `/uploads/${folderSlug}/${filename}` : `/uploads/${filename}`;

    return NextResponse.json({ url: publicUrl, path: publicUrl, folder: folderSlug });
  } catch (error: any) {
    console.error("VPS Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file to VPS: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === "organize_course" && body.course_name && Array.isArray(body.urls)) {
      const mapping: Record<string, string> = {};
      for (const u of body.urls) {
        if (typeof u === "string") {
          mapping[u] = await organizeUploadFile(u, body.course_name);
        }
      }
      return NextResponse.json({ success: true, mapping });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = body?.url || searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "No url provided" }, { status: 400 });
    }

    await safelyDeleteUpload(targetUrl);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
