"use client";

import React from "react";

/**
 * PiIcon - Vector path for the mathematical Pi symbol,
 * matching the exact geometry of the brand favicon.
 */
export function PiIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M 100 178 C 100 152 122 136 154 136 L 368 136 C 394 136 412 148 412 168 C 412 186 396 196 374 196 L 348 196 L 348 316 C 348 350 368 366 394 366 C 404 366 414 362 420 354 C 424 372 408 388 384 388 C 332 388 296 354 296 312 L 296 196 L 224 196 L 208 336 C 206 356 192 368 172 368 C 150 368 138 354 140 338 L 158 196 L 126 196 C 108 196 100 188 100 178 Z" />
    </svg>
  );
}

/**
 * MathLogoBadge - The complete brand icon badge matching the favicon:
 * rich emerald gradient squircle with the white Pi glyph.
 */
export function MathLogoBadge({ 
  size = "md",
  className = "" 
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-7 h-7 rounded-lg p-1",
    md: "w-8 h-8 md:w-9 md:h-9 rounded-xl p-1.5 md:p-1.5",
    lg: "w-12 h-12 rounded-2xl p-2",
  };
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5 md:w-5.5 md:h-5.5",
    lg: "w-7 h-7",
  };

  return (
    <div 
      className={`bg-gradient-to-br from-[#42D894] via-[#34C585] to-[#1E9E64] text-white shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-md transition-all ${sizeClasses[size]} ${className}`}
    >
      <PiIcon className={`${iconSizes[size]} text-white drop-shadow-xs`} />
    </div>
  );
}
