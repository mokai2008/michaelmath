import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
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
