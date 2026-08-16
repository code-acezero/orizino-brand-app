import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Steadfast Courier Webhook Handler
// POST https://shop.orizino.com/api/webhooks/steadfast
//
// Matches official Steadfast Courier Limited API v1 Webhook Response Specification:
//
// 1. Delivery Status Update:
// {
//   "notification_type": "delivery_status",
//   "consignment_id": 12345,
//   "invoice": "INV-67890",
//   "cod_amount": 1500.00,
//   "status": "Delivered",
//   "delivery_charge": 100.00,
//   "tracking_message": "Your package has been delivered successfully.",
//   "updated_at": "2025-03-02 12:45:30"
// }
//
// 2. Tracking Update:
// {
//   "notification_type": "tracking_update",
//   "consignment_id": 12345,
//   "invoice": "INV-67890",
//   "tracking_message": "Package arrived at the sorting center.",
//   "updated_at": "2025-03-02 13:15:00"
// }
// ---------------------------------------------------------------------------

const STEADFAST_STATUS_MAP: Record<string, string> = {
  pending:           "confirmed",
  in_review:         "processing",
  in_transit:        "shipped",
  out_for_delivery:  "shipped",
  delivered:         "delivered",
  partial_delivered: "shipped",
  cancelled:         "cancelled",
  unknown:           "processing",
  hold:              "processing",
};

export async function POST(req: NextRequest) {
  // ── 1. Verify Bearer token if configured ────────────────────────────────
  const secret = process.env.STEADFAST_WEBHOOK_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const incomingToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

  if (secret && incomingToken && incomingToken !== secret) {
    console.warn("[steadfast-webhook] Unauthorized: Bearer token mismatch");
    return NextResponse.json(
      { status: "error", message: "Unauthorized. Invalid Bearer Token." },
      { status: 401 }
    );
  }

  // ── 2. Parse JSON body ──────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const notificationType = String(body.notification_type || "delivery_status").toLowerCase().trim();
  const consignmentId = body.consignment_id ? String(body.consignment_id).trim() : "";
  const invoice = body.invoice ? String(body.invoice).trim() : "";
  const rawStatus = String(body.status || body.delivery_status || "").toLowerCase().trim();
  const trackingMessage = body.tracking_message ? String(body.tracking_message).trim() : null;
  const deliveryCharge = body.delivery_charge !== undefined && body.delivery_charge !== null ? Number(body.delivery_charge) : 0;
  const codAmount = body.cod_amount !== undefined && body.cod_amount !== null ? Number(body.cod_amount) : 0;

  if (!consignmentId && !invoice) {
    return NextResponse.json(
      { status: "error", message: "Missing consignment_id and invoice." },
      { status: 400 }
    );
  }

  console.log(`[steadfast-webhook] [${notificationType}] CID: ${consignmentId} | Invoice: ${invoice} | Status: ${rawStatus}`);

  // ── 3. Supabase Client (Service Role bypasses RLS) ──────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── 4. Locate the Shipment and Order ────────────────────────────────────
  let existingShipment: any = null;
  let order: any = null;

  // Try finding shipment by consignment_id
  if (consignmentId) {
    const { data } = await supabase
      .from("steadfast_shipments")
      .select("*")
      .eq("consignment_id", consignmentId)
      .maybeSingle();
    existingShipment = data;
  }

  // If not found by CID, try finding by invoice (order_number)
  if (!existingShipment && invoice) {
    const { data: ord } = await supabase
      .from("orders")
      .select("id, order_number, status, total")
      .eq("order_number", invoice)
      .maybeSingle();
    order = ord;

    if (order) {
      const { data: ship } = await supabase
        .from("steadfast_shipments")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      existingShipment = ship;
    }
  } else if (existingShipment?.order_id && !order) {
    const { data: ord } = await supabase
      .from("orders")
      .select("id, order_number, status, total")
      .eq("id", existingShipment.order_id)
      .maybeSingle();
    order = ord;
  }

  const targetOrderId = order?.id || existingShipment?.order_id;

  // ── 5. Insert or Update steadfast_shipments ─────────────────────────────
  if (existingShipment) {
    // Update existing record
    const updateData: any = {
      tracking_message: trackingMessage || existingShipment.tracking_message,
      raw_response: body,
      last_synced_at: new Date().toISOString(),
    };
    if (rawStatus) updateData.status = rawStatus;
    if (invoice) updateData.invoice = invoice;
    if (deliveryCharge) updateData.delivery_charge = deliveryCharge;
    if (codAmount) updateData.cod_amount = codAmount;
    if (consignmentId && !existingShipment.consignment_id) updateData.consignment_id = consignmentId;

    await supabase
      .from("steadfast_shipments")
      .update(updateData)
      .eq("id", existingShipment.id);
  } else if (targetOrderId) {
    // Insert new record linked to order
    await supabase
      .from("steadfast_shipments")
      .insert({
        order_id: targetOrderId,
        consignment_id: consignmentId || null,
        invoice: invoice || null,
        status: rawStatus || "pending",
        cod_amount: codAmount,
        delivery_charge: deliveryCharge,
        tracking_message: trackingMessage,
        raw_response: body,
        last_synced_at: new Date().toISOString(),
      });
  }

  // ── 6. Update customer order status ─────────────────────────────────────
  if (targetOrderId) {
    const orderUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    if (consignmentId) {
      orderUpdate.tracking_number = consignmentId;
      orderUpdate.tracking_courier = "steadfast";
    }

    // Map Steadfast status to store order status
    if (rawStatus) {
      const mappedStatus = STEADFAST_STATUS_MAP[rawStatus];
      if (mappedStatus) {
        orderUpdate.status = mappedStatus;
        if (rawStatus === "delivered") {
          orderUpdate.delivered_at = new Date().toISOString();
        }
      }
    }

    const { error: ordErr } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("id", targetOrderId)
      .not("status", "eq", "cancelled");

    if (ordErr) {
      console.error("[steadfast-webhook] Order update error:", ordErr.message);
    } else {
      console.log(`[steadfast-webhook] Order ${targetOrderId} updated:`, orderUpdate);
    }
  }

  // ── 7. Respond with official Steadfast Success format ───────────────────
  return NextResponse.json(
    {
      status: "success",
      message: "Webhook received successfully.",
    },
    { status: 200 }
  );
}

// Steadfast may send GET or HEAD to verify webhook availability
export async function GET() {
  return NextResponse.json(
    {
      status: "success",
      message: "Steadfast webhook endpoint is active and listening.",
      endpoint: "https://shop.orizino.com/api/webhooks/steadfast",
    },
    { status: 200 }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
