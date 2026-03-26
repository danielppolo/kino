"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  Loader2,
  SendHorizonal,
  Sparkles,
  User2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface FinanceCopilotCardProps {
  walletId?: string;
  from?: string;
  to?: string;
  scopeLabel: string;
}

interface AssistantReply {
  answer: string;
  confidence: "low" | "medium" | "high";
  recommendations: string[];
  risks: string[];
  evidence: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  followUpQuestions: string[];
}

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
}

interface BriefingSummary {
  scopeLabel: string;
  baseCurrency: string;
  totalBalanceCents: number;
  totalOwedCents: number;
  notableSignals: string[];
}

const WORKSPACE_PROMPTS = [
  "What is the biggest financial risk in the next 3 months?",
  "Can I safely increase discretionary spending next month?",
  "Which category should I cut first to improve cash flow?",
  "What is driving my burn rate recently?",
];

const WALLET_PROMPTS = [
  "How healthy is this wallet over the next 3 months?",
  "What is the biggest drag on this wallet right now?",
  "What does the recent forecast suggest I should watch closely?",
  "Which expenses in this wallet look most worth reducing?",
];

function confidenceVariant(confidence: AssistantReply["confidence"]) {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  return "outline";
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

function MarkdownContent({
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

      blocks.push({
        type: "code",
        content: codeLines.join("\n"),
      });
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

export function FinanceCopilotCard({
  walletId,
  from,
  to,
  scopeLabel,
}: FinanceCopilotCardProps) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [briefingSummary, setBriefingSummary] = useState<BriefingSummary | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const threadRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = useMemo(
    () => (walletId ? WALLET_PROMPTS : WORKSPACE_PROMPTS),
    [walletId],
  );

  useEffect(() => {
    const container = threadRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isPending]);

  const sendMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const conversationHistory = messages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    const nextUserMessage: UiMessage = {
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, nextUserMessage]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/finance-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            history: conversationHistory,
            walletId,
            from,
            to,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            previousResponseId: responseId ?? undefined,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Finance copilot request failed.");
        }

        setResponseId(
          typeof payload?.responseId === "string" ? payload.responseId : null,
        );
        setBriefingSummary(payload.briefing ?? null);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: payload.reply.answer,
            reply: payload.reply,
          },
        ]);
      } catch (sendError) {
        setMessages((current) =>
          current.filter(
            (_, index) =>
              !(index === current.length - 1 && current[index]?.content === trimmed),
          ),
        );
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Finance copilot request failed.",
        );
      }
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div
          ref={threadRef}
          className="flex-1 space-y-6 overflow-y-auto px-4 py-5 [content-visibility:auto] md:px-6"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <Text strong className="text-base">
                      Finance Copilot
                    </Text>
                    <Text muted className="text-sm">
                      Advisory chat for {scopeLabel}
                    </Text>
                  </div>
                </div>
                <Text className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Ask about runway, forecast risk, spending tradeoffs, category
                  cuts, or the recent drivers behind cash flow changes.
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {walletId ? "Wallet scope" : "Workspace scope"}
                  </Badge>
                  {from && to ? (
                    <Badge variant="secondary">
                      {from} to {to}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">All available history</Badge>
                  )}
                  {briefingSummary ? (
                    <Badge variant="outline">
                      Balance{" "}
                      {formatMoney(
                        briefingSummary.totalBalanceCents,
                        briefingSummary.baseCurrency,
                      )}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    className="h-auto whitespace-normal rounded-full px-4 py-2 text-left"
                    onClick={() => sendMessage(prompt)}
                    disabled={isPending}
                  >
                    <Sparkles className="mr-2 size-4 shrink-0 text-primary" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "flex w-full gap-3",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isUser ? (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="size-5" />
                      </div>
                    ) : null}

                    <div className="max-w-[min(82%,48rem)] space-y-3">
                      <div
                        className={cn(
                          "rounded-3xl px-4 py-3 shadow-sm",
                          isUser
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/70 bg-muted/45",
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs">
                          <span className="font-medium">
                            {isUser ? "You" : "Copilot"}
                          </span>
                          {message.reply ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex">
                                  <Badge
                                    variant={confidenceVariant(
                                      message.reply.confidence,
                                    )}
                                    className="rounded-full text-[10px]"
                                  >
                                    {message.reply.confidence} confidence
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Based on the current scope, available analytics,
                                and any tool drilldowns used.
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>

                        {isUser ? (
                          <Text className="whitespace-pre-wrap text-sm leading-6 text-primary-foreground">
                            {message.content}
                          </Text>
                        ) : message.reply ? (
                          <MarkdownContent content={message.reply.answer} />
                        ) : (
                          <Text className="whitespace-pre-wrap text-sm leading-6">
                            {message.content}
                          </Text>
                        )}
                      </div>

                      {message.reply ? (
                        <div className="space-y-3 px-1">
                          {message.reply.evidence.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {message.reply.evidence.map((item) => (
                                <Tooltip key={`${item.label}-${item.value}`}>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                      <Badge
                                        variant="outline"
                                        className="cursor-default rounded-full px-3 py-1 text-[11px] tracking-[0.04em]"
                                      >
                                        {item.label}: {item.value}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    {item.detail}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          ) : null}

                          {message.reply.recommendations.length > 0 ? (
                            <div className="space-y-2">
                              <Text
                                strong
                                className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
                              >
                                Next Moves
                              </Text>
                              <div className="space-y-2">
                                {message.reply.recommendations.map((item) => (
                                  <div
                                    key={item}
                                    className="flex gap-2 text-sm text-muted-foreground"
                                  >
                                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.reply.risks.length > 0 ? (
                            <div className="space-y-2">
                              <Text
                                strong
                                className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
                              >
                                Risks
                              </Text>
                              <div className="space-y-2">
                                {message.reply.risks.map((item) => (
                                  <div
                                    key={item}
                                    className="flex gap-2 text-sm text-muted-foreground"
                                  >
                                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.reply.followUpQuestions.length > 0 ? (
                            <>
                              <Separator />
                              <div className="flex flex-wrap gap-2">
                                {message.reply.followUpQuestions.map(
                                  (question) => (
                                    <Button
                                      key={question}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => sendMessage(question)}
                                      disabled={isPending}
                                      className="rounded-full"
                                    >
                                      {question}
                                    </Button>
                                  ),
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {isUser ? (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User2 className="size-5" />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {isPending ? (
                <div className="flex w-full justify-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </div>
                  <div className="w-full max-w-2xl rounded-3xl rounded-bl-md border border-border/70 bg-muted/45 px-4 py-3 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Copilot is reasoning over your history and forecast
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="mx-auto max-w-4xl space-y-3">
            {briefingSummary ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{briefingSummary.scopeLabel}</Badge>
                <Badge variant="secondary">
                  Balance{" "}
                  {formatMoney(
                    briefingSummary.totalBalanceCents,
                    briefingSummary.baseCurrency,
                  )}
                </Badge>
                <Badge variant="secondary">
                  Owed{" "}
                  {formatMoney(
                    briefingSummary.totalOwedCents,
                    briefingSummary.baseCurrency,
                  )}
                </Badge>
                {briefingSummary.notableSignals.slice(0, 2).map((signal) => (
                  <Badge key={signal} variant="outline" className="max-w-full">
                    {signal}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a financial question tied to your history or forecast..."
                className="min-h-[72px] resize-none rounded-3xl border-border/70 bg-muted/30 px-4 py-3 shadow-none focus-visible:ring-1"
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => sendMessage(draft)}
                disabled={isPending || !draft.trim()}
                size="icon"
                className="size-12 rounded-full"
              >
                <SendHorizonal className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <Text muted className="text-xs leading-5">
                The copilot is advisory-only. It should not replace tax, legal,
                or professional financial advice.
              </Text>
              {error ? (
                <Text destructive className="text-sm">
                  {error}
                </Text>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
