"use client";

import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
}

/**
 * Renders text with embedded LaTeX math formulas.
 * Preferred delimiters: \( ... \) for inline and \[ ... \] for display.
 * Also supports $...$ and $$...$$, with a guard to avoid parsing currency like $12.
 * Non-math text is rendered as-is.
 */
export function MathText({ text, className, as: Tag = "span" }: MathTextProps) {
  if (!text) return null;

  const normalizeMathContent = (content: string) =>
    content
      // Some stored content may double-escape LaTeX commands like \\int or \\,.
      .replace(/\\\\(?=[A-Za-z])/g, "\\")
      .replace(/\\\\(?=[,;:!%])/g, "\\");

  // Some persisted content may contain double-escaped delimiters (e.g. "\\(").
  // Normalize them so both \(...\) and \\(...\\) render consistently.
  const normalizedText = text
    .replace(/\\{2,}(?=[()\[\]])/g, "\\");

  // Fast path when no known math delimiters exist.
  if (!normalizedText.includes("$") && !normalizedText.includes("\\(") && !normalizedText.includes("\\[")) {
    return <Tag className={className}>{normalizedText}</Tag>;
  }

  const parts: Array<{ type: "text" | "inline" | "display"; content: string }> = [];
  const tokenRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\d)([^\$]+?)\$)/g;
  let lastIndex = 0;

  for (const match of normalizedText.matchAll(tokenRegex)) {
    const token = match[0];
    const tokenStart = match.index ?? 0;

    if (tokenStart > lastIndex) {
      parts.push({ type: "text", content: normalizedText.slice(lastIndex, tokenStart) });
    }

    if (token.startsWith("$$")) {
      parts.push({ type: "display", content: normalizeMathContent(token.slice(2, -2)) });
    } else if (token.startsWith("\\[")) {
      parts.push({ type: "display", content: normalizeMathContent(token.slice(2, -2)) });
    } else if (token.startsWith("\\(")) {
      parts.push({ type: "inline", content: normalizeMathContent(token.slice(2, -2)) });
    } else {
      parts.push({ type: "inline", content: normalizeMathContent(token.slice(1, -1)) });
    }

    lastIndex = tokenStart + token.length;
  }

  if (lastIndex < normalizedText.length) {
    parts.push({ type: "text", content: normalizedText.slice(lastIndex) });
  }

  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }

        const displayMode = part.type === "display";
        try {
          const html = katex.renderToString(part.content, {
            displayMode,
            throwOnError: false,
            strict: false,
          });

          if (displayMode) {
            return (
              <span
                key={i}
                className="block my-2"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // Fallback: show raw LaTeX if rendering fails
          return (
            <code key={i} className="text-fun-red">
              {part.content}
            </code>
          );
        }
      })}
    </Tag>
  );
}
