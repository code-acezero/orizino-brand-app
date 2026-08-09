/**
 * Library of Gmail-safe email templates admins can spawn from the editor.
 * Each preset returns a fresh EmailDesign (blocks-based) — admins can then
 * tweak in the visual editor or switch to HTML mode for fine control.
 *
 * Gmail strips <style> and <link>, drops most CSS positioning, and only
 * supports a subset of inline CSS. Stick to: tables, inline styles, web-safe
 * fonts, simple images, hex colors, padding/margin, basic typography.
 */
import type { EmailDesign, Block } from "./email-blocks";
import { defaultDesign } from "./email-blocks";

const uid = () => Math.random().toString(36).slice(2, 10);
const b = (x: any): Block => ({ id: uid(), ...x } as Block);

export interface EmailPreset {
  key: string;
  name: string;
  category: "transactional" | "marketing" | "lifecycle" | "system";
  subject: string;
  description: string;
  build: () => EmailDesign;
}

const wrap = (subject: string, blocks: Block[], accent = "#6366f1"): EmailDesign => ({
  ...defaultDesign(),
  accentColor: accent,
  blocks,
});

export const EMAIL_PRESETS: EmailPreset[] = [
  {
    key: "blank",
    name: "Blank canvas",
    category: "system",
    subject: "",
    description: "Empty design — start from scratch.",
    build: () => ({ ...defaultDesign(), blocks: [] }),
  },
  {
    key: "welcome",
    name: "Welcome",
    category: "lifecycle",
    subject: "Welcome to {{site_name}} 👋",
    description: "First email after signup. Sets expectations and links to the app.",
    build: () =>
      wrap("Welcome to {{site_name}}", [
        b({ type: "heading", level: 1, text: "Welcome, {{name}}!", align: "left" }),
        b({ type: "paragraph", text: "Thanks for joining {{site_name}}. We're glad to have you. Tap the button below to start exploring." }),
        b({ type: "spacer", height: 8 }),
        b({ type: "button", text: "Open {{site_name}}", href: "https://example.com", align: "left" }),
        b({ type: "spacer", height: 16 }),
        b({ type: "paragraph", text: "Need help? Just reply to this email — a human will respond.", size: 13, color: "#6b7280" }),
      ]),
  },
  {
    key: "order_confirmation",
    name: "Order confirmation",
    category: "transactional",
    subject: "Order {{order_id}} confirmed",
    description: "Receipt sent after a successful purchase.",
    build: () =>
      wrap("Order confirmed", [
        b({ type: "heading", level: 1, text: "Thanks for your order!" }),
        b({ type: "paragraph", text: "Hi {{name}}, your order {{order_id}} is confirmed. We'll email you again when it ships." }),
        b({ type: "divider" }),
        b({ type: "paragraph", text: "Order details:", color: "#6b7280", size: 13 }),
        b({ type: "html", html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-family:system-ui;font-size:14px;color:#1f2937;padding:6px 0;">Order ID</td><td style="font-family:system-ui;font-size:14px;color:#1f2937;padding:6px 0;text-align:right;"><b>{{order_id}}</b></td></tr></table>` }),
        b({ type: "spacer", height: 8 }),
        b({ type: "button", text: "View order", href: "{{tracking_url}}", align: "left" }),
      ], "#16a34a"),
  },
  {
    key: "shipping",
    name: "Shipping update",
    category: "transactional",
    subject: "Your order {{order_id}} has shipped",
    description: "Sent when a shipment is dispatched, with tracking link.",
    build: () =>
      wrap("Shipped", [
        b({ type: "heading", text: "Your order is on its way 🚚" }),
        b({ type: "paragraph", text: "Hi {{name}}, order {{order_id}} just left our warehouse. Track its journey below." }),
        b({ type: "button", text: "Track shipment", href: "{{tracking_url}}", align: "left" }),
        b({ type: "spacer", height: 12 }),
        b({ type: "paragraph", text: "Estimated delivery is 2–4 business days. We'll let you know if anything changes.", size: 13, color: "#6b7280" }),
      ], "#0ea5e9"),
  },
  {
    key: "delivered",
    name: "Delivered",
    category: "transactional",
    subject: "Order {{order_id}} delivered",
    description: "Confirms delivery and asks for a review.",
    build: () =>
      wrap("Delivered", [
        b({ type: "heading", text: "Delivered ✅" }),
        b({ type: "paragraph", text: "Hi {{name}}, your order {{order_id}} has been delivered. We hope you love it!" }),
        b({ type: "button", text: "Leave a review", href: "https://example.com/review", align: "left", background: "#f59e0b" }),
      ], "#10b981"),
  },
  {
    key: "password_reset",
    name: "Password reset",
    category: "transactional",
    subject: "Reset your password",
    description: "Single-action email with a reset link.",
    build: () =>
      wrap("Reset password", [
        b({ type: "heading", text: "Reset your password" }),
        b({ type: "paragraph", text: "Hi {{name}}, click below to set a new password. The link expires in 30 minutes." }),
        b({ type: "button", text: "Reset password", href: "{{tracking_url}}", align: "left" }),
        b({ type: "spacer", height: 16 }),
        b({ type: "paragraph", text: "Didn't request this? You can safely ignore this email — your password won't change.", size: 13, color: "#6b7280" }),
      ]),
  },
  {
    key: "abandoned_cart",
    name: "Abandoned cart",
    category: "lifecycle",
    subject: "You left something behind 🛒",
    description: "Reminds shoppers of items still in their cart.",
    build: () =>
      wrap("Cart reminder", [
        b({ type: "heading", text: "Still thinking it over?" }),
        b({ type: "paragraph", text: "Hi {{name}}, your cart is saved and ready whenever you are. Use code {{coupon_code}} for 10% off." }),
        b({ type: "button", text: "Return to cart", href: "https://example.com/cart", align: "left" }),
      ], "#ef4444"),
  },
  {
    key: "review_request",
    name: "Review request",
    category: "lifecycle",
    subject: "How was your order?",
    description: "Asks for product feedback a few days after delivery.",
    build: () =>
      wrap("Review", [
        b({ type: "heading", text: "Mind sharing your thoughts?" }),
        b({ type: "paragraph", text: "Hi {{name}}, your recent order has had time to settle in. A quick review helps other shoppers and helps us improve." }),
        b({ type: "button", text: "Write a review", href: "https://example.com/review", align: "left" }),
      ], "#f59e0b"),
  },
  {
    key: "refund",
    name: "Refund issued",
    category: "transactional",
    subject: "Refund processed for order {{order_id}}",
    description: "Notification that a refund has been issued.",
    build: () =>
      wrap("Refund", [
        b({ type: "heading", text: "Refund on the way" }),
        b({ type: "paragraph", text: "Hi {{name}}, we've processed a refund for order {{order_id}}. It usually takes 3–5 business days to appear on your statement." }),
        b({ type: "paragraph", text: "Questions? Reply to this email and we'll help.", size: 13, color: "#6b7280" }),
      ], "#6b7280"),
  },
  {
    key: "restock",
    name: "Back in stock",
    category: "lifecycle",
    subject: "It's back in stock",
    description: "Notifies wishlisters that a product is available again.",
    build: () =>
      wrap("Back in stock", [
        b({ type: "heading", text: "Good news — it's back!" }),
        b({ type: "paragraph", text: "Hi {{name}}, an item you were watching is back in stock. They tend to go quickly." }),
        b({ type: "button", text: "Shop now", href: "https://example.com", align: "left" }),
      ], "#8b5cf6"),
  },
  {
    key: "promo",
    name: "Promo / sale",
    category: "marketing",
    subject: "Use {{coupon_code}} for 20% off",
    description: "A simple, focused promo email.",
    build: () =>
      wrap("Promo", [
        b({ type: "heading", text: "20% off, this week only" }),
        b({ type: "paragraph", text: "Hi {{name}}, use code {{coupon_code}} at checkout for 20% off your next order." }),
        b({ type: "button", text: "Shop the sale", href: "https://example.com", align: "left", background: "#ef4444" }),
        b({ type: "spacer", height: 12 }),
        b({ type: "paragraph", text: "Offer ends Sunday at midnight.", size: 13, color: "#6b7280" }),
      ], "#ef4444"),
  },
  {
    key: "announcement",
    name: "Announcement",
    category: "marketing",
    subject: "Something new from {{site_name}}",
    description: "Generic product or feature announcement.",
    build: () =>
      wrap("Announcement", [
        b({ type: "heading", text: "We've got news" }),
        b({ type: "paragraph", text: "Hi {{name}}, here's what's new at {{site_name}}." }),
        b({ type: "image", src: "https://placehold.co/600x300/png", alt: "Announcement image", width: 560, radius: 8, align: "center" }),
        b({ type: "paragraph", text: "Tap below to see all the details." }),
        b({ type: "button", text: "Learn more", href: "https://example.com", align: "left" }),
      ]),
  },
];
