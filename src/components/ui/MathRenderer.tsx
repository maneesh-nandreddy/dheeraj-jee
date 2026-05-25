"use client";

import React from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export default function MathRenderer({ text, className = "", inline = false }: MathRendererProps) {
  // If explicitly requested to be fully inline math or if the text itself doesn't contain $ symbols
  if (inline) {
    try {
      const html = katex.renderToString(text, {
        displayMode: false,
        throwOnError: false,
      });
      return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (e) {
      console.error("Failed to render inline math", e);
      return <span className={className}>{text}</span>;
    }
  }

  // Parse text containing both regular text and $...$ / $$...$$ math blocks
  const parts: React.ReactNode[] = [];
  
  // Regex to split by display math ($$...$$) first, then inline math ($...$)
  // We use capturing parentheses so the matched delimiters are included in the split array
  const regex = /(\$\$.*?\$\$|\$.*?\$)/g;
  const splitText = text.split(regex);

  splitText.forEach((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      // Display math
      const math = part.slice(2, -2);
      try {
        const html = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
        });
        parts.push(
          <div
            key={index}
            className="my-3 overflow-x-auto py-1 scrollbar-thin max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (e) {
        console.error("Failed to render display math", e);
        parts.push(
          <div key={index} className="text-red-500 font-mono text-sm my-2">
            {part}
          </div>
        );
      }
    } else if (part.startsWith("$") && part.endsWith("$")) {
      // Inline math
      const math = part.slice(1, -1);
      try {
        const html = katex.renderToString(math, {
          displayMode: false,
          throwOnError: false,
        });
        parts.push(
          <span
            key={index}
            className="inline-block px-0.5 align-middle overflow-x-auto max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (e) {
        console.error("Failed to render inline math", e);
        parts.push(
          <span key={index} className="text-red-500 font-mono text-xs">
            {part}
          </span>
        );
      }
    } else {
      // Standard plain text, preserve line breaks
      if (part) {
        parts.push(
          <span key={index} className="whitespace-pre-line leading-relaxed">
            {part}
          </span>
        );
      }
    }
  });

  return <div className={`math-renderer ${className}`}>{parts}</div>;
}
