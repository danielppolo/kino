import type { AssistantReply, ChatIntent } from "./types";

export function detectClientIntent(message: string): ChatIntent {
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

export function confidenceVariant(confidence: AssistantReply["confidence"]) {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  return "outline";
}

export function intentLabel(intent: ChatIntent) {
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

export function intentAccent(intent: ChatIntent) {
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

export function intentLoadingCopy(intent: ChatIntent | null) {
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

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
