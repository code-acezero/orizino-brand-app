/**
 * Canonical Revenue & Financial Accounting Calculator
 *
 * Rules:
 * 1. Non-COD / Prepaid orders: Revenue recognized once order is CONFIRMED or beyond ('confirmed', 'processing', 'shipped', 'delivered').
 * 2. COD (Cash on Delivery) orders: Revenue recognized ONLY after DELIVERED ('delivered').
 * 3. Delivery charges are EXCLUDED from product merchandise revenue and tracked independently.
 * 4. Returned orders/products are tracked as merchandise returns, and their shipping charges are logged as logistics loss.
 * 5. Pre-paid delivery charges are accounted for independently.
 */

export interface OrderFinancialRecord {
  id?: string;
  order_number?: string;
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  shipping_fee?: number | string | null;
  coupon_discount?: number | string | null;
  loyalty_discount?: number | string | null;
  is_delivery_prepaid?: boolean | null;
  delivery_prepaid_amount?: number | string | null;
  refund_delivery_charge?: boolean | null;
  refund_amount?: number | string | null;
  refund_status?: string | null;
  created_at?: string | null;
  order_source?: string | null;
}

export interface FinancialSummary {
  /** Total recognized product revenue (excludes shipping, includes discounts, confirmed prepaid + delivered COD) */
  recognizedRevenue: number;
  /** Net product revenue after deducting returned merchandise */
  netProductRevenue: number;
  /** In-transit / pending realization COD merchandise revenue */
  pendingCodRevenue: number;
  /** Unconfirmed pending orders merchandise value */
  unconfirmedRevenue: number;
  /** Total value of returned products/orders */
  returnedProductsValue: number;
  /** Total delivery charges collected on valid orders */
  shippingFeesCollected: number;
  /** Delivery charges that were pre-paid in advance */
  prepaidShippingFees: number;
  /** Lost delivery charges on returned orders where delivery fee was refunded */
  shippingLossOnReturns: number;
  /** Delivery charges retained by merchant on returned orders (not refunded = no loss) */
  shippingFeesRetainedOnReturns: number;
  /** Total refunds processed (product refund + refunded shipping if marked) */
  totalRefundsProcessed: number;
  /** Total Gross Cash Inflow (Recognized Product Revenue + Collected Shipping Fees) */
  grossCashInflow: number;
  /** Order status counts */
  totalOrdersCount: number;
  confirmedOrdersCount: number;
  deliveredOrdersCount: number;
  returnedOrdersCount: number;
  cancelledOrdersCount: number;
  pendingOrdersCount: number;
}

/** Check if an order is considered Cash on Delivery */
export function isCodOrder(order: OrderFinancialRecord): boolean {
  const method = (order.payment_method || "").toLowerCase().trim();
  return method === "cod" || method === "cash_on_delivery" || method === "cash";
}

/** Check if an order is confirmed or beyond (processing, shipped, delivered) */
export function isOrderConfirmed(status?: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  return ["confirmed", "processing", "shipped", "delivered", "out_for_delivery", "completed"].includes(s);
}

/** Check if an order is delivered */
export function isOrderDelivered(status?: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  return ["delivered", "completed"].includes(s);
}

/** Check if an order is returned */
export function isOrderReturned(status?: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  return ["returned", "partially_returned", "return_received"].includes(s);
}

/** Check if an order is cancelled */
export function isOrderCancelled(status?: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  return ["cancelled", "canceled", "failed", "void"].includes(s);
}

/** Extract net product merchandise value (total minus shipping fee and discounts) */
export function getOrderProductAmount(order: OrderFinancialRecord): number {
  const total = Number(order.total || 0);
  const shipping = Number(order.shipping_fee || 0);

  if (order.subtotal != null && Number(order.subtotal) > 0) {
    const sub = Number(order.subtotal);
    const coupon = Number(order.coupon_discount || 0);
    const loyalty = Number(order.loyalty_discount || 0);
    return Math.max(0, sub - coupon - loyalty);
  }

  return Math.max(0, total - shipping);
}

/** Compute full financial summary from a list of orders */
export function calculateOrderFinancials(orders: OrderFinancialRecord[]): FinancialSummary {
  let recognizedRevenue = 0;
  let pendingCodRevenue = 0;
  let unconfirmedRevenue = 0;
  let returnedProductsValue = 0;
  let shippingFeesCollected = 0;
  let prepaidShippingFees = 0;
  let shippingLossOnReturns = 0;
  let shippingFeesRetainedOnReturns = 0;
  let totalRefundsProcessed = 0;

  let totalOrdersCount = 0;
  let confirmedOrdersCount = 0;
  let deliveredOrdersCount = 0;
  let returnedOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let pendingOrdersCount = 0;

  for (const order of orders) {
    totalOrdersCount++;
    const status = (order.status || "pending").toLowerCase().trim();
    const productAmount = getOrderProductAmount(order);
    const shippingFee = Number(order.shipping_fee || 0);
    const isPrepaidDelivery = !!order.is_delivery_prepaid || (order.delivery_prepaid_amount != null && Number(order.delivery_prepaid_amount) > 0);
    const prepaidAmount = isPrepaidDelivery
      ? Number(order.delivery_prepaid_amount || shippingFee)
      : 0;

    if (isPrepaidDelivery) {
      prepaidShippingFees += prepaidAmount;
    }

    if (isOrderCancelled(status)) {
      cancelledOrdersCount++;
      continue;
    }

    if (isOrderReturned(status)) {
      returnedOrdersCount++;
      const actualProductRefund = order.refund_amount != null && Number(order.refund_amount) > 0
        ? Number(order.refund_amount)
        : productAmount;

      returnedProductsValue += actualProductRefund;

      // Delivery charge is only counted as a loss IF admin approved refunding the delivery charge
      if (order.refund_delivery_charge === true) {
        shippingLossOnReturns += shippingFee;
        totalRefundsProcessed += actualProductRefund + shippingFee;
      } else {
        // Delivery fee was retained by store (not refunded) -> NOT a loss
        shippingFeesRetainedOnReturns += shippingFee;
        totalRefundsProcessed += actualProductRefund;
      }
      continue;
    }

    const isCod = isCodOrder(order);

    if (isCod) {
      if (isOrderDelivered(status)) {
        deliveredOrdersCount++;
        confirmedOrdersCount++;
        recognizedRevenue += productAmount;
        shippingFeesCollected += shippingFee;
      } else if (isOrderConfirmed(status)) {
        confirmedOrdersCount++;
        pendingCodRevenue += productAmount;
      } else {
        pendingOrdersCount++;
        unconfirmedRevenue += productAmount;
      }
    } else {
      // Non-COD / Prepaid order
      if (isOrderConfirmed(status)) {
        confirmedOrdersCount++;
        if (isOrderDelivered(status)) deliveredOrdersCount++;
        recognizedRevenue += productAmount;
        shippingFeesCollected += shippingFee;
      } else {
        pendingOrdersCount++;
        unconfirmedRevenue += productAmount;
      }
    }
  }

  const netProductRevenue = Math.max(0, recognizedRevenue - returnedProductsValue);
  const grossCashInflow = recognizedRevenue + shippingFeesCollected;

  return {
    recognizedRevenue,
    netProductRevenue,
    pendingCodRevenue,
    unconfirmedRevenue,
    returnedProductsValue,
    shippingFeesCollected,
    prepaidShippingFees,
    shippingLossOnReturns,
    shippingFeesRetainedOnReturns,
    totalRefundsProcessed,
    grossCashInflow,
    totalOrdersCount,
    confirmedOrdersCount,
    deliveredOrdersCount,
    returnedOrdersCount,
    cancelledOrdersCount,
    pendingOrdersCount,
  };
}
