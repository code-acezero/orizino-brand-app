import { NextRequest, NextResponse } from "next/server";
import { processSocialMessageWithAI } from "@/lib/ai-chat-orchestrator";

// GET: Meta Webhook Verification Handshake for Messenger & Instagram
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_CHAT_VERIFY_TOKEN || "orizino_meta_chat_secure_token";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden: Invalid verify token" }, { status: 403 });
}

// POST: Process incoming Messenger and Instagram DMs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isInstagram = body.object === "instagram";
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging && messaging.message && messaging.message.text && !messaging.message.is_echo) {
      const senderId = messaging.sender?.id;
      const messageText = messaging.message.text;

      await processSocialMessageWithAI({
        channel: isInstagram ? "instagram" : "messenger",
        senderId,
        messageText,
      });
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err: any) {
    console.error("Meta Chat Webhook Error:", err);
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 200 });
  }
}
