import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminInvoiceStickers";

export const Route = createFileRoute("/sales/invoice-stickers")({
  component: Page,
});
