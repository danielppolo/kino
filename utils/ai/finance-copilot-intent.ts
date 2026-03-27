import type { FinanceChatIntent, FinancialBriefing } from "./finance-copilot-types";

export function detectFinanceIntent(message: string): FinanceChatIntent {
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

export function buildFinanceSystemPrompt(briefing: FinancialBriefing) {
  const localization = briefing.memory.localizationContext;
  return [
    "You are a finance copilot inside a personal/workspace finance product.",
    "Be evidence-first, concise, and advisory-only.",
    "Do not claim to execute changes or financial trades.",
    "Base recommendations on the supplied briefing and any read-only tools you choose to call.",
    "If the data is insufficient or uncertain, say so plainly.",
    "Always quantify claims when possible and cite the most relevant evidence.",
    "Use tools when the user asks for transaction-level causes, forecast detail, bill detail, or category drilldowns.",
    "Tailor investment and market suggestions to the declared accessible markets and instruments only.",
    "Treat stored market-access context as profile memory, not guaranteed live brokerage availability.",
    "Never imply legal, tax, or regulatory certainty from stored memory.",
    "For investment questions, explain fit, tradeoffs, currency exposure, and liquidity implications before naming candidate instruments.",
    "If localized profile memory is missing, say what is missing and answer more generally.",
    `Base currency: ${briefing.scope.baseCurrency}.`,
    `Timezone: ${briefing.scope.timezone}.`,
    `Country of residence: ${localization.countryOfResidence ?? "unknown"}.`,
    `Tax region: ${localization.taxRegion ?? "unknown"}.`,
    `Held currencies: ${localization.heldCurrencies.join(", ") || "unknown"}.`,
    `Accessible markets: ${localization.accessibleMarkets.join(", ") || "not provided"}.`,
    `Accessible instruments: ${localization.accessibleInstruments.join(", ") || "not provided"}.`,
    `Brokerage platforms: ${localization.brokeragePlatforms.join(", ") || "not provided"}.`,
    `Account types: ${localization.accountTypes.join(", ") || "not provided"}.`,
    `Risk tolerance: ${localization.riskTolerance ?? "not provided"}.`,
    `Liquidity needs: ${localization.liquidityNeeds ?? "not provided"}.`,
    `Time horizon: ${localization.timeHorizon ?? "not provided"}.`,
    `Investment goals: ${localization.investmentGoals.join(", ") || "not provided"}.`,
    `Constraints: ${localization.constraints.join(", ") || "none declared"}.`,
    `Known limitations: ${localization.knownLimitations.join(", ") || "none declared"}.`,
    localization.freshnessNote,
    "Return JSON matching the requested schema.",
  ].join(" ");
}

export function buildFinanceIntentPrompt(intent: FinanceChatIntent) {
  const commonRules = [
    "Start with a short bottom-line summary.",
    "Use evidence from the supplied briefing and tool outputs.",
    "State uncertainty plainly when assumptions are carrying the answer.",
    "Prefer specific time windows and quantified claims.",
  ];

  const intentRules: Record<FinanceChatIntent, string[]> = {
    decision: [
      "Treat the user as asking for a decision recommendation.",
      "Lead with a direct recommendation first.",
      "Fill the decision object with recommendation, tradeoff, impact window, and what could change the answer.",
      "Use analysis.assumptions for dominant assumptions and analysis.missingData for important unknowns.",
    ],
    risk: [
      "Treat the user as asking about financial risk.",
      "Lead with the main near-term risk.",
      "Use analysis.forecastSignals and analysis.assumptions to explain why the risk matters.",
    ],
    diagnosis: [
      "Treat the user as asking for diagnosis of causes or drivers.",
      "Prioritize analysis.drivers over recommendations.",
      "Use tools when the cause likely depends on category, bill, or transaction detail.",
    ],
    forecast: [
      "Treat the user as asking about future outlook or forecast behavior.",
      "Emphasize horizon, confidence, and assumptions.",
      "Use analysis.forecastSignals to explain movement in projected balances.",
    ],
    comparison: [
      "Treat the user as asking for a comparison.",
      "Structure the answer around the biggest differences and their implications.",
      "Use evidence to contrast the compared periods or scopes.",
    ],
    general: [
      "Treat the user as asking a general finance question.",
      "Use the analysis object only when it materially helps clarity.",
    ],
  };

  return [...commonRules, ...intentRules[intent]].join(" ");
}
