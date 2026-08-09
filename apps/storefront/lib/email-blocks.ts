/**
 * Visual email block editor — types + server-renderer.
 * Used by AdminEmailTemplates to compose templates as JSON blocks
 * that we serialize to inline-styled HTML on save.
 */

export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "html";

export interface BaseBlock {
  id: string;
  type: BlockType;
  align?: "left" | "center" | "right";
  background?: string;
  paddingY?: number;
  paddingX?: number;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level?: 1 | 2 | 3;
  color?: string;
}
export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
  color?: string;
  size?: number;
}
export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt?: string;
  href?: string;
  width?: number;
  radius?: number;
}
export interface ButtonBlock extends BaseBlock {
  type: "button";
  text: string;
  href: string;
  color?: string;
  background?: string;
  radius?: number;
}
export interface DividerBlock extends BaseBlock {
  type: "divider";
  color?: string;
}
export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  height?: number;
}
export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  left: Block[];
  right: Block[];
}
export interface HtmlBlock extends BaseBlock {
  type: "html";
  html: string;
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | HtmlBlock;

export interface EmailDesign {
  version: 1;
  bodyBackground?: string;
  containerBackground?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  blocks: Block[];
  /** When set, renderEmail returns this raw HTML verbatim and ignores blocks.
   *  Used by the "HTML mode" editor for Gmail-safe hand-written templates. */
  customHtml?: string;
}

export const defaultDesign = (): EmailDesign => ({
  version: 1,
  bodyBackground: "#f4f5f7",
  containerBackground: "#ffffff",
  textColor: "#1f2937",
  accentColor: "#6366f1",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  blocks: [
    { id: "h1", type: "heading", level: 1, text: "Hello {{name}}", align: "left", color: "#0f172a" },
    { id: "p1", type: "paragraph", text: "Welcome — this is a fresh email built from blocks. Replace this with your own message.", size: 15 },
    { id: "sp1", type: "spacer", height: 12 },
    { id: "btn1", type: "button", text: "Open the app", href: "https://example.com", align: "left", background: "#6366f1", color: "#ffffff", radius: 10 },
  ],
});

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const padStyle = (b: BaseBlock) =>
  `padding:${b.paddingY ?? 8}px ${b.paddingX ?? 24}px;${b.background ? `background:${b.background};` : ""}`;

function renderBlock(b: Block, d: EmailDesign): string {
  const align = b.align ?? "left";
  switch (b.type) {
    case "heading": {
      const tag = `h${b.level ?? 1}`;
      const sizes: Record<number, number> = { 1: 26, 2: 20, 3: 16 };
      const size = sizes[b.level ?? 1];
      return `<tr><td style="${padStyle(b)}text-align:${align};">
        <${tag} style="margin:0;font-family:${d.fontFamily};font-size:${size}px;line-height:1.25;color:${b.color ?? d.textColor};font-weight:700;">${esc(b.text)}</${tag}>
      </td></tr>`;
    }
    case "paragraph": {
      return `<tr><td style="${padStyle(b)}text-align:${align};">
        <p style="margin:0;font-family:${d.fontFamily};font-size:${b.size ?? 15}px;line-height:1.55;color:${b.color ?? d.textColor};">${esc(b.text).replace(/\n/g, "<br/>")}</p>
      </td></tr>`;
    }
    case "image": {
      const img = `<img src="${esc(b.src)}" alt="${esc(b.alt ?? "")}" width="${b.width ?? 560}" style="display:block;max-width:100%;height:auto;border:0;border-radius:${b.radius ?? 0}px;margin:${align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0"};" />`;
      const inner = b.href ? `<a href="${esc(b.href)}" target="_blank" rel="noopener">${img}</a>` : img;
      return `<tr><td style="${padStyle(b)}text-align:${align};">${inner}</td></tr>`;
    }
    case "button": {
      const bg = b.background ?? d.accentColor ?? "#6366f1";
      const fg = b.color ?? "#ffffff";
      return `<tr><td style="${padStyle(b)}text-align:${align};">
        <a href="${esc(b.href)}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-family:${d.fontFamily};font-size:15px;font-weight:600;padding:12px 22px;border-radius:${b.radius ?? 8}px;">${esc(b.text)}</a>
      </td></tr>`;
    }
    case "divider": {
      return `<tr><td style="${padStyle(b)}"><div style="height:1px;background:${b.color ?? "#e5e7eb"};width:100%;line-height:1px;font-size:0;">&nbsp;</div></td></tr>`;
    }
    case "spacer": {
      return `<tr><td style="height:${b.height ?? 16}px;line-height:${b.height ?? 16}px;font-size:0;">&nbsp;</td></tr>`;
    }
    case "columns": {
      const renderCol = (cols: Block[]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cols.map((c) => renderBlock(c, d)).join("")}</table>`;
      return `<tr><td style="${padStyle(b)}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="top" width="50%" style="padding-right:8px;">${renderCol(b.left)}</td>
            <td valign="top" width="50%" style="padding-left:8px;">${renderCol(b.right)}</td>
          </tr>
        </table>
      </td></tr>`;
    }
    case "html": {
      return `<tr><td style="${padStyle(b)}">${b.html}</td></tr>`;
    }
  }
}

export function renderEmail(design: EmailDesign): string {
  const d: EmailDesign = { ...defaultDesign(), ...design, blocks: design.blocks ?? [] };
  if (d.customHtml && d.customHtml.trim().length > 0) {
    return d.customHtml;
  }
  const rows = d.blocks.map((b) => renderBlock(b, d)).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:${d.bodyBackground};font-family:${d.fontFamily};color:${d.textColor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${d.bodyBackground};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${d.containerBackground};border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        ${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Replace `{{var}}` tokens with values for live preview. */
export function applyVariables(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export const COMMON_VARIABLES = [
  { key: "name", label: "Recipient name", sample: "Alex" },
  { key: "email", label: "Recipient email", sample: "alex@example.com" },
  { key: "site_name", label: "Site name", sample: "Your Store" },
  { key: "order_id", label: "Order ID", sample: "ORD-10293" },
  { key: "tracking_url", label: "Tracking URL", sample: "https://example.com/track/123" },
  { key: "coupon_code", label: "Coupon code", sample: "SAVE10" },
];
