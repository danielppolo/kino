"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowUpRight,
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
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import EmptyState from "@/components/shared/empty-state";
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

import { InsightSurface } from "./insight-surface";
import { KeyValueTile } from "./key-value-tile";
import { MarkdownContent } from "./markdown-content";
import { RiskStack } from "./risk-stack";
import { SectionList } from "./section-list";
import type {
  AssistantReply,
  BriefingSummary,
  ChatIntent,
  FinanceCopilotCardProps,
  UiMessage,
} from "./types";
import {
  confidenceVariant,
  detectClientIntent,
  formatMoney,
  intentAccent,
  intentLabel,
  intentLoadingCopy,
} from "./utils";

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
  const [briefingSummary, setBriefingSummary] = useState<BriefingSummary | null>(null);
  const [latestReply, setLatestReply] = useState<AssistantReply | null>(null);
  const [activeIntent, setActiveIntent] = useState<ChatIntent | null>(null);
  const [isPending, startTransition] = useTransition();
  const threadRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = walletId ? WALLET_PROMPTS : WORKSPACE_PROMPTS;

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
              <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
                <EmptyState
                  title="Finance Copilot"
                  description={`Decision-first advisory chat for ${scopeLabel}`}
                />
                <div className="flex flex-wrap justify-center gap-2">
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
                      <div className="max-w-[min(82%,48rem)] space-y-3">
                        <div
                          className={cn(
                            "rounded-3xl px-4 py-3 shadow-sm",
                            isUser
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : `rounded-bl-md border ${intentAccent(reply?.intent ?? "general")}`,
                          )}
                        >
                          {reply ? (
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
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
                            </div>
                          ) : null}

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
                                className="border-primary/20 bg-primary/5 text-foreground"
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
                    </div>
                  );
                })}

                {isPending ? (
                  <div className="flex w-full justify-start gap-3">
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
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-border/70 bg-muted/20 xl:flex xl:min-h-0 xl:flex-col">
          <div className="space-y-5 overflow-y-auto p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="size-4 text-primary" />
                  <Text strong className="text-sm">Bottom Line</Text>
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
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4 space-y-3">
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
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="size-4 text-primary" />
                <Text strong className="text-sm">Scope</Text>
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
                <Text strong className="text-sm">Decision Factors</Text>
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
                  <EmptyState
                    title="No Decision Framing Yet"
                    description="Decision framing appears here when the assistant is answering a recommendation-style question."
                  />
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
                <Text strong className="text-sm">Evidence</Text>
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
                  <EmptyState
                    title="No Evidence Yet"
                    description="Evidence cards will appear here after the first answer."
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileWarning className="size-4 text-primary" />
                <Text strong className="text-sm">Watch-outs</Text>
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
