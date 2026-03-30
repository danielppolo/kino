export interface FinanceCopilotCardProps {
  walletId?: string;
  from?: string;
  to?: string;
  scopeLabel: string;
}

export type ChatIntent =
  | "decision"
  | "risk"
  | "diagnosis"
  | "forecast"
  | "comparison"
  | "general";

export interface AssistantReply {
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

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
}

export interface BriefingSummary {
  scopeLabel: string;
  baseCurrency: string;
  totalBalanceCents: number;
  totalOwedCents: number;
  totalEstimatedAssetValueCents: number;
  assetSignals: string[];
  notableSignals: string[];
}
