import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/EmployeeIdentityPage";
import { getPublicIdentity } from "@/lib/employee-identity.functions";

export const Route = createFileRoute("/id/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    src: typeof s.src === "string" ? (s.src as string) : undefined,
    preview: s.preview === "1" || s.preview === 1 ? 1 : undefined,
  }),
  loaderDeps: ({ search }) => ({ src: search.src }),
  loader: async ({ params, deps }) => {
    try {
      const src = (deps as any)?.src;
      const source = src === "qr" || src === "nfc" || src === "share" ? src : "direct";
      const res = await getPublicIdentity({ data: { slug: params.slug, source } as any });
      return { identity: res?.identity ?? null };
    } catch {
      return { identity: null };
    }
  },
  head: ({ loaderData }) => {
    const id = (loaderData as any)?.identity;
    if (!id) {
      return {
        meta: [
          { title: "Profile — Orizino" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const title = `${id.display_name ?? "Employee"}${id.title ? " · " + id.title : ""} — Orizino`;
    const desc = (id.bio ?? `${id.display_name ?? "Employee"} at Orizino`).slice(0, 200);
    const image = id.avatar_url || id.cover_url;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { name: "robots", content: id.allow_indexing ? "index, follow" : "noindex, nofollow" },
      { property: "og:type", content: "profile" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta };
  },
  component: Page,
});
