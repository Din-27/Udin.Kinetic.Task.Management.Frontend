"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface AIMarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

/**
 * Komponen untuk me-render format Markdown AI (Bold, Italic, Code, List, Headers, Quote)
 * dengan Rich Aesthetics (Linear/Asana styling) dan dark mode support.
 */
export function AIMarkdownRenderer({ content, isUser = false }: AIMarkdownRendererProps) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Pre-processing: bersihkan atau rapikan anomali LLM seperti ****//jawaban**** atau ****//jawabab****
  const normalizedContent = content
    .replace(/^(\*{2,4})\s*\/\/\s*jawaba?n:?\s*(\*{2,4})/gim, "**Jawaban:**")
    .replace(/(\*{2,4})\s*\/\/\s*jawaba?n:?\s*(\*{2,4})/gim, "**Jawaban:**");

  // Pisahkan blok code (```lang ... ```) dan teks normal
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: Array<{ type: "code" | "markdown"; language?: string; code?: string; text?: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(normalizedContent)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "markdown",
        text: normalizedContent.slice(lastIndex, match.index),
      });
    }

    blocks.push({
      type: "code",
      language: match[1] || "text",
      code: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalizedContent.length) {
    blocks.push({
      type: "markdown",
      text: normalizedContent.slice(lastIndex),
    });
  }

  return (
    <div className="space-y-2 text-xs leading-relaxed text-foreground select-text">
      {blocks.map((block, idx) => {
        if (block.type === "code" && block.code !== undefined) {
          return <CodeBlock key={idx} language={block.language} code={block.code} />;
        }
        return <MarkdownTextBlock key={idx} text={block.text || ""} />;
      })}
    </div>
  );
}

/**
 * Render teks baris per baris: Headers, Lists, Quotes, dan Paragraf.
 */
function MarkdownTextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let currentListItems: React.ReactNode[] = [];
  let isOrderedList = false;

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (isOrderedList) {
        renderedElements.push(
          <ol key={`ol-${renderedElements.length}`} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-muted-foreground marker:font-semibold">
            {currentListItems}
          </ol>
        );
      } else {
        renderedElements.push(
          <ul key={`ul-${renderedElements.length}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-muted-foreground">
            {currentListItems}
          </ul>
        );
      }
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // Baris kosong
    if (!trimmedLine) {
      flushList();
      continue;
    }

    // Horizontal Rule (---)
    if (/^---+$/.test(trimmedLine)) {
      flushList();
      renderedElements.push(<hr key={i} className="my-2 border-border/60" />);
      continue;
    }

    // Headers
    if (trimmedLine.startsWith("### ")) {
      flushList();
      renderedElements.push(
        <h4 key={i} className="text-xs font-bold text-foreground mt-2 mb-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0" />
          {renderInlineMarkdown(trimmedLine.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      flushList();
      renderedElements.push(
        <h3 key={i} className="text-xs font-bold text-foreground tracking-tight mt-2.5 mb-1">
          {renderInlineMarkdown(trimmedLine.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      flushList();
      renderedElements.push(
        <h2 key={i} className="text-sm font-extrabold text-foreground tracking-tight mt-3 mb-1.5 pb-1 border-b border-border/50">
          {renderInlineMarkdown(trimmedLine.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote (> ...)
    if (trimmedLine.startsWith("> ")) {
      flushList();
      renderedElements.push(
        <blockquote
          key={i}
          className="my-1.5 border-l-2 border-border bg-muted/30 px-2.5 py-1 text-muted-foreground italic rounded-r text-[11px]"
        >
          {renderInlineMarkdown(trimmedLine.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- atau *)
    const ulMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (isOrderedList) flushList();
      isOrderedList = false;
      currentListItems.push(
        <li key={`li-${i}`} className="text-xs leading-relaxed text-foreground">
          {renderInlineMarkdown(ulMatch[1])}
        </li>
      );
      continue;
    }

    // Ordered List (1. 2. dll)
    const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!isOrderedList) flushList();
      isOrderedList = true;
      currentListItems.push(
        <li key={`oli-${i}`} className="text-xs leading-relaxed text-foreground">
          {renderInlineMarkdown(olMatch[2])}
        </li>
      );
      continue;
    }

    // Paragraf biasa
    flushList();
    renderedElements.push(
      <p key={i} className="leading-relaxed">
        {renderInlineMarkdown(rawLine)}
      </p>
    );
  }

  flushList();

  return <>{renderedElements}</>;
}

/**
 * Render inline formatting:
 * - Bold: ****text****, ***text***, **text**, __text__
 * - Italic: *text*, _text_
 * - Inline Code: `code`
 * - Strikethrough: ~~text~~
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Regex menangkap inline elements
  // Group 1: 4/3/2 asterisks bold (e.g. ****text**** atau **text**)
  // Group 2: inline code (`code`)
  // Group 3: single asterisk italic (*text*)
  // Group 4: double underscores bold (__text__)
  // Group 5: strikethrough (~~text~~)
  const inlineRegex = /(\*{2,4}|_{2})([\s\S]+?)\1|`([^`]+)`|(\*{1}|_{1})([^*_]+?)\4|~~([\s\S]+?)~~/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, boldDelim, boldContent, codeContent, italicDelim, italicContent, strikeContent] = match;

    if (boldContent !== undefined) {
      // Periksa apakah ini tag penanda khusus seperti //jawaban atau 💡 Jawaban:
      const trimmedBold = boldContent.trim();
      const isJawabanBadge = /^\/?\/?\s*jawaba?n:?$/i.test(trimmedBold) || trimmedBold === "💡 Jawaban:";

      if (isJawabanBadge) {
        parts.push(
          <strong key={match.index} className="font-semibold text-foreground mr-1">
            Jawaban:
          </strong>
        );
      } else {
        parts.push(
          <strong key={match.index} className="font-semibold text-foreground">
            {renderInlineMarkdown(boldContent)}
          </strong>
        );
      }
    } else if (codeContent !== undefined) {
      parts.push(
        <code
          key={match.index}
          className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/70 font-medium"
        >
          {codeContent}
        </code>
      );
    } else if (italicContent !== undefined) {
      parts.push(
        <em key={match.index} className="italic text-foreground/90">
          {italicContent}
        </em>
      );
    } else if (strikeContent !== undefined) {
      parts.push(
        <span key={match.index} className="line-through text-muted-foreground">
          {strikeContent}
        </span>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Komponen Code Block dengan bar bahasa dan copy button.
 */
function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/80 bg-zinc-950 text-zinc-100 overflow-hidden my-2 shadow-sm font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-muted-foreground" />
          <span className="uppercase tracking-wider font-semibold">{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-emerald-400 text-[9px]">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-2.5 w-2.5" />
              <span className="text-[9px]">Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}
