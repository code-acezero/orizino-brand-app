import { NextRequest, NextResponse } from "next/server";
import { processSocialMessageWithAI } from "@/lib/ai-chat-orchestrator";

// GET: Challenge check
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "TIKTOK_WEBHOOK_ACTIVE" }, { status: 200 });
}

// POST: Process TikTok DMs & Events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;
    const msg = body.data?.message;

    if (msg && msg.text) {
      const senderId = body.data?.from_user_id || "tiktok_user";
      await processSocialMessageWithAI({
        channel: "tiktok",
        senderId,
        messageText: msg.text,
      });
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (err: any) {
    console.error("TikTok Webhook Error:", err);
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 200 });
  }
}
