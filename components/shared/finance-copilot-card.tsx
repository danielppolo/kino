"use client";

import { useMemo, useState, useTransition } from "react";

import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  Loader2,
  Sparkles,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
              category cuts. Answers stay advisory and use the current analytics
              context for {scopeLabel}.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{walletId ? "Wallet scope" : "Workspace scope"}</Badge>
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

      <CardContent className="space-y-5">
        {messages.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-lg border border-border/70 bg-background/70 p-4 text-left transition-colors hover:bg-accent"
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
          <div className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "rounded-xl border p-4",
                  message.role === "user"
                    ? "ml-auto max-w-3xl border-primary/20 bg-primary/5"
                    : "max-w-4xl border-border/70 bg-background/80",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Text strong className="text-sm">
                    {message.role === "user" ? "You" : "Copilot"}
                  </Text>
                  {message.reply ? (
                    <Badge variant={confidenceVariant(message.reply.confidence)}>
                      Confidence: {message.reply.confidence}
                    </Badge>
                  ) : null}
                </div>

                <Text className="whitespace-pre-wrap text-sm leading-6">
                  {message.content}
                </Text>

                {message.reply ? (
                  <div className="mt-4 space-y-4">
                    {message.reply.evidence.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {message.reply.evidence.map((item) => (
                          <div
                            key={`${item.label}-${item.value}`}
                            className="rounded-lg border border-border/70 bg-muted/40 p-3"
                          >
                            <Text muted className="text-[11px] uppercase tracking-[0.18em]">
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
                    ) : null}

                    {message.reply.recommendations.length > 0 ? (
                      <div className="space-y-2">
                        <Text strong className="text-sm">
                          Recommended next moves
                        </Text>
                        <div className="space-y-2">
                          {message.reply.recommendations.map((item) => (
                            <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {message.reply.risks.length > 0 ? (
                      <div className="space-y-2">
                        <Text strong className="text-sm">
                          Watch-outs
                        </Text>
                        <div className="space-y-2">
                          {message.reply.risks.map((item) => (
                            <div key={item} className="flex gap-2 text-sm text-muted-foreground">
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
                          {message.reply.followUpQuestions.map((question) => (
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
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}

            {isPending ? (
              <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Copilot is reasoning over your history and forecast
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a financial question tied to your history or forecast..."
            className="min-h-[104px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                sendMessage(draft);
              }
            }}
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Text muted className="text-xs leading-5">
              The copilot is advisory-only. It should not replace tax, legal, or
              professional financial advice.
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
      </CardContent>
    </Card>
  );
}
