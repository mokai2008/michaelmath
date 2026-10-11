import { NextRequest, NextResponse } from "next/server";
import { stat, createReadStream, existsSync, readdir } from "fs";
import { promisify } from "util";
import path from "path";
import { Readable } from "stream";

const statAsync = promisify(stat);
const readdirAsync = promisify(readdir);

export const dynamic = "force-dynamic";

/**
 * Resolves a requested file path inside public/uploads, with smart fallback:
 * 1. If requested /uploads/course_name/video.mp4 exists, return it.
 * 2. If not found in subfolder, check if it still sits at root /uploads/video.mp4.
 * 3. If requested /uploads/video.mp4 (no folder), search subfolders to find where it was organized.
 */
async function resolveUploadFilePath(uploadsDir: string, slug: string[]): Promise<string | null> {
  const filename = slug.join("/");
  let candidatePath = path.normalize(path.join(uploadsDir, filename));

  // Security: prevent directory traversal
  if (!candidatePath.startsWith(uploadsDir)) {
    return null;
  }

  // 1. Direct hit
  if (existsSync(candidatePath)) {
    return candidatePath;
  }

  // 2. Fallback: single filename requested (/uploads/video.mp4), search subdirectories
  if (slug.length === 1) {
    const targetFilename = slug[0];
    try {
      const entries = await readdirAsync(uploadsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(uploadsDir, entry.name, targetFilename);
          if (existsSync(subPath)) {
            return subPath;
          }
        }
      }
    } catch {}
  }

  // 3. Fallback: nested path requested (/uploads/course_name/video.mp4), check root uploads directory
  if (slug.length > 1) {
    const targetFilename = slug[slug.length - 1];
    const rootPath = path.join(uploadsDir, targetFilename);
    if (existsSync(rootPath)) {
      return rootPath;
    }
  }

  return null;
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const slug = params.slug || [];
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filePath = await resolveUploadFilePath(uploadsDir, slug);

    if (!filePath) {
      return new NextResponse(null, { status: 404 });
    }

    const fileStats = await statAsync(filePath);
    if (!fileStats.isFile()) {
      return new NextResponse(null, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
      ".ogg": "video/ogg",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".mp3": "audio/mpeg",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": fileStats.size.toString(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const slug = params.slug || [];
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filePath = await resolveUploadFilePath(uploadsDir, slug);

    if (!filePath) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    let fileStats;
    try {
      fileStats = await statAsync(filePath);
    } catch {
      return new NextResponse("File Not Found", { status: 404 });
    }

    if (!fileStats.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileSize = fileStats.size;
    const ext = path.extname(filePath).toLowerCase();

    // Map common file types
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
      ".ogg": "video/ogg",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".mp3": "audio/mpeg",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const isVideo = contentType.startsWith("video/");

    const range = request.headers.get("range");

    // HTTP 206 Partial Content (Range request handling for fast video streaming)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Performance Optimization for Video:
      // If client requests open-ended range (e.g. "bytes=0-"), deliver a generous 6MB chunk.
      // This buffers 40+ seconds of HD video instantly while preventing full file download delay.
      if (isVideo && !parts[1]) {
        const MAX_CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB chunk
        if (end - start + 1 > MAX_CHUNK_SIZE) {
          end = start + MAX_CHUNK_SIZE - 1;
        }
      }

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse("Requested Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Accel-Buffering": "no", // Disable Nginx proxy buffering for zero-lag streaming
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // HTTP 200 standard full stream
    const fileStream = createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("Error serving upload file:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
