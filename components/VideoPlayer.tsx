"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  PlayCircle,
  Sliders,
  Check
} from "lucide-react";

interface VideoPlayerProps {
  url?: string | null;
  poster?: string | null;
  className?: string;
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Mobile-optimized HTML5 video player with generous touch scrubber,
 * 10-second fast-forward/rewind buttons, double-tap seek gestures,
 * speed adjustments, and playsinline support.
 */
function HTML5DirectVideo({
  url,
  poster,
  className = "w-full h-full",
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);
  const [useNativeControls, setUseNativeControls] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && !isScrubbing) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying, isScrubbing]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetHideTimer]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    setCurrentTime(videoRef.current.currentTime);

    // Update buffer progress
    if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedPercent((bufferedEnd / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.playbackRate = playbackRate;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetHideTimer();
  };

  const seekRelative = (deltaSeconds: number) => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const target = Math.max(0, Math.min(duration || current + deltaSeconds, current + deltaSeconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetHideTimer();
  };

  const changeSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSpeedMenu(false);
    resetHideTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current && !videoRef.current) return;

    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          // iOS Safari fallback
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.debug("Fullscreen toggle error:", err);
    }
    resetHideTimer();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Scrubber / Timeline dragging and tapping (touch and pointer supported)
  const calculateTimeFromPointer = (e: React.PointerEvent | PointerEvent) => {
    if (!timelineRef.current || !duration) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * duration;
  };

  const handlePointerDownTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    const targetTime = calculateTimeFromPointer(e);
    setScrubPreviewTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveTime = calculateTimeFromPointer(moveEvent);
      setScrubPreviewTime(moveTime);
      setCurrentTime(moveTime);
      if (videoRef.current) {
        videoRef.current.currentTime = moveTime;
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      const finalTime = calculateTimeFromPointer(upEvent);
      if (videoRef.current) {
        videoRef.current.currentTime = finalTime;
        setCurrentTime(finalTime);
      }
      setIsScrubbing(false);
      setScrubPreviewTime(null);
      resetHideTimer();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Double-tap left/right to skip 10s (YouTube / Netflix style)
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const isDoubleTap = now - lastTapRef.current.time < 320 && Math.abs(clickX - lastTapRef.current.x) < 50;

    lastTapRef.current = { time: now, x: clickX };

    if (isDoubleTap) {
      if (clickX < width * 0.4) {
        // Double tap left: rewind 10s
        seekRelative(-10);
        setDoubleTapFeedback('left');
        setTimeout(() => setDoubleTapFeedback(null), 650);
      } else if (clickX > width * 0.6) {
        // Double tap right: forward 10s
        seekRelative(10);
        setDoubleTapFeedback('right');
        setTimeout(() => setDoubleTapFeedback(null), 650);
      } else {
        // Center double tap: toggle play
        togglePlay();
      }
    } else {
      // Single tap: toggle controls visibility
      setShowControls((prev) => !prev);
      resetHideTimer();
    }
  };

  const displayTime = isScrubbing && scrubPreviewTime !== null ? scrubPreviewTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  if (useNativeControls) {
    return (
      <div className={`relative ${className} bg-black`}>
        <video
          ref={videoRef}
          src={url || ""}
          poster={poster || undefined}
          controls
          playsInline
          controlsList="nodownload"
          autoPlay={autoPlay}
          className="w-full h-full object-contain bg-black"
        />
        <button
          onClick={() => setUseNativeControls(false)}
          className="absolute top-2 right-2 z-20 text-[10px] bg-black/75 hover:bg-black text-white px-2 py-1 rounded border border-white/20"
        >
          Use Smart Player
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`relative ${className} bg-black overflow-hidden select-none group flex items-center justify-center`}
    >
      <video
        ref={videoRef}
        src={url || ""}
        poster={poster || undefined}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="metadata"
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Double Tap Visual Animation Feedback */}
      {doubleTapFeedback === 'left' && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white px-5 py-4 rounded-2xl animate-in zoom-in-75 duration-200">
          <RotateCcw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs font-black mt-1.5">-10s</span>
        </div>
      )}
      {doubleTapFeedback === 'right' && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white px-5 py-4 rounded-2xl animate-in zoom-in-75 duration-200">
          <RotateCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs font-black mt-1.5">+10s</span>
        </div>
      )}

      {/* Center Big Play Button (shown when paused or controls active) */}
      {(!isPlaying || showControls) && (
        <div 
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="pointer-events-auto p-4 md:p-5 rounded-full bg-black/70 hover:bg-primary text-white shadow-2xl backdrop-blur-xs transition-all hover:scale-110 active:scale-95 border border-white/20"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 md:w-10 md:h-10 fill-white" />
            ) : (
              <Play className="w-8 h-8 md:w-10 md:h-10 fill-white ml-1" />
            )}
          </button>
        </div>
      )}

      {/* Overlay Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 md:px-5 pt-8 pb-3 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Generous Touch Scrubber / Timeline Bar */}
        <div
          ref={timelineRef}
          onPointerDown={handlePointerDownTimeline}
          className="relative w-full py-3 cursor-pointer group/timeline touch-none flex items-center"
        >
          {/* Base Background Track */}
          <div className="w-full h-2 md:h-2.5 bg-white/20 rounded-full overflow-hidden relative">
            {/* Loaded/Buffered Track */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full transition-all"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Played Progress Track */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Draggable Scrubber Knob (Enlarged on mobile for comfortable touch dragging) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-lg ring-4 ring-primary/40 group-hover/timeline:scale-125 transition-transform pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center justify-between text-white text-xs gap-2 pt-1">
          {/* Left Controls: Play, Rewind 10s, Forward 10s, Time */}
          <div className="flex items-center gap-1.5 md:gap-3 flex-wrap">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Quick Rewind -10s button */}
            <button
              type="button"
              onClick={() => seekRelative(-10)}
              className="flex items-center gap-0.5 px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg font-bold text-[11px] transition-all"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>10s</span>
            </button>

            {/* Quick Forward +10s button */}
            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="flex items-center gap-0.5 px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg font-bold text-[11px] transition-all"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>10s</span>
            </button>

            {/* Current Time / Duration */}
            <span className="text-[11px] font-mono text-white/90 pl-1">
              {formatTime(displayTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Mute, Speed, Fullscreen */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-[11px] transition-colors"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-slate-900 border border-slate-700 rounded-xl py-1 shadow-2xl z-30 min-w-[90px] text-xs">
                  {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 ${
                        playbackRate === rate ? "text-primary font-bold" : "text-white/80"
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mute/Volume */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

  // OneDrive / SharePoint embed handler
  const isOneDrive = url.includes("onedrive.live.com") || url.includes("1drv.ms") || url.includes("sharepoint.com");
  if (isOneDrive) {
    let embedUrl = url;
    if (url.includes("onedrive.live.com/redir")) {
      embedUrl = url.replace("onedrive.live.com/redir", "onedrive.live.com/embed");
    } else if (url.includes("onedrive.live.com") && !url.includes("embed")) {
      embedUrl = url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
    }

    return (
      <div className={`relative ${className} bg-black overflow-hidden`}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      </div>
    );
  }

  // Direct HTML5 Video (Uploaded file, VPS video, mp4/webm/mov link)
  return (
    <HTML5DirectVideo
      url={url}
      poster={poster}
      className={className}
      autoPlay={autoPlay}
    />
  );
}
