"use client";

import { PlayCircle } from "lucide-react";

interface VideoPlayerProps {
  url?: string | null;
  poster?: string | null;
  className?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  url,
  poster,
  className = "w-full h-full",
  autoPlay = false,
}: VideoPlayerProps) {
  if (!url) {
    if (poster) {
      return (
        <img
          src={poster}
          alt="Video thumbnail"
          className={`${className} object-cover`}
        />
      );
    }
    return (
      <div className="w-full h-full bg-black/80 flex items-center justify-center flex-col text-white/50 p-6 text-center">
        <PlayCircle className="w-16 h-16 mb-2 text-white/40" />
        <p className="text-sm font-medium">No video available</p>
      </div>
    );
  }

  // YouTube embed handler
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYouTube) {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1]?.split(/[?&]/)[0];
    } else if (url.includes("/embed/")) {
      videoId = url.split("/embed/")[1]?.split(/[?&]/)[0];
    } else {
      videoId = url;
    }
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?hl=en&cc_lang_pref=en&modestbranding=1&rel=0&showinfo=0&fs=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&autoplay=${
      autoPlay ? 1 : 0
    }`;

    return (
      <div className={`relative ${className} bg-black overflow-hidden`}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {/* Transparent overlays to block YouTube logo & watch-on-youtube link */}
        <div className="absolute bottom-0 right-0 w-40 h-10 bg-transparent z-10 cursor-default" />
        <div className="absolute top-0 left-0 w-16 h-10 bg-transparent z-10 cursor-default" />
      </div>
    );
  }

  // Google Drive embed handler
  const isGoogleDrive = url.includes("drive.google.com");
  if (isGoogleDrive) {
    let fileId = "";
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    } else if (openMatch) {
      fileId = openMatch[1];
    }
    const embedUrl = fileId
      ? `https://drive.google.com/file/d/${fileId}/preview?hl=en`
      : (url.includes('?') ? `${url}&hl=en` : `${url}?hl=en`);

    return (
      <div className={`relative ${className} bg-black overflow-hidden`}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media"
          sandbox="allow-same-origin allow-scripts"
        />
        {/* Overlay to block Google Drive pop-out button in top-right */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-black z-10 cursor-default" />
      </div>
    );
  }

  // Direct HTML5 Video (Uploaded file or mp4/webm link)
  return (
    <video
      src={url}
      poster={poster || undefined}
      controls
      controlsList="nodownload"
      autoPlay={autoPlay}
      className={`${className} object-contain bg-black`}
    />
  );
}
