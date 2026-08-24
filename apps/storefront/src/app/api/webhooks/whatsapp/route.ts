import { NextRequest, NextResponse } from "next/server";
import { processSocialMessageWithAI } from "@/lib/ai-chat-orchestrator";

// GET: Meta Webhook Verification Handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "orizino_whatsapp_secure_webhook_token";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden: Invalid verify token" }, { status: 403 });
}

// POST: Process incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === "text") {
      const senderPhone = message.from;
      const messageText = message.text?.body || "";
      const senderName = value?.contacts?.[0]?.profile?.name || "";

      // Process message asynchronously through AI Orchestrator
      await processSocialMessageWithAI({
        channel: "whatsapp",
        senderId: senderPhone,
        senderName,
        messageText,
      });
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err: any) {
    console.error("WhatsApp Webhook Error:", err);
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 200 });
  }
}
