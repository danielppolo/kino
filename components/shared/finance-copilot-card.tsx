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
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    /\b(can i|should i|is it safe|afford|worth it|cut first|reduce|increase spending|safe to spend|invest|investment|portfolio|allocate|allocation|buy now|buy next|etf|bond|stock)\b/.test(
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
  tone = "default",
}: {
  title: string;
  icon: typeof BrainCircuit;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full border",
            tone === "warning"
              ? "border-amber-300/70 bg-amber-100/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <Text strong className="text-xs uppercase text-muted-foreground">
          {title}
        </Text>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "rounded-2xl border px-3 py-2.5 text-sm leading-6",
              tone === "warning"
                ? "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-border/70 bg-background/75 text-foreground/90",
            )}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightSurface({
  eyebrow,
  title,
  icon: Icon,
  className,
  children,
  badge,
}: {
  eyebrow?: string;
  title: string;
  icon: typeof BrainCircuit;
  className?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border shadow-sm",
        className,
      )}
    >
      <div className="border-b border-black/5 bg-gradient-to-r from-background/80 via-background/70 to-background/40 px-4 py-3 dark:border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-background/80">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              {eyebrow ? (
                <Text strong className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {eyebrow}
                </Text>
              ) : null}
              <Text strong className="text-sm">
                {title}
              </Text>
            </div>
          </div>
          {badge}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function KeyValueTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof BrainCircuit;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "warning"
          ? "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/25"
          : tone === "success"
            ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/25"
            : "border-border/70 bg-background/75",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-xl",
            tone === "warning"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
              : tone === "success"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </div>
        <Text strong className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </Text>
      </div>
      <Text className="text-sm leading-6">{value}</Text>
    </div>
  );
}

function RiskStack({
  title,
  items,
  emptyText,
}: {
  title?: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div className="space-y-3">
      {title ? (
        <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </Text>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-background px-3.5 py-3 text-sm leading-6 text-amber-950 shadow-sm dark:border-amber-900/50 dark:from-amber-950/35 dark:to-background dark:text-amber-100"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                  <AlertCircle className="size-4" />
                </div>
                <span>{item}</span>
              </div>
            </div>
          ))}
        </div>
      ) : emptyText ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-3">
          <Text muted className="text-sm leading-6">
            {emptyText}
          </Text>
        </div>
      ) : null}
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
                              <InsightSurface
                                eyebrow={intentLabel(reply.intent)}
                                title="Bottom Line"
                                icon={Gauge}
                                className="border-primary/20 bg-gradient-to-br from-primary/10 via-background/95 to-background text-foreground"
                                badge={
                                  <Badge
                                    variant={confidenceVariant(reply.confidence)}
                                    className="rounded-full px-2.5 py-1 text-[10px]"
                                  >
                                    {reply.confidence} confidence
                                  </Badge>
                                }
                              >
                                <Text className="text-sm leading-7">
                                  {reply.summary}
                                </Text>
                              </InsightSurface>

                              {reply.decision ? (
                                <InsightSurface
                                  title="Decision Factors"
                                  icon={Scale}
                                  className="border-border/70 bg-background/70 text-foreground"
                                >
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <KeyValueTile
                                      label="Recommendation"
                                      value={reply.decision.recommendation}
                                      icon={Scale}
                                      tone="success"
                                    />
                                    <KeyValueTile
                                      label="Impact Window"
                                      value={reply.decision.impactWindow}
                                      icon={CalendarRange}
                                    />
                                  </div>
                                  <div className="mt-3">
                                    <KeyValueTile
                                      label="Tradeoff"
                                      value={reply.decision.tradeoff}
                                      icon={ArrowUpRight}
                                      tone="warning"
                                    />
                                  </div>
                                </InsightSurface>
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
                              <RiskStack title="Watch-outs" items={reply.risks} />
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

                {error ? (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <Text destructive className="text-sm">
                      {error}
                    </Text>
                  </div>
                ) : null}
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-border/70 bg-muted/20 xl:flex xl:min-h-0 xl:flex-col">
          <div className="space-y-5 overflow-y-auto p-5">
            <Card className="overflow-hidden rounded-[28px] border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
              <CardHeader className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Gauge className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <Text strong className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Latest read
                      </Text>
                      <CardTitle className="text-base">Bottom Line</CardTitle>
                    </div>
                  </div>
                  {latestReply ? (
                    <Badge
                      variant={confidenceVariant(latestReply.confidence)}
                      className="rounded-full px-2.5 py-1 text-[10px]"
                    >
                      {latestReply.confidence}
                    </Badge>
                  ) : null}
                </div>
                <Text className="text-sm leading-7">
                  {latestReply?.summary ||
                    "Ask a question to see the latest recommendation, diagnosis, or forecast bottom line."}
                </Text>
                {latestReply ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {intentLabel(latestReply.intent)}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {walletId ? "Wallet scope" : "Workspace scope"}
                    </Badge>
                  </div>
                ) : null}
              </CardHeader>
            </Card>

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
              <div className="space-y-3 rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-sm">
                {latestReply?.decision ? (
                  <div className="space-y-3">
                    <div className="grid gap-3">
                      <KeyValueTile
                        label="Recommendation"
                        value={latestReply.decision.recommendation}
                        icon={Scale}
                        tone="success"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <KeyValueTile
                          label="Tradeoff"
                          value={latestReply.decision.tradeoff}
                          icon={ArrowUpRight}
                          tone="warning"
                        />
                        <KeyValueTile
                          label="Impact Window"
                          value={latestReply.decision.impactWindow}
                          icon={CalendarRange}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-3">
                    <Text muted className="text-sm leading-6">
                    Decision framing appears here when the assistant is answering a
                    recommendation-style question.
                    </Text>
                  </div>
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
                      <Text strong className="text-xs uppercase text-muted-foreground">
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
              <div className="space-y-4 rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-sm">
                <RiskStack
                  items={latestReply?.risks ?? []}
                  emptyText="Risks and uncertainty notes will appear here when relevant."
                />

                {latestReply?.analysis?.assumptions?.length ? (
                  <SectionList
                    title="Assumptions"
                    icon={CircleHelp}
                    items={latestReply.analysis.assumptions}
                    tone="warning"
                  />
                ) : null}

                {latestReply?.analysis?.missingData?.length ? (
                  <SectionList
                    title="Missing Data"
                    icon={FileWarning}
                    items={latestReply.analysis.missingData}
                    tone="warning"
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
