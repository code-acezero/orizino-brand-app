"use server";

import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CANCELLABLE = ["pending", "confirmed"];
const RETURNABLE = ["delivered"];
const NON_DISPATCHED = ["pending", "confirmed"]; // safe to cancel; not out-for-delivery yet

async function loadPolicy(sb: any, key: string) {
  const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? {}) as Record<string, any>;
}

/* ============ Customer: request cancellation ============ */
export const requestOrderCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ order_id: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const policy = await loadPolicy(sb, "cancellation_policy");
    if (policy.enabled === false) throw new Error("Cancellations are disabled");

    const { data: order, error } = await sb
      .from("orders")
      .select("id,user_id,status,total,payment_method,order_number")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Forbidden");

    const allowed: string[] = policy.allowed_statuses ?? NON_DISPATCHED;
    if (!allowed.includes(order.status)) {
      throw new Error(`Cannot cancel an order in status "${order.status}"`);
    }

    const { data: existing } = await sb
      .from("cancellation_requests")
      .select("id,status")
      .eq("order_id", order.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) throw new Error("A cancellation request is already in progress");

    const paid = !["cod", "cash_on_delivery"].includes((order.payment_method || "").toLowerCase());
    const { data: row, error: insErr } = await sb
      .from("cancellation_requests")
      .insert({
        order_id: order.id,
        user_id: context.userId,
        reason: data.reason,
        refund_required: paid,
        refund_amount: paid ? order.total : null,
        refund_method: paid ? order.payment_method : null,
        refund_status: paid ? "pending" : "not_required",
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    // Flag order so admin lists reflect it immediately
    await sb
      .from("orders")
      .update({ status: "cancellation_requested", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    return { ok: true, request: row };
  });

/* ============ Customer: request return on delivered order ============ */
export const requestOrderReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        reason: z.string().min(2).max(500),
        items: z.array(z.object({ order_item_id: z.string().uuid(), quantity: z.number().int().min(1) })).optional(),
        images: z.array(z.string().url()).max(6).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const policy = await loadPolicy(sb, "return_policy");
    if (policy.enabled === false) throw new Error("Returns are disabled");

    const { data: order, error } = await sb
      .from("orders")
      .select("id,user_id,status,total,payment_method,updated_at")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Forbidden");
    if (!RETURNABLE.includes(order.status)) {
      throw new Error("Only delivered orders can be returned");
    }

    const windowDays = Number(policy.window_days ?? 7);
    const delivered = new Date(order.updated_at).getTime();
    if (Date.now() - delivered > windowDays * 86400_000) {
      throw new Error(`Return window (${windowDays} days) has passed`);
    }
    if (policy.require_images && !(data.images?.length)) {
      throw new Error("Please attach photos of the item to submit a return");
    }

    const { data: existing } = await sb
      .from("return_requests")
      .select("id,status")
      .eq("order_id", order.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) throw new Error("A return request is already in progress");

    const { data: row, error: insErr } = await sb
      .from("return_requests")
      .insert({
        order_id: order.id,
        user_id: context.userId,
        reason: data.reason,
        items: data.items ?? [],
        images: data.images ?? [],
        refund_amount: order.total,
        refund_method: order.payment_method,
        refund_status: "pending",
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    await sb
      .from("orders")
      .update({ status: "return_requested", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    return { ok: true, request: row };
  });

/* ============ Customer: fetch own requests for an order ============ */
export const listOrderWorkflowRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const [cancels, returns] = await Promise.all([
      sb.from("cancellation_requests").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
      sb.from("return_requests").select("*").eq("order_id", data.order_id).order("created_at", { ascending: false }),
    ]);
    return { cancellations: cancels.data ?? [], returns: returns.data ?? [] };
  });

/* ============ Admin: decide cancellation ============ */
export const decideCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        admin_notes: z.string().max(1000).optional(),
        refund_approved: z.boolean().optional(),
        refund_amount: z.number().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: isAdmin } = await sb.rpc("has_any_role", {
      _user_id: context.userId,
      _roles: ["admin", "moderator"],
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: req, error: reqErr } = await sb
      .from("cancellation_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Request not found");

    const now = new Date().toISOString();
    const patch: Record<string, any> = {
      admin_notes: data.admin_notes ?? req.admin_notes,
      decided_by: context.userId,
      decided_at: now,
    };
    if (data.decision === "approve") {
      patch.status = "approved";
      if (req.refund_required) {
        patch.refund_status = data.refund_approved ? "approved" : "pending";
        if (typeof data.refund_amount === "number") patch.refund_amount = data.refund_amount;
      }
      await sb.from("orders").update({ status: "cancelled", updated_at: now }).eq("id", req.order_id);
    } else {
      patch.status = "rejected";
      // restore order to previous cancellable status
      await sb.from("orders").update({ status: "confirmed", updated_at: now }).eq("id", req.order_id);
    }
    const { error } = await sb.from("cancellation_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Admin: decide return ============ */
export const decideReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject", "complete"]),
        admin_notes: z.string().max(1000).optional(),
        resolution: z.string().max(500).optional(),
        return_tracking: z.string().max(200).optional(),
        refund_amount: z.number().nonnegative().optional(),
        refund_delivery_charge: z.boolean().optional(),
        refund_method: z.string().max(100).optional(),
        refund_reference: z.string().max(200).optional(),
        refund_status: z.enum(["pending", "approved", "processing", "refunded", "rejected", "not_required"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb: any = context.supabase;
    const { data: isAdmin } = await sb.rpc("has_any_role", {
      _user_id: context.userId,
      _roles: ["admin", "moderator"],
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: req, error: reqErr } = await sb
      .from("return_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Request not found");

    const now = new Date().toISOString();
    const patch: Record<string, any> = {
      admin_notes: data.admin_notes ?? req.admin_notes,
      resolution: data.resolution ?? req.resolution,
      return_tracking: data.return_tracking ?? req.return_tracking,
      decided_by: context.userId,
      decided_at: now,
      updated_at: now,
    };

    if (typeof data.refund_amount === "number") patch.refund_amount = data.refund_amount;
    if (typeof data.refund_delivery_charge === "boolean") patch.refund_delivery_charge = data.refund_delivery_charge;
    if (data.refund_method) patch.refund_method = data.refund_method;
    if (data.refund_reference) patch.refund_reference = data.refund_reference;
    if (data.refund_status) patch.refund_status = data.refund_status;

    let orderStatus: string | null = null;
    if (data.decision === "approve") {
      patch.status = "approved";
      if (!patch.refund_status) patch.refund_status = "approved";
    } else if (data.decision === "reject") {
      patch.status = "rejected";
      patch.refund_status = "rejected";
      patch.resolved_at = now;
      orderStatus = "delivered"; // revert
    } else if (data.decision === "complete") {
      patch.status = "completed";
      patch.refund_status = data.refund_status ?? "refunded";
      patch.resolved_at = now;
      orderStatus = "returned";
    }

    const { error } = await sb.from("return_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (orderStatus) {
      await sb.from("orders").update({ status: orderStatus, updated_at: now }).eq("id", req.order_id);
    }
    return { ok: true };
  });
