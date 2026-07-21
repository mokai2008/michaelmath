"use client";

import { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
  /** Use block-level element (div) instead of inline (span) */
  block?: boolean;
}

/**
 * Renders a string that may contain LaTeX math expressions.
 * 
 * Syntax:
 * - Inline math: $...$ (e.g., $x^2 + 3x - 5$)
 * - Display math: $$...$$ (e.g., $$\frac{a}{b}$$)
 * 
 * Non-math text passes through unchanged.
 * Invalid LaTeX renders as raw text with an error style.
 */
export default function MathText({ text, className = "", block = false }: MathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return "";

    // Split on $$...$$ (display) and $...$ (inline) while capturing delimiters
    // Process display math first ($$...$$), then inline ($...$)
    const parts: { type: "text" | "inline" | "display"; content: string }[] = [];
    
    // Regex: match $$...$$ or $...$, non-greedy
    const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = mathRegex.exec(text)) !== null) {
      // Add preceding text
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      
      const raw = match[0];
      if (raw.startsWith("$$") && raw.endsWith("$$")) {
        parts.push({ type: "display", content: raw.slice(2, -2) });
      } else {
        parts.push({ type: "inline", content: raw.slice(1, -1) });
      }
      
      lastIndex = match.index + raw.length;
    }
    
    // Add trailing text
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }
    
    // Render each part to HTML
    return parts
      .map((part) => {
        if (part.type === "text") {
          // Escape HTML in plain text
          return part.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }
        
        try {
          return katex.renderToString(part.content, {
            displayMode: part.type === "display",
            throwOnError: false,
            trust: false,
            strict: false,
          });
        } catch {
          // Fallback: show raw text with error styling
          const escaped = part.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<span style="color: #dc2626; font-family: monospace;">${part.type === "display" ? "$$" : "$"}${escaped}${part.type === "display" ? "$$" : "$"}</span>`;
        }
      })
      .join("");
  }, [text]);

  const Tag = block ? "div" : "span";

  if (!text) return null;

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
