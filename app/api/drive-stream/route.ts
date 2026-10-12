import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * High-speed proxy stream for Google Drive video files.
 * Streams video chunks directly to the HTML5 player with Range/206 Partial Content support,
 * completely bypassing Safari third-party cookie restrictions, Google login prompts, and iframe blocks.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let fileId = searchParams.get("id");
    const rawUrl = searchParams.get("url");

    if (!fileId && rawUrl) {
      const fileMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const openMatch = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      fileId = fileMatch ? fileMatch[1] : (openMatch ? openMatch[1] : null);
    }

    if (!fileId || typeof fileId !== "string" || !fileId.match(/^[a-zA-Z0-9_-]+$/)) {
      return new NextResponse("Invalid or missing Google Drive file ID", { status: 400 });
    }

    const clientRange = request.headers.get("range");
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // 1. Initial request to Google Drive download URL
    const targetUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    const reqHeaders: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "*/*",
    };
    if (clientRange) {
      reqHeaders["Range"] = clientRange;
    }

    let res = await fetch(targetUrl, {
      headers: reqHeaders,
      redirect: "manual",
    });

    let cookies = res.headers.get("set-cookie") || "";

    // Follow redirects manually while preserving session cookies (drive.google.com -> drive.usercontent.google.com)
    let redirectCount = 0;
    while (res.status >= 300 && res.status < 400 && redirectCount < 5) {
      redirectCount++;
      const location = res.headers.get("location");
      if (!location) break;

      const newCookies = res.headers.get("set-cookie");
      if (newCookies) {
        cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
      }

      const nextHeaders: Record<string, string> = {
        "User-Agent": userAgent,
        Accept: "*/*",
      };
      if (cookies) {
        nextHeaders["Cookie"] = cookies;
      }
      if (clientRange) {
        nextHeaders["Range"] = clientRange;
      }

      res = await fetch(location, {
        headers: nextHeaders,
        redirect: "manual",
      });
    }

    // 2. Check if Google Drive returned an HTML confirmation page (e.g. large file virus scan notice)
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const htmlText = await res.text();

      // Look for confirm token in cookies or HTML
      let confirmToken = "";
      const cookieMatch = cookies.match(/download_warning_[^=]+=([^;]+)/);
      if (cookieMatch) {
        confirmToken = cookieMatch[1];
      }
      if (!confirmToken) {
        const tokenMatch =
          htmlText.match(/confirm=([0-9A-Za-z_-]+)/) ||
          htmlText.match(/name="confirm"[^>]*value="([^"]+)"/);
        if (tokenMatch) {
          confirmToken = tokenMatch[1];
        }
      }

      if (confirmToken) {
        const confirmedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}`;
        const confirmedHeaders: Record<string, string> = {
          "User-Agent": userAgent,
          Accept: "*/*",
        };
        if (cookies) confirmedHeaders["Cookie"] = cookies;
        if (clientRange) confirmedHeaders["Range"] = clientRange;

        res = await fetch(confirmedUrl, {
          headers: confirmedHeaders,
          redirect: "follow",
        });
      }
    }

    if (!res.ok && res.status !== 206) {
      return new NextResponse("Unable to fetch media stream from source", { status: res.status });
    }

    const streamContentType = res.headers.get("content-type");
    if (streamContentType && streamContentType.includes("text/html")) {
      return new NextResponse("File requires direct user permission or is restricted", { status: 403 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    };

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    return new NextResponse(res.body, {
      status: res.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Error in drive-stream route:", error);
    return new NextResponse("Video streaming proxy error", { status: 500 });
  }
}
