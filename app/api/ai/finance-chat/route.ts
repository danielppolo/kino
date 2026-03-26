import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import {
  buildFinancialBriefing,
  buildFinanceSystemPrompt,
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
  answer: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  recommendations: z.array(z.string()).max(4),
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
    answer: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    recommendations: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
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
    "answer",
    "confidence",
    "recommendations",
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
    answer,
    confidence: "low",
    recommendations: [],
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
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as OpenAIResponsePayload;
  return { ok: response.ok, status: response.status, payload };
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
    const toolContext = await buildFinancialBriefing({
      walletId: body.walletId,
      from: body.from,
      to: body.to,
      timezone: body.timezone,
    });
    const { briefing } = toolContext;
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
              text: buildFinanceSystemPrompt(briefing),
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
