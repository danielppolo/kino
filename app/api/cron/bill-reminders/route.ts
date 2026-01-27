import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

import { createClient } from "@/utils/supabase/server";

const formatBillMessage = (params: {
  description: string;
  amountCents: number;
  currency: string;
  dueDate: string;
}) => {
  const amount = params.amountCents / 100;
  const formattedAmount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: params.currency,
  }).format(amount);
  const formattedDate = new Date(params.dueDate).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `Recordatorio: la cuenta "${params.description}" por ${formattedAmount} vence el ${formattedDate}.`;
};

const sendTwilioMessage = async (params: {
  client: ReturnType<typeof twilio>;
  from: string;
  to: string;
  body: string;
}) => {
  await params.client.messages.create({
    from: params.from,
    to: params.to,
    body: params.body,
  });
};

async function handle(request: NextRequest) {
  if (
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: "Missing Twilio credentials" },
      { status: 500 },
    );
  }

  try {
    const twilioClient = twilio(accountSid, authToken);
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("id, wallet_id, description, amount_cents, currency, due_date")
      .eq("due_date", today);

    if (billsError) {
      throw new Error(billsError.message);
    }

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        success: true,
        messagesSent: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const walletIds = Array.from(new Set(bills.map((bill) => bill.wallet_id)));
    const { data: walletMembers, error: membersError } = await supabase
      .from("user_wallets")
      .select("user_id, wallet_id")
      .in("wallet_id", walletIds);

    if (membersError) {
      throw new Error(membersError.message);
    }

    const userIds = Array.from(
      new Set((walletMembers ?? []).map((member) => member.user_id)),
    );

    const { data: preferences, error: preferencesError } = await supabase
      .from("user_preferences")
      .select("user_id, phone")
      .in("user_id", userIds);

    if (preferencesError) {
      throw new Error(preferencesError.message);
    }

    const phoneByUserId = new Map(
      (preferences ?? [])
        .filter((pref) => pref.phone)
        .map((pref) => [pref.user_id, pref.phone as string]),
    );

    const membersByWallet = (walletMembers ?? []).reduce<
      Record<string, string[]>
    >((acc, member) => {
      const phone = phoneByUserId.get(member.user_id);
      if (!phone) return acc;
      acc[member.wallet_id] = acc[member.wallet_id] ?? [];
      acc[member.wallet_id].push(phone);
      return acc;
    }, {});

    const sentTracker = new Set<string>();
    let messagesSent = 0;
    const errors: string[] = [];

    for (const bill of bills) {
      const phones = membersByWallet[bill.wallet_id] ?? [];
      if (phones.length === 0) continue;
      const body = formatBillMessage({
        description: bill.description,
        amountCents: bill.amount_cents,
        currency: bill.currency,
        dueDate: bill.due_date,
      });

      for (const phone of phones) {
        const dedupeKey = `${bill.id}:${phone}`;
        if (sentTracker.has(dedupeKey)) continue;
        sentTracker.add(dedupeKey);
        try {
          await sendTwilioMessage({
            client: twilioClient,
            from: fromNumber,
            to: phone,
            body,
          });
          messagesSent += 1;
        } catch (error) {
          console.error("Failed to send SMS:", error);
          errors.push(`Failed to send SMS to ${phone}`);
        }
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      messagesSent,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bill reminders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
