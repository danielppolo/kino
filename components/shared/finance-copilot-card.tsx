"use client";

import { Fragment, useMemo, useState, useTransition } from "react";

import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  ChevronRight,
  CircleDollarSign,
  Database,
  Info,
  Loader2,
  type LucideIcon,
  ShieldAlert,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <Text strong className="text-sm">
        {title}
      </Text>
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={`${segment}-${index}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
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
              className="overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        return (
          <p key={blockIndex}>
            {renderInlineMarkdown(block.content)}
          </p>
        );
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

  const suggestedPrompts = useMemo(
    () => (walletId ? WALLET_PROMPTS : WORKSPACE_PROMPTS),
    [walletId],
  );

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
            (_, index) => !(index === current.length - 1 && current[index]?.content === trimmed),
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
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/30">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
                <CardTitle className="text-xl">Finance Copilot</CardTitle>
              </div>
              <CardDescription className="max-w-3xl text-sm text-muted-foreground">
                Ask about runway, burn rate, forecast risk, spending tradeoffs, or
                category cuts. Answers stay advisory, structured, and grounded in
                the analytics context for {scopeLabel}.
              </CardDescription>
            </div>

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
        </CardHeader>

        <CardContent>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
            <div className="space-y-5">
              {messages.length === 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-xl border border-border/70 bg-background/70 p-4 text-left transition-colors hover:bg-accent"
                      onClick={() => sendMessage(prompt)}
                      disabled={isPending}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="size-4 text-primary" />
                        {prompt}
                      </div>
                      <Text muted className="mt-1 text-xs leading-5">
                        Use this as a starting question.
                      </Text>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1 [content-visibility:auto]">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        "rounded-2xl border p-4 md:p-5",
                        message.role === "user"
                          ? "ml-auto max-w-3xl border-primary/20 bg-primary/5"
                          : "max-w-4xl border-border/70 bg-background/85 shadow-sm",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Text strong className="text-sm">
                            {message.role === "user" ? "You" : "Copilot"}
                          </Text>
                          {message.reply ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex">
                                  <Badge
                                    variant={confidenceVariant(
                                      message.reply.confidence,
                                    )}
                                  >
                                    Confidence: {message.reply.confidence}
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
                      </div>

                      {message.role === "user" ? (
                        <Text className="whitespace-pre-wrap text-sm leading-6">
                          {message.content}
                        </Text>
                      ) : message.reply ? (
                        <div className="space-y-4">
                          {message.reply.evidence.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {message.reply.evidence.map((item) => (
                                <Tooltip key={`${item.label}-${item.value}`}>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                      <Badge
                                        variant="outline"
                                        className="cursor-default rounded-full px-3 py-1 text-[11px] tracking-[0.08em]"
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

                          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                            <SectionTitle icon={Bot} title="Answer" />
                            <MarkdownContent
                              content={message.reply.answer}
                              className="mt-2"
                            />
                          </div>

                          {message.reply.evidence.length > 0 ? (
                            <Collapsible defaultOpen>
                              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                                <CollapsibleTrigger className="group flex w-full items-center justify-between text-left">
                                  <SectionTitle
                                    icon={Database}
                                    title="Why This Answer"
                                  />
                                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-3">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {message.reply.evidence.map((item) => (
                                      <div
                                        key={`${item.label}-${item.value}-detail`}
                                        className="rounded-lg border border-border/70 bg-muted/40 p-3"
                                      >
                                        <Text muted className="text-[11px] uppercase">
                                          {item.label}
                                        </Text>
                                        <Text strong className="mt-1 text-sm">
                                          {item.value}
                                        </Text>
                                        <Text muted className="mt-1 text-xs leading-5">
                                          {item.detail}
                                        </Text>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ) : null}

                          {message.reply.risks.length > 0 ? (
                            <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                              <SectionTitle
                                icon={ShieldAlert}
                                title="Risks And Watch-outs"
                              />
                              <div className="mt-3 space-y-2">
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

                          {message.reply.recommendations.length > 0 ? (
                            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                              <SectionTitle icon={Target} title="Next Moves" />
                              <div className="mt-3 space-y-2">
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
                                    >
                                      {question}
                                    </Button>
                                  ),
                                )}
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <Text className="whitespace-pre-wrap text-sm leading-6">
                          {message.content}
                        </Text>
                      )}
                    </div>
                  ))}

                  {isPending ? (
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
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
                  ) : null}
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a financial question tied to your history or forecast..."
                  className="min-h-[104px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
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

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Text muted className="text-xs leading-5">
                    The copilot is advisory-only. It should not replace tax,
                    legal, or professional financial advice.
                  </Text>
                  <Button
                    type="button"
                    onClick={() => sendMessage(draft)}
                    disabled={isPending || !draft.trim()}
                  >
                    {isPending ? "Thinking..." : "Ask Copilot"}
                  </Button>
                </div>

                {error ? (
                  <Text destructive className="text-sm">
                    {error}
                  </Text>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle icon={Info} title="Context Used" />
                  <Badge variant="outline">
                    {briefingSummary?.baseCurrency || "USD"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-primary" />
                      <Text strong className="text-sm">
                        Scope
                      </Text>
                    </div>
                    <Text muted className="mt-2 text-xs leading-5">
                      {briefingSummary?.scopeLabel || scopeLabel}
                    </Text>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="size-4 text-primary" />
                        <Text strong className="text-sm">
                          Total balance
                        </Text>
                      </div>
                      <Text className="mt-2 text-sm">
                        {briefingSummary
                          ? formatMoney(
                              briefingSummary.totalBalanceCents,
                              briefingSummary.baseCurrency,
                            )
                          : "Ask a question to load"}
                      </Text>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-primary" />
                        <Text strong className="text-sm">
                          Total owed
                        </Text>
                      </div>
                      <Text className="mt-2 text-sm">
                        {briefingSummary
                          ? formatMoney(
                              briefingSummary.totalOwedCents,
                              briefingSummary.baseCurrency,
                            )
                          : "Ask a question to load"}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <SectionTitle icon={Database} title="Notable Signals" />
                <div className="mt-3 space-y-2">
                  {(briefingSummary?.notableSignals.length
                    ? briefingSummary.notableSignals
                    : [
                        "The copilot will pin notable balance, risk, and forecast signals here after the first response.",
                      ]
                  ).map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-border/70 bg-muted/30 p-3"
                    >
                      <Text muted className="text-xs leading-5">
                        {signal}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <SectionTitle icon={Sparkles} title="Suggested Questions" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={`side-${prompt}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(prompt)}
                      disabled={isPending}
                      className="h-auto whitespace-normal py-2 text-left"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
