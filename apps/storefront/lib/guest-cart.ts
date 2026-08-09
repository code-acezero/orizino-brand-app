/**
 * Guest cart: a localStorage-backed cart for shoppers who aren't signed in.
 * Mirrors the row shape GuestCheckoutPage already reads from
 * localStorage["guest_cart"] — this module is just the missing piece that
 * actually writes to it from the product page / cart page, and the one
 * source of truth so every entry point stays in sync.
 */

const KEY = "guest_cart";

export interface GuestCartItem {
  product_id: string;
  variant_id?: string | null;
  name: string;
  price: number;
  qty: number;
  image?: string;
  slug?: string;
  variant_label?: string;
  max_stock?: number;
}

function read(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  // Same-tab listeners (storage event only fires cross-tab) — components
  // like the header cart badge listen for this to update immediately.
  window.dispatchEvent(new CustomEvent("guest-cart-updated"));
}

export function getGuestCart(): GuestCartItem[] {
  return read();
}

export function guestCartCount(): number {
  return read().reduce((sum, i) => sum + i.qty, 0);
}

export function addToGuestCart(item: Omit<GuestCartItem, "qty">, qty: number = 1) {
  const items = read();
  const idx = items.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (item.variant_id || null));
  if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + qty };
  else items.push({ ...item, qty });
  write(items);
  return items;
}

export function updateGuestCartQty(product_id: string, variant_id: string | null | undefined, qty: number) {
  const items = read();
  const idx = items.findIndex((i) => i.product_id === product_id && (i.variant_id || null) === (variant_id || null));
  if (idx < 0) return items;
  if (qty <= 0) items.splice(idx, 1);
  else items[idx] = { ...items[idx], qty };
  write(items);
  return items;
}

export function removeFromGuestCart(product_id: string, variant_id?: string | null) {
  const items = read().filter((i) => !(i.product_id === product_id && (i.variant_id || null) === (variant_id || null)));
  write(items);
  return items;
}

export function clearGuestCart() {
  write([]);
}
