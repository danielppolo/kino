import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import {
  buildFinancialBriefing,
  buildFinanceIntentPrompt,
  buildFinanceSystemPrompt,
  detectFinanceIntent,
  executeFinanceTool,
  type FinanceChatReply,
} from "@/utils/ai/finance-copilot";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(MessageSchema).max(8).default([]),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  previousResponseId: z.string().optional(),
});

const ReplySchema = z.object({
  intent: z.enum([
    "decision",
    "risk",
    "diagnosis",
    "forecast",
    "comparison",
    "general",
  ]),
  answer: z.string(),
  summary: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  decision: z
    .object({
      recommendation: z.string(),
      tradeoff: z.string(),
      impactWindow: z.string(),
      whatCouldChange: z.string(),
    })
    .nullable()
    .optional(),
  analysis: z
    .object({
      drivers: z.array(z.string()).max(5),
      assumptions: z.array(z.string()).max(4),
      forecastSignals: z.array(z.string()).max(4),
      missingData: z.array(z.string()).max(4),
    })
    .nullable()
    .optional(),
  risks: z.array(z.string()).max(4),
  evidence: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        detail: z.string(),
      }),
    )
    .max(6),
  followUpQuestions: z.array(z.string()).max(4),
});

const replyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: [
        "decision",
        "risk",
        "diagnosis",
        "forecast",
        "comparison",
        "general",
      ],
    },
    answer: { type: "string" },
    summary: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    decision: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            recommendation: { type: "string" },
            tradeoff: { type: "string" },
            impactWindow: { type: "string" },
            whatCouldChange: { type: "string" },
          },
          required: [
            "recommendation",
            "tradeoff",
            "impactWindow",
            "whatCouldChange",
          ],
        },
        { type: "null" },
      ],
    },
    analysis: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            drivers: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
            assumptions: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            forecastSignals: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            missingData: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
          },
          required: [
            "drivers",
            "assumptions",
            "forecastSignals",
            "missingData",
          ],
        },
        { type: "null" },
      ],
    },
    risks: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    evidence: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          detail: { type: "string" },
        },
        required: ["label", "value", "detail"],
      },
    },
    followUpQuestions: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
  },
  required: [
    "intent",
    "answer",
    "summary",
    "confidence",
    "decision",
    "analysis",
    "risks",
    "evidence",
    "followUpQuestions",
  ],
} as const;

const financeTools = [
  {
    type: "function",
    name: "get_financial_briefing",
    description:
      "Get the current workspace or wallet financial briefing for the active scope or a narrower scope.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        walletId: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
      },
      required: ["walletId", "from", "to"],
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_transactions",
    description:
      "Retrieve a small set of matching transactions for the current workspace or wallet scope.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        walletId: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
        categoryId: { type: ["string", "null"] },
        labelId: { type: ["string", "null"] },
        tag: { type: ["string", "null"] },
        type: {
          type: ["string", "null"],
          enum: ["income", "expense", "transfer", null],
        },
        description: { type: ["string", "null"] },
        limit: { type: ["number", "null"] },
      },
      required: [
        "walletId",
        "from",
        "to",
        "categoryId",
        "labelId",
        "tag",
        "type",
        "description",
        "limit",
      ],
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_category_drilldown",
    description:
      "Retrieve category-specific totals and example transactions for one category in the current scope.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        categoryId: { type: "string" },
        walletId: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
        limit: { type: ["number", "null"] },
      },
      required: ["categoryId", "walletId", "from", "to", "limit"],
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_forecast_details",
    description:
      "Retrieve forecast details, projected balances, and confidence for the current scope.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        horizonMonths: { type: ["number", "null"] },
        walletId: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
      },
      required: ["horizonMonths", "walletId", "from", "to"],
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_bill_overview",
    description:
      "Retrieve bill burden and post-bill cash flow metrics for the current scope.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        walletId: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
      },
      required: ["walletId", "from", "to"],
    },
    strict: true,
  },
] as const;

interface OpenAIResponsePayload {
  id?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    name?: string;
    arguments?: string;
    call_id?: string;
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

interface OpenAIFunctionCall {
  type: "function_call";
  name: string;
  arguments: string;
  call_id: string;
}

const OPENAI_MAX_RETRIES = 3;
const RETRYABLE_OPENAI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);

function extractFunctionCalls(payload: OpenAIResponsePayload) {
  return (payload.output ?? []).filter(
    (item): item is OpenAIFunctionCall =>
      item.type === "function_call" &&
      typeof item.name === "string" &&
      typeof item.arguments === "string" &&
      typeof item.call_id === "string",
  );
}

function extractOutputText(payload: any) {
  if (
    typeof payload?.output_text === "string" &&
    payload.output_text.length > 0
  ) {
    return payload.output_text;
  }

  const parts: string[] = [];

  (payload?.output ?? []).forEach((item: any) => {
    (item?.content ?? []).forEach((content: any) => {
      if (typeof content?.text === "string") {
        parts.push(content.text);
      }
    });
  });

  return parts.join("\n").trim();
}

function buildFallbackReply(answer: string): FinanceChatReply {
  return {
    intent: "general",
    answer,
    summary: answer,
    confidence: "low",
    decision: null,
    analysis: null,
    risks: [],
    evidence: [],
    followUpQuestions: [],
  };
}

function parseReply(outputText: string) {
  try {
    return ReplySchema.safeParse(JSON.parse(outputText));
  } catch {
    return ReplySchema.safeParse(null);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPromptBriefing(
  briefing: Awaited<ReturnType<typeof buildFinancialBriefing>>["briefing"],
) {
  return {
    scope: briefing.scope,
    currentPosition: briefing.currentPosition,
    historical: {
      monthsAvailable: briefing.historical.monthsAvailable,
      monthlyNet: briefing.historical.monthlyNet.slice(-6),
      trailing: briefing.historical.trailing,
    },
    forecast: {
      trainingMonths: briefing.forecast.trainingMonths,
      confidence: briefing.forecast.confidence,
      recoveryDetected: briefing.forecast.recoveryDetected,
      currentBalanceCents: briefing.forecast.currentBalanceCents,
      months: briefing.forecast.months.slice(0, 3),
    },
    composition: briefing.composition,
    recentTransactions: briefing.recentTransactions.slice(0, 4),
    notableSignals: briefing.notableSignals,
    memory: {
      profile: briefing.memory.profile,
      derivedContext: briefing.memory.derivedContext,
      localizationContext: briefing.memory.localizationContext,
    },
  };
}

function normalizeToolArgs(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeToolArgs(item));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeToolArgs(item),
      ]),
    );
  }
  return value;
}

async function createOpenAIResponse(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: OpenAIResponsePayload }> {
  let lastPayload: OpenAIResponsePayload = {};
  let lastStatus = 500;

  for (let attempt = 0; attempt < OPENAI_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      const payload = (await response.json()) as OpenAIResponsePayload;
      if (
        response.ok ||
        !RETRYABLE_OPENAI_STATUSES.has(response.status) ||
        attempt === OPENAI_MAX_RETRIES - 1
      ) {
        return { ok: response.ok, status: response.status, payload };
      }

      lastPayload = payload;
      lastStatus = response.status;
    } catch (error) {
      if (attempt === OPENAI_MAX_RETRIES - 1) {
        return {
          ok: false,
          status: 599,
          payload: {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "OpenAI request failed before receiving a response.",
            },
          },
        };
      }
    }

    await sleep(400 * (attempt + 1));
  }

  return { ok: false, status: lastStatus, payload: lastPayload };
}

async function createFallbackOpenAIResponse(params: {
  model: string;
  intentPrompt: string;
  previousResponseId?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  briefing: Awaited<ReturnType<typeof buildFinancialBriefing>>["briefing"];
}) {
  const slimBriefing = buildPromptBriefing(params.briefing);

  return createOpenAIResponse({
    model: params.model,
    ...(params.previousResponseId
      ? { previous_response_id: params.previousResponseId }
      : {}),
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              buildFinanceSystemPrompt(params.briefing),
              params.intentPrompt,
              "Do not call tools in this fallback path. Answer only from the provided briefing.",
            ].join(" "),
          },
        ],
      },
      ...params.history.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `User question: ${params.message}`,
              "",
              "Compact financial briefing JSON:",
              JSON.stringify(slimBriefing),
            ].join("\n"),
          },
        ],
      },
    ],
    store: true,
    max_output_tokens: 1000,
    text: {
      format: {
        type: "json_schema",
        name: "finance_copilot_reply",
        strict: true,
        schema: replyJsonSchema,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = RequestSchema.parse(await request.json());
    const briefingResult = await buildFinancialBriefing({
      walletId: body.walletId,
      from: body.from,
      to: body.to,
      timezone: body.timezone,
    });
    const { briefing } = briefingResult;
    const toolContext = {
      ...briefingResult,
      scope: {
        walletId: body.walletId,
        from: body.from,
        to: body.to,
        timezone: body.timezone,
      },
    };
    const detectedIntent = detectFinanceIntent(body.message);
    const intentPrompt = buildFinanceIntentPrompt(detectedIntent);
    const model =
      process.env.OPENAI_FINANCE_MODEL || process.env.OPENAI_MODEL || "gpt-5.4";

    let { ok, payload } = await createOpenAIResponse({
      model,
      ...(body.previousResponseId
        ? { previous_response_id: body.previousResponseId }
        : {}),
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [buildFinanceSystemPrompt(briefing), intentPrompt].join(
                " ",
              ),
            },
          ],
        },
        ...body.history.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
        })),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `User question: ${body.message}`,
                "",
                "Baseline financial briefing JSON:",
                JSON.stringify(briefing),
              ].join("\n"),
            },
          ],
        },
      ],
      tools: financeTools,
      store: true,
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "finance_copilot_reply",
          strict: true,
          schema: replyJsonSchema,
        },
      },
    });

    if (!ok) {
      ({ ok, payload } = await createFallbackOpenAIResponse({
        model,
        previousResponseId: body.previousResponseId,
        history: body.history,
        message: body.message,
        intentPrompt,
        briefing,
      }));
    }

    if (!ok) {
      return NextResponse.json(
        {
          error:
            payload?.error?.message ||
            "OpenAI request failed for finance chat.",
        },
        { status: 502 },
      );
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const functionCalls = extractFunctionCalls(payload);
      if (functionCalls.length === 0) break;

      const toolOutputs = await Promise.all(
        functionCalls.map(async (call) => {
          let args: unknown = {};

          try {
            args = normalizeToolArgs(JSON.parse(call.arguments));
          } catch {
            args = {};
          }

          try {
            const result = await executeFinanceTool(
              toolContext,
              call.name,
              args,
            );
            return {
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify(result),
            };
          } catch (toolError) {
            return {
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify({
                error:
                  toolError instanceof Error
                    ? toolError.message
                    : "Finance tool execution failed.",
              }),
            };
          }
        }),
      );

      const nextResponse = await createOpenAIResponse({
        model,
        previous_response_id:
          typeof payload.id === "string" ? payload.id : body.previousResponseId,
        input: toolOutputs,
        tools: financeTools,
        store: true,
        max_output_tokens: 1400,
        text: {
          format: {
            type: "json_schema",
            name: "finance_copilot_reply",
            strict: true,
            schema: replyJsonSchema,
          },
        },
      });

      ok = nextResponse.ok;
      payload = nextResponse.payload;

      if (!ok) {
        const fallbackResponse = await createFallbackOpenAIResponse({
          model,
          previousResponseId:
            typeof payload.id === "string"
              ? payload.id
              : body.previousResponseId,
          history: body.history,
          message: body.message,
          intentPrompt,
          briefing,
        });

        ok = fallbackResponse.ok;
        payload = fallbackResponse.payload;

        if (!ok) {
          return NextResponse.json(
            {
              error:
                payload?.error?.message ||
                "OpenAI request failed after finance tool execution.",
            },
            { status: 502 },
          );
        }
      }
    }

    const outputText = extractOutputText(payload);
    const parsed = parseReply(outputText);
    const reply = parsed.success
      ? parsed.data
      : buildFallbackReply(
          outputText || "I could not produce a structured answer.",
        );

    return NextResponse.json({
      responseId: typeof payload?.id === "string" ? payload.id : null,
      reply,
      briefing: {
        scopeLabel: briefing.scope.walletNames.join(", "),
        baseCurrency: briefing.scope.baseCurrency,
        totalBalanceCents: briefing.currentPosition.totalBalanceCents,
        totalOwedCents: briefing.currentPosition.totalOwedCents,
        notableSignals: briefing.notableSignals,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid finance chat request.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("Finance chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate a finance copilot response." },
      { status: 500 },
    );
  }
}
