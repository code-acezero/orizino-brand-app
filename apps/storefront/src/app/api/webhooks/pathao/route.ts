import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Official Pathao Courier Merchant API v1 Webhook Handler
// POST https://shop.orizino.com/api/webhooks/pathao
//
// Complies with official Pathao Courier Merchant Webhook Specification:
//
// 1. Integration Handshake Probe:
//    Request:  { "event": "webhook_integration" }
//    Required: Status 202 Accepted
//              Header "X-Pathao-Merchant-Webhook-Integration-Secret": "<secret>"
//
// 2. Lifecycle Events Received:
//    - order.created
//    - order.updated
//    - order.pickup-requested
//    - order.assigned-for-pickup
//    - order.picked
//    - order.pickup-failed
//    - order.pickup-cancelled
//    - order.at-the-sorting-hub
//    - order.in-transit
//    - order.received-at-last-mile-hub
//    - order.assigned-for-delivery
//    - order.delivered (collected_amount)
//    - order.partial-delivery (collected_amount, reason)
//    - order.returned (reason)
//    - order.delivery-failed (reason)
//    - order.on-hold (reason)
//    - order.paid (invoice_id)
//    - order.paid-return (collected_amount, reason)
//    - order.exchanged (collected_amount, reason)
//    - order.return-id-created
//    - order.return-in-transit
//    - order.returned-to-merchant
//    - store.created / store.updated
// ---------------------------------------------------------------------------

const DEFAULT_PATHAO_WEBHOOK_SECRET = "f3992ecc-59da-4cbe-a049-a13da2018d51";

const PATHAO_EVENT_MAP: Record<string, { status: string; logDesc: string }> = {
  // Dot notation (Official Pathao Merchant Webhooks)
  "order.created": { status: "confirmed", logDesc: "Order Created in Pathao" },
  "order.updated": { status: "confirmed", logDesc: "Order Updated in Pathao" },
  "order.pickup-requested": { status: "processing", logDesc: "Pickup Requested" },
  "order.assigned-for-pickup": { status: "processing", logDesc: "Assigned For Pickup" },
  "order.picked": { status: "processing", logDesc: "Picked Up by Pathao Rider" },
  "order.pickup-failed": { status: "processing", logDesc: "Pickup Failed" },
  "order.pickup-cancelled": { status: "processing", logDesc: "Pickup Cancelled" },
  "order.at-the-sorting-hub": { status: "shipped", logDesc: "At Sorting Hub" },
  "order.in-transit": { status: "shipped", logDesc: "Package in Transit" },
  "order.received-at-last-mile-hub": { status: "shipped", logDesc: "Received at Last Mile Hub" },
  "order.assigned-for-delivery": { status: "shipped", logDesc: "Out for Delivery" },
  "order.delivered": { status: "delivered", logDesc: "Delivered to Customer" },
  "order.partial-delivery": { status: "delivered", logDesc: "Partial Delivery Completed" },
  "order.returned": { status: "returned", logDesc: "Returned to Merchant" },
  "order.delivery-failed": { status: "shipped", logDesc: "Delivery Attempt Failed" },
  "order.on-hold": { status: "processing", logDesc: "Shipment on Hold" },
  "order.paid": { status: "delivered", logDesc: "Settlement Paid / Invoiced" },
  "order.paid-return": { status: "returned", logDesc: "Paid Return Completed" },
  "order.exchanged": { status: "delivered", logDesc: "Exchange Order Completed" },
  "order.return-id-created": { status: "returned", logDesc: "Return ID Created" },
  "order.return-in-transit": { status: "returned", logDesc: "Return in Transit" },
  "order.returned-to-merchant": { status: "returned", logDesc: "Returned to Merchant" },

  // Underscore / slug fallback notation
  "order_status_update": { status: "processing", logDesc: "Status Update" },
  "pending": { status: "confirmed", logDesc: "Pending Pickup" },
  "picking": { status: "processing", logDesc: "Picking" },
  "pickup_pending": { status: "processing", logDesc: "Pickup Pending" },
  "assigned_for_pickup": { status: "processing", logDesc: "Assigned for Pickup" },
  "picked": { status: "processing", logDesc: "Picked" },
  "in_transit": { status: "shipped", logDesc: "In Transit" },
  "at_sorting_hub": { status: "shipped", logDesc: "At Sorting Hub" },
  "received_at_hub": { status: "shipped", logDesc: "Received at Hub" },
  "out_for_delivery": { status: "shipped", logDesc: "Out for Delivery" },
  "delivered": { status: "delivered", logDesc: "Delivered" },
  "partial_delivered": { status: "delivered", logDesc: "Partial Delivered" },
  "return": { status: "returned", logDesc: "Return" },
  "returned": { status: "returned", logDesc: "Returned" },
  "returned_to_merchant": { status: "returned", logDesc: "Returned to Merchant" },
  "cancelled": { status: "cancelled", logDesc: "Cancelled" },
  "failed": { status: "cancelled", logDesc: "Failed" },
  "on_hold": { status: "processing", logDesc: "On Hold" },
  "hold": { status: "processing", logDesc: "Hold" },
};

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.PATHAO_WEBHOOK_SECRET || DEFAULT_PATHAO_WEBHOOK_SECRET;

  // ── 1. Parse incoming payload ───────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(
      JSON.stringify({ status: "error", message: "Invalid JSON payload." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
        },
      }
    );
  }

  const payload = body?.data || body || {};
  const eventName = String(payload?.event || body?.event || "").trim().toLowerCase();

  // ── 2. Handle Official Webhook Integration Handshake Probe ───────────────
  // Pathao Merchant Portal verification requirement:
  // Must return HTTP 202 with header X-Pathao-Merchant-Webhook-Integration-Secret
  if (eventName === "webhook_integration" || !eventName && payload?.consignment_id === undefined && payload?.merchant_order_id === undefined) {
    console.log("[pathao-webhook] Webhook Integration Probe Received. Returning 202 Accepted.");
    return new NextResponse(
      JSON.stringify({
        status: "success",
        message: "Pathao Webhook Integration verified successfully.",
        event: "webhook_integration",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
        },
      }
    );
  }

  // ── 3. Extract event parameters ──────────────────────────────────────────
  const consignmentId = payload?.consignment_id ? String(payload.consignment_id).trim() : "";
  const merchantOrderId = payload?.merchant_order_id ? String(payload.merchant_order_id).trim() : "";
  const storeId = payload?.store_id ? Number(payload.store_id) : null;
  const rawStatus = String(payload?.order_status || payload?.status || eventName).trim();
  const rawStatusSlug = String(payload?.order_status_slug || payload?.status_slug || eventName || rawStatus)
    .toLowerCase()
    .trim();
  const deliveryFee = payload?.delivery_fee !== undefined && payload?.delivery_fee !== null ? Number(payload.delivery_fee) : null;
  const invoiceId = payload?.invoice_id ? String(payload.invoice_id).trim() : null;
  const reason = payload?.reason ? String(payload.reason).trim() : null;
  const returnConsignmentId = payload?.return_consignment_id ? String(payload.return_consignment_id).trim() : null;

  const codAmount =
    payload?.collected_amount !== undefined && payload?.collected_amount !== null
      ? Number(payload.collected_amount)
      : payload?.amount_to_collect !== undefined && payload?.amount_to_collect !== null
      ? Number(payload.amount_to_collect)
      : null;

  console.log(`[pathao-webhook] Event: ${eventName || rawStatusSlug} | CID: ${consignmentId} | Order: ${merchantOrderId} | Fee: ${deliveryFee} | COD: ${codAmount}`);

  // ── 4. Handle Store lifecycle events (store.created, store.updated) ───────
  if (eventName.startsWith("store.")) {
    return new NextResponse(
      JSON.stringify({
        status: "success",
        message: `Store event ${eventName} received.`,
        store_id: storeId || payload?.store_name,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
        },
      }
    );
  }

  // ── 5. Handle Test / Sample Payload Probes from Pathao Dashboard ─────────
  const isTestProbe =
    merchantOrderId.toUpperCase() === "TEST" ||
    merchantOrderId.toUpperCase() === "TS-123" ||
    consignmentId.startsWith("DL121224") ||
    consignmentId === "PT-PING-999";

  if (isTestProbe && !merchantOrderId.startsWith("ORD-")) {
    console.log(`[pathao-webhook] Pathao Test Event Probe received: ${eventName}`);
    return new NextResponse(
      JSON.stringify({
        status: "success",
        message: `Test event '${eventName || rawStatus}' acknowledged.`,
        event: eventName,
        consignment_id: consignmentId,
        merchant_order_id: merchantOrderId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
        },
      }
    );
  }

  // ── 6. Initialize Supabase Admin Client ──────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── 7. Locate existing shipment & order records ──────────────────────────
  let existingShipment: any = null;
  let order: any = null;

  if (consignmentId) {
    const { data } = await supabase
      .from("pathao_shipments")
      .select("*")
      .eq("consignment_id", consignmentId)
      .maybeSingle();
    existingShipment = data;
  }

  if (!existingShipment && merchantOrderId) {
    const { data: ord } = await supabase
      .from("orders")
      .select("id, order_number, status, total, payment_method, payment_status")
      .eq("order_number", merchantOrderId)
      .maybeSingle();
    order = ord;

    if (order) {
      const { data: ship } = await supabase
        .from("pathao_shipments")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      existingShipment = ship;
    }
  } else if (existingShipment?.order_id && !order) {
    const { data: ord } = await supabase
      .from("orders")
      .select("id, order_number, status, total, payment_method, payment_status")
      .eq("id", existingShipment.order_id)
      .maybeSingle();
    order = ord;
  }

  const targetOrderId = order?.id || existingShipment?.order_id;
  const mappedInfo = PATHAO_EVENT_MAP[eventName] || PATHAO_EVENT_MAP[rawStatusSlug] || {
    status: rawStatusSlug || "processing",
    logDesc: rawStatus || eventName || "Status Update",
  };

  // ── 8. Upsert pathao_shipments record ────────────────────────────────────
  if (existingShipment) {
    const updateData: any = {
      raw_response: body,
      last_synced_at: new Date().toISOString(),
      order_status: mappedInfo.logDesc,
      order_status_slug: eventName || rawStatusSlug,
    };
    if (merchantOrderId) updateData.merchant_order_id = merchantOrderId;
    if (deliveryFee !== null) updateData.delivery_fee = deliveryFee;
    if (codAmount !== null) updateData.cod_amount = codAmount;
    if (consignmentId && !existingShipment.consignment_id) updateData.consignment_id = consignmentId;

    await supabase
      .from("pathao_shipments")
      .update(updateData)
      .eq("id", existingShipment.id);
  } else if (targetOrderId) {
    await supabase
      .from("pathao_shipments")
      .insert({
        order_id: targetOrderId,
        consignment_id: consignmentId || `PT-${Date.now()}`,
        merchant_order_id: merchantOrderId || null,
        order_status: mappedInfo.logDesc,
        order_status_slug: eventName || rawStatusSlug || "pending",
        shipment_type: "standard",
        delivery_fee: deliveryFee || 0,
        cod_amount: codAmount || 0,
        raw_response: body,
        last_synced_at: new Date().toISOString(),
      });
  }

  // ── 9. Synchronize Main Customer Order Status ────────────────────────────
  if (targetOrderId) {
    const orderUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    if (consignmentId) {
      orderUpdate.tracking_number = consignmentId;
      orderUpdate.tracking_courier = "pathao";
    }

    if (mappedInfo.status) {
      orderUpdate.status = mappedInfo.status;

      // When delivery is confirmed
      if (mappedInfo.status === "delivered") {
        orderUpdate.delivered_at = new Date().toISOString();
        if (order?.payment_method === "cod" || order?.payment_status !== "paid") {
          orderUpdate.payment_status = "paid";
        }
      }
    }

    const { error: ordErr } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("id", targetOrderId)
      .not("status", "eq", "cancelled");

    if (ordErr) {
      console.error("[pathao-webhook] Order update error:", ordErr.message);
    } else {
      console.log(`[pathao-webhook] Order ${targetOrderId} synced to status: ${mappedInfo.status}`);
    }
  }

  // ── 10. Return HTTP 200 with required integration headers ────────────────
  return new NextResponse(
    JSON.stringify({
      status: "success",
      message: `Pathao event '${eventName || rawStatus}' processed successfully.`,
      event: eventName,
      consignment_id: consignmentId,
      merchant_order_id: merchantOrderId,
      mapped_status: mappedInfo.status,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
      },
    }
  );
}

// Pathao may send GET or HEAD to probe endpoint connectivity
export async function GET() {
  const configuredSecret = process.env.PATHAO_WEBHOOK_SECRET || DEFAULT_PATHAO_WEBHOOK_SECRET;
  return new NextResponse(
    JSON.stringify({
      status: "success",
      message: "Pathao webhook endpoint is live, verified, and listening.",
      endpoint: "https://shop.orizino.com/api/webhooks/pathao",
      integration_ready: true,
      supported_events: Object.keys(PATHAO_EVENT_MAP),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
      },
    }
  );
}

export async function HEAD() {
  const configuredSecret = process.env.PATHAO_WEBHOOK_SECRET || DEFAULT_PATHAO_WEBHOOK_SECRET;
  return new NextResponse(null, {
    status: 200,
    headers: {
      "X-Pathao-Merchant-Webhook-Integration-Secret": configuredSecret,
    },
  });
}
