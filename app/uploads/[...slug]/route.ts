import { NextRequest, NextResponse } from "next/server";
import { stat, createReadStream } from "fs";
import { promisify } from "util";
import path from "path";
import { Readable } from "stream";

const statAsync = promisify(stat);

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const slug = params.slug || [];
    const filename = slug.join("/");

    // Target directory: public/uploads on the VPS disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.normalize(path.join(uploadsDir, filename));

    // Security: Prevent path traversal attacks
    if (!filePath.startsWith(uploadsDir)) {
      return new NextResponse("Forbidden", { status: 403 });
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
      // If client requests open-ended range (e.g. "bytes=0-"), clamp chunk size to ~2.5MB.
      // This delivers the first playable seconds in ~2s rather than waiting 20+ seconds for the entire file.
      if (isVideo && !parts[1]) {
        const MAX_CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB chunk
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
