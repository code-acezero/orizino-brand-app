import { supabase } from "./supabase";

const sb = supabase as any;

export type OfflineSource = "offline" | "page" | "whatsapp" | "tiktok" | "instagram" | "phone";

export interface CreateOfflineOrderInput {
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  thana?: string;
  postalCode?: string;
  source: OfflineSource;
  notes?: string;
  serialIds: string[];
  shippingFee?: number;
  isDeliveryPrepaid?: boolean;
  deliveryPrepaidAmount?: number;
  paymentMethod?: string;
  discount?: number;
  pushToCourier?: boolean;
  courierProvider?: "steadfast" | "pathao";
}

export async function createOfflineOrder(input: CreateOfflineOrderInput) {
  const uniqueSerialIds = [...new Set(input.serialIds)];
  let serialRows: any[] = [];

  if (uniqueSerialIds.length > 0) {
    const { data: rows, error: se } = await sb
      .from("product_serials")
      .select("id, serial_code, status, is_defective, product_id, variant_id, products(name, price), product_variants(size, color)")
      .in("id", uniqueSerialIds);
    if (se) throw new Error(se.message);
    if (!rows || rows.length !== uniqueSerialIds.length) {
      throw new Error("Some scanned serials could not be found — they may have been deleted mid-scan.");
    }

    // Availability validation: available, cancelled, or returned without defect
    const notAvailable = rows.filter((r: any) => {
      const isSellable = r.status === "available" || r.status === "cancelled" || (r.status === "returned" && !r.is_defective);
      return !isSellable;
    });

    if (notAvailable.length) {
      throw new Error(`Not available for sale: ${notAvailable.map((r: any) => r.serial_code).join(", ")}`);
    }
    serialRows = rows;
  }

  const groups = new Map<
    string,
    { product_id: string; variant_id: string | null; product_name: string; unit_price: number; serialIds: string[] }
  >();
  for (const r of serialRows as any[]) {
    const key = `${r.product_id}::${r.variant_id ?? ""}`;
    const variantLabel = [r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ");
    const name = variantLabel ? `${r.products?.name ?? "Product"} (${variantLabel})` : r.products?.name ?? "Product";
    if (!groups.has(key)) {
      groups.set(key, {
        product_id: r.product_id,
        variant_id: r.variant_id ?? null,
        product_name: name,
        unit_price: Number(r.products?.price ?? 0),
        serialIds: [],
      });
    }
    groups.get(key)!.serialIds.push(r.id);
  }

  const subtotal = [...groups.values()].reduce((sum, g) => sum + g.unit_price * g.serialIds.length, 0);
  const shippingFee = input.source === "offline" ? 0 : Number(input.shippingFee || 0);
  const isDeliveryPrepaid = input.source !== "offline" && !!input.isDeliveryPrepaid;
  const discount = Number(input.discount || 0);
  const total = Math.max(0, subtotal + shippingFee - discount);
  const orderNumber = `OFL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const shippingAddress: Record<string, any> = {
    full_name: input.customerName,
    phone: input.phone || null,
    email: input.email || null,
    address_line: input.address || null,
    district: input.district || "Dhaka",
    thana: input.thana || "Dhanmondi",
    postal_code: input.postalCode || null,
  };

  let paymentStatus = "unpaid";
  if (input.source === "offline") {
    paymentStatus = "paid";
  } else if (isDeliveryPrepaid) {
    paymentStatus = "partially_paid";
  }

  const defaultMethod = input.paymentMethod || (input.source === "offline" ? "cash" : "cod");

  const { data: order, error: oe } = await sb
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: null,
      is_guest: true,
      guest_email: input.email || null,
      guest_phone: input.phone || null,
      customer_name: input.customerName,
      status: input.source === "offline" ? "delivered" : "confirmed",
      payment_status: paymentStatus,
      payment_method: defaultMethod,
      order_source: input.source,
      subtotal,
      discount,
      shipping_fee: shippingFee,
      is_delivery_prepaid: isDeliveryPrepaid,
      delivery_prepaid_amount: isDeliveryPrepaid ? (input.deliveryPrepaidAmount ?? shippingFee) : 0,
      total,
      shipping_address: shippingAddress,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  if (oe || !order) throw new Error(`Failed to create order: ${oe?.message ?? "unknown"}`);

  // Insert items
  let items: any[] = [];
  if (groups.size > 0) {
    const itemRows = [...groups.values()].map((g) => ({
      order_id: order.id,
      product_id: g.product_id,
      variant_id: g.variant_id,
      product_name: g.product_name,
      quantity: g.serialIds.length,
      unit_price: g.unit_price,
      total_price: g.unit_price * g.serialIds.length,
    }));
    const { data: insertedItems, error: ie } = await sb.from("order_items").insert(itemRows).select("*");
    if (ie) throw new Error(ie.message);
    items = insertedItems || [];
  }

  // Bind serials
  if (uniqueSerialIds.length > 0) {
    const now = new Date().toISOString();
    const { data: auth } = await sb.auth.getUser();
    const { error: ue } = await sb
      .from("product_serials")
      .update({ status: "sold", sold_order_id: order.id, sold_at: now, updated_at: now })
      .in("id", uniqueSerialIds);
    if (ue) throw new Error(ue.message);

    const eventRows = (serialRows as any[]).map((r) => ({
      serial_id: r.id,
      action: "sell",
      from_status: r.status,
      to_status: "sold",
      actor_id: auth?.user?.id ?? null,
      order_id: order.id,
      metadata: { source: input.source, order_number: orderNumber },
    }));
    await sb.from("product_serial_events").insert(eventRows);
    await sb.rpc("sync_stock_from_serials");
  }

  // Handle direct courier push if enabled
  let courierResult: any = null;
  if (input.source !== "offline" && input.pushToCourier) {
    const provider = input.courierProvider || "steadfast";
    try {
      if (provider === "steadfast") {
        const { data: sfRes } = await sb.functions.invoke("steadfast", {
          body: {
            action: "create-order",
            order_id: order.id,
            note: input.notes || undefined,
            delivery_type: 0,
          },
        });
        courierResult = sfRes;
      } else if (provider === "pathao") {
        const { data: ptRes } = await sb.functions.invoke("pathao", {
          body: {
            action: "create-order",
            order_id: order.id,
            special_instruction: input.notes || undefined,
          },
        });
        courierResult = ptRes;
      }
    } catch (courierErr: any) {
      console.warn("[createOfflineOrder] Courier push error:", courierErr);
    }
  }

  return { order, items, courierResult };
}
