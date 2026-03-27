import { Fragment } from "react";

import { cn } from "@/lib/utils";

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={`${segment}-${index}`}
          className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${segment}-${index}`}>{segment}</Fragment>;
  });
}

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.split("\n");
  const blocks: Array<
    | { type: "paragraph"; content: string }
    | { type: "unordered-list"; items: string[] }
    | { type: "ordered-list"; items: string[] }
    | { type: "code"; content: string }
    | { type: "heading"; content: string }
  > = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({ type: "code", content: codeLines.join("\n") });
      index += 1;
      continue;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      blocks.push({
        type: "heading",
        content: trimmed.replace(/^#{1,3}\s/, ""),
      });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,3}\s/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith("```")
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    });
  }

  return (
    <div className={cn("space-y-3 text-sm leading-6", className)}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <h4 key={blockIndex} className="text-sm font-semibold">
              {renderInlineMarkdown(block.content)}
            </h4>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={blockIndex} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-disc">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={blockIndex} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-decimal">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={blockIndex}
              className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-xs"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        return <p key={blockIndex}>{renderInlineMarkdown(block.content)}</p>;
      })}
    </div>
  );
}
