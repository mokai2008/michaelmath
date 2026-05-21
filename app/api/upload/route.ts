import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const fileExt = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${filename}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let supabaseClient;

    if (serviceRoleKey) {
      // Service role key bypasses RLS — best option
      supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    } else {
      // Fallback: create client with user's JWT so storage RLS sees them as 'authenticated'
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (token) {
        supabaseClient = createClient(supabaseUrl, anonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
      } else {
        supabaseClient = createClient(supabaseUrl, anonKey);
      }
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from("course-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Return the public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from("course-assets")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file: " + error.message }, { status: 500 });
  }
}
