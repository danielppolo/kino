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
  BrainCircuit,
  CalendarRange,
  CircleHelp,
  FileWarning,
  Gauge,
  Loader2,
  Radar,
  Scale,
  SendHorizonal,
  Sparkles,
  TrendingUp,
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

type ChatIntent =
  | "decision"
  | "risk"
  | "diagnosis"
  | "forecast"
  | "comparison"
  | "general";

interface AssistantReply {
  intent: ChatIntent;
  answer: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  decision?: {
    recommendation: string;
    tradeoff: string;
    impactWindow: string;
    whatCouldChange: string;
  } | null;
  analysis?: {
    drivers: string[];
    assumptions: string[];
    forecastSignals: string[];
    missingData: string[];
  } | null;
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
  "Can I safely increase spending next month?",
  "What should I cut first to improve cash flow?",
  "What is my biggest financial risk in the next 3 months?",
  "Why does the forecast get worse later this quarter?",
];

const WALLET_PROMPTS = [
  "Can this wallet safely absorb more discretionary spending next month?",
  "What should I cut first in this wallet?",
  "What is the biggest near-term risk in this wallet?",
  "Why does this wallet forecast get worse later this quarter?",
];

function detectClientIntent(message: string): ChatIntent {
  const normalized = message.toLowerCase();

  if (
    /\b(can i|should i|is it safe|afford|worth it|cut first|reduce|increase spending|safe to spend)\b/.test(
      normalized,
    )
  ) {
    return "decision";
  }

  if (/\b(risk|risky|danger|watch|watch out|exposed|runway)\b/.test(normalized)) {
    return "risk";
  }

  if (
    /\b(forecast|projection|projected|next month|next quarter|later this quarter|trend)\b/.test(
      normalized,
    )
  ) {
    return "forecast";
  }

  if (/\b(compare|vs\b|versus|difference between)\b/.test(normalized)) {
    return "comparison";
  }

  if (
    /\b(why|what changed|what is driving|what's driving|driver|cause|diagnose)\b/.test(
      normalized,
    )
  ) {
    return "diagnosis";
  }

  return "general";
}

function confidenceVariant(confidence: AssistantReply["confidence"]) {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  return "outline";
}

function intentLabel(intent: ChatIntent) {
  switch (intent) {
    case "decision":
      return "Decision";
    case "risk":
      return "Risk";
    case "diagnosis":
      return "Diagnosis";
    case "forecast":
      return "Forecast";
    case "comparison":
      return "Comparison";
    default:
      return "General";
  }
}

function intentAccent(intent: ChatIntent) {
  switch (intent) {
    case "decision":
      return "border-primary/20 bg-primary/5";
    case "risk":
      return "border-amber-300/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20";
    case "diagnosis":
      return "border-sky-300/60 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20";
    case "forecast":
      return "border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20";
    case "comparison":
      return "border-violet-300/60 bg-violet-50/40 dark:border-violet-900/40 dark:bg-violet-950/20";
    default:
      return "border-border/70 bg-muted/45";
  }
}

function intentLoadingCopy(intent: ChatIntent | null) {
  switch (intent) {
    case "decision":
      return "evaluating the tradeoff and likely decision impact";
    case "risk":
      return "checking near-term risk signals and uncertainty";
    case "diagnosis":
      return "checking recent cash-flow drivers and changes";
    case "forecast":
      return "evaluating forecast direction and assumptions";
    case "comparison":
      return "comparing the strongest differences in the data";
    default:
      return "reasoning over your history and forecast";
  }
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

function SectionList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof BrainCircuit;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </Text>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{item}</span>
          </div>
        ))}
      </div>
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
  const [latestReply, setLatestReply] = useState<AssistantReply | null>(null);
  const [activeIntent, setActiveIntent] = useState<ChatIntent | null>(null);
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
    setActiveIntent(detectClientIntent(trimmed));

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
        setLatestReply(payload.reply ?? null);
        setActiveIntent(payload.reply?.intent ?? null);
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
      <div className="grid h-full min-h-0 gap-0 bg-background xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <div className="flex min-h-0 flex-col">
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
                        Decision-first advisory chat for {scopeLabel}
                      </Text>
                    </div>
                  </div>
                  <Text className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Ask what you can afford, what to cut first, where the near-term
                    risk is, or why the forecast is changing.
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
                  const reply = message.reply;

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
                              : `rounded-bl-md border ${intentAccent(reply?.intent ?? "general")}`,
                          )}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium">
                              {isUser ? "You" : "Copilot"}
                            </span>
                            {reply ? (
                              <>
                                <Badge
                                  variant="outline"
                                  className="rounded-full text-[10px]"
                                >
                                  {intentLabel(reply.intent)}
                                </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                      <Badge
                                        variant={confidenceVariant(reply.confidence)}
                                        className="rounded-full text-[10px]"
                                      >
                                        {reply.confidence} confidence
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Based on the current scope, analytics, and any
                                    tool drilldowns used.
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            ) : null}
                          </div>

                          {isUser ? (
                            <Text className="whitespace-pre-wrap text-sm leading-6 text-primary-foreground">
                              {message.content}
                            </Text>
                          ) : reply ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  Bottom Line
                                </Text>
                                <Text className="text-sm leading-6">{reply.summary}</Text>
                              </div>

                              {reply.decision ? (
                                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/55 p-3">
                                  <div className="flex items-center gap-2">
                                    <Scale className="size-4 text-primary" />
                                    <Text strong className="text-sm">
                                      Recommendation
                                    </Text>
                                  </div>
                                  <Text className="text-sm leading-6">
                                    {reply.decision.recommendation}
                                  </Text>
                                  <div className="grid gap-2 pt-1 md:grid-cols-2">
                                    <div>
                                      <Text strong className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                        Tradeoff
                                      </Text>
                                      <Text className="mt-1 text-sm leading-6">
                                        {reply.decision.tradeoff}
                                      </Text>
                                    </div>
                                    <div>
                                      <Text strong className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                        Impact Window
                                      </Text>
                                      <Text className="mt-1 text-sm leading-6">
                                        {reply.decision.impactWindow}
                                      </Text>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              <MarkdownContent
                                content={reply.answer}
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <Text className="whitespace-pre-wrap text-sm leading-6">
                              {message.content}
                            </Text>
                          )}
                        </div>

                        {reply ? (
                          <div className="space-y-3 px-1">
                            {reply.evidence.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {reply.evidence.map((item) => (
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

                            {reply.analysis?.drivers?.length ? (
                              <SectionList
                                title="Decision Factors"
                                icon={BrainCircuit}
                                items={reply.analysis.drivers}
                              />
                            ) : null}

                            {reply.risks.length > 0 ? (
                              <div className="space-y-2">
                                <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  Watch-outs
                                </Text>
                                <div className="space-y-2">
                                  {reply.risks.map((item) => (
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

                            {reply.followUpQuestions.length > 0 ? (
                              <>
                                <Separator />
                                <div className="flex flex-wrap gap-2">
                                  {reply.followUpQuestions.map((question) => (
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
                                  ))}
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
                        Copilot is {intentLoadingCopy(activeIntent)}
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
              <div className="flex items-end gap-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a financial decision or diagnostic question..."
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

        <aside className="hidden border-l border-border/70 bg-muted/20 xl:flex xl:min-h-0 xl:flex-col">
          <div className="space-y-5 overflow-y-auto p-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-primary" />
                <Text strong className="text-sm">
                  Bottom Line
                </Text>
              </div>
              <Text className="text-sm leading-6">
                {latestReply?.summary ||
                  "Ask a question to see the latest recommendation, diagnosis, or forecast bottom line."}
              </Text>
              {latestReply ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{intentLabel(latestReply.intent)}</Badge>
                  <Badge variant={confidenceVariant(latestReply.confidence)}>
                    {latestReply.confidence} confidence
                  </Badge>
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="size-4 text-primary" />
                <Text strong className="text-sm">
                  Scope
                </Text>
              </div>
              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-4">
                <Text className="text-sm leading-6">
                  {briefingSummary?.scopeLabel || scopeLabel}
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
                </div>
                {briefingSummary ? (
                  <div className="grid gap-2 pt-2">
                    <Text className="text-sm">
                      Balance{" "}
                      {formatMoney(
                        briefingSummary.totalBalanceCents,
                        briefingSummary.baseCurrency,
                      )}
                    </Text>
                    <Text className="text-sm">
                      Owed{" "}
                      {formatMoney(
                        briefingSummary.totalOwedCents,
                        briefingSummary.baseCurrency,
                      )}
                    </Text>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                <Text strong className="text-sm">
                  Decision Factors
                </Text>
              </div>
              <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                {latestReply?.decision ? (
                  <div className="space-y-3">
                    <div>
                      <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Recommendation
                      </Text>
                      <Text className="mt-1 text-sm leading-6">
                        {latestReply.decision.recommendation}
                      </Text>
                    </div>
                    <div>
                      <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Tradeoff
                      </Text>
                      <Text className="mt-1 text-sm leading-6">
                        {latestReply.decision.tradeoff}
                      </Text>
                    </div>
                    <div>
                      <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Impact Window
                      </Text>
                      <Text className="mt-1 text-sm leading-6">
                        {latestReply.decision.impactWindow}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <Text muted className="text-sm leading-6">
                    Decision framing appears here when the assistant is answering a
                    recommendation-style question.
                  </Text>
                )}

                {latestReply?.analysis?.drivers?.length ? (
                  <SectionList
                    title="Drivers"
                    icon={Radar}
                    items={latestReply.analysis.drivers}
                  />
                ) : null}
                {latestReply?.analysis?.forecastSignals?.length ? (
                  <SectionList
                    title="Forecast Signals"
                    icon={TrendingUp}
                    items={latestReply.analysis.forecastSignals}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-primary" />
                <Text strong className="text-sm">
                  Evidence
                </Text>
              </div>
              <div className="space-y-2">
                {latestReply?.evidence.length ? (
                  latestReply.evidence.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </Text>
                      <Text className="mt-1 text-sm">{item.value}</Text>
                      <Text muted className="mt-2 text-xs leading-5">
                        {item.detail}
                      </Text>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <Text muted className="text-sm leading-6">
                      Evidence cards will appear here after the first answer.
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileWarning className="size-4 text-primary" />
                <Text strong className="text-sm">
                  Watch-outs
                </Text>
              </div>
              <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                {latestReply?.risks.length ? (
                  latestReply.risks.map((risk) => (
                    <div key={risk} className="flex gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span>{risk}</span>
                    </div>
                  ))
                ) : (
                  <Text muted className="text-sm leading-6">
                    Risks and uncertainty notes will appear here when relevant.
                  </Text>
                )}

                {latestReply?.analysis?.assumptions?.length ? (
                  <SectionList
                    title="Assumptions"
                    icon={CircleHelp}
                    items={latestReply.analysis.assumptions}
                  />
                ) : null}

                {latestReply?.analysis?.missingData?.length ? (
                  <SectionList
                    title="Missing Data"
                    icon={FileWarning}
                    items={latestReply.analysis.missingData}
                  />
                ) : null}

                {briefingSummary?.notableSignals.length ? (
                  <SectionList
                    title="Scope Signals"
                    icon={Gauge}
                    items={briefingSummary.notableSignals}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}
