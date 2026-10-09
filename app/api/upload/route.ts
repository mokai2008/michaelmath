import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

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

    // Extract safe filename (strips any ../ directory traversal)
    const filename = path.basename(pathname);
    if (!filename || filename === "." || filename === ".." || filename.startsWith(".")) return;

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsDir, filename);

    // Prevent deleting the file we just uploaded
    if (currentNewFileDiskPath && targetPath === path.resolve(currentNewFileDiskPath)) {
      return;
    }

    // Must strictly be inside uploadsDir
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      return;
    }

    if (existsSync(targetPath)) {
      const stats = await stat(targetPath);
      if (stats.isFile()) {
        await unlink(targetPath);
        console.log(`[Upload] Successfully deleted replaced/old file from disk: ${filename}`);
      }
    }
  } catch (err) {
    console.warn("[Upload] Failed to safely delete old upload:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const oldUrls = formData.getAll("oldUrl");
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate safe unique filename
    const origExt = file.name ? file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') : '';
    const fileExt = origExt || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Target directory: public/uploads on the VPS disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const diskPath = path.join(uploadsDir, filename);

    // Stream directly to VPS disk for high performance, fast IO, and low memory usage
    if (typeof file.stream === "function") {
      const stream = Readable.fromWeb(file.stream() as any);
      await pipeline(stream, createWriteStream(diskPath));
    } else {
      const bytes = await file.arrayBuffer();
      await writeFile(diskPath, Buffer.from(bytes));
    }

    // If previous files were replaced, delete them to free up disk space on the VPS
    for (const oldUrl of oldUrls) {
      if (typeof oldUrl === "string") {
        await safelyDeleteUpload(oldUrl, diskPath);
      }
    }

    // Return public relative path served directly by VPS Nginx / Next.js
    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({ url: publicUrl, path: publicUrl });
  } catch (error: any) {
    console.error("VPS Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file to VPS: " + error.message },
      { status: 500 }
    );
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
