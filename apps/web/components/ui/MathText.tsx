"use client";

import { Suspense } from "react";
import { readKatex } from "./katex-loader";

type Part = { type: "text" | "inline" | "display"; content: string };

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
 *
 * KaTeX is not in the page bundle: text without math never loads it, and text with
 * math renders the raw formulas until the KaTeX chunk is in (server-rendered math
 * stays as the server sent it while the chunk loads).
 */
export function MathText({ text, className, as: Tag = "span" }: MathTextProps) {
  if (!text) return null;

  const normalizePlainText = (content: string) =>
    // Treat escaped dollar in plain text as a literal currency symbol.
    content.replace(/\\\$/g, "$");

  const normalizeMathContent = (content: string) =>
    content
      // Some stored content may double-escape LaTeX commands like \\int or \\,.
      .replace(/\\\\(?=[A-Za-z])/g, "\\")
      .replace(/\\\\(?=[,;:!%])/g, "\\")
      .replace(/\\\\(?=\$)/g, "\\");

  // Some persisted content may contain double-escaped delimiters (e.g. "\\(").
  // Normalize them so both \(...\) and \\(...\\) render consistently.
  const normalizedText = text
    .replace(/\\{2,}(?=[()\[\]])/g, "\\");

  // Fast path when no known math delimiters exist.
  if (!normalizedText.includes("$") && !normalizedText.includes("\\(") && !normalizedText.includes("\\[")) {
    return <Tag className={className}>{normalizePlainText(normalizedText)}</Tag>;
  }

  const parts: Part[] = [];
  const tokenRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\d)([^\$]+?)\$)/g;
  let lastIndex = 0;

  for (const match of normalizedText.matchAll(tokenRegex)) {
    const token = match[0];
    const tokenStart = match.index ?? 0;

    if (tokenStart > lastIndex) {
      parts.push({
        type: "text",
        content: normalizePlainText(normalizedText.slice(lastIndex, tokenStart)),
      });
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
    parts.push({ type: "text", content: normalizePlainText(normalizedText.slice(lastIndex)) });
  }

  // Delimiter-like text with no actual formula (e.g. "$5 and $3"): no KaTeX needed.
  if (parts.every((part) => part.type === "text")) {
    return (
      <Tag className={className}>
        <RawParts parts={parts} />
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <Suspense fallback={<RawParts parts={parts} />}>
        <KatexParts parts={parts} />
      </Suspense>
    </Tag>
  );
}

/** Placeholder while KaTeX loads: the same text with the formulas' source. */
function RawParts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>{part.content}</span>
      ))}
    </>
  );
}

function KatexParts({ parts }: { parts: Part[] }) {
  const katex = readKatex();

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }

        const displayMode = part.type === "display";
        try {
          if (!katex) throw new Error("KaTeX unavailable");
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
    </>
  );
}
