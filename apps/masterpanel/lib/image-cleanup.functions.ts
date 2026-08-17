"use server";

import { createServerFn } from "@orizino/shared/lib/server-fn-compat";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/** Extract bucket name and storage path from a Supabase public or authenticated URL */
function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    // Format: /storage/v1/object/public/{bucket}/{path...}
    const publicMatch = parsed.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch) {
      return { bucket: decodeURIComponent(publicMatch[1]), path: decodeURIComponent(publicMatch[2]) };
    }

    // Format: /storage/v1/object/sign/{bucket}/{path...} or authenticated
    const signMatch = parsed.pathname.match(/\/storage\/v1\/object\/(?:sign|authenticated)\/([^/]+)\/(.+)$/);
    if (signMatch) {
      return { bucket: decodeURIComponent(signMatch[1]), path: decodeURIComponent(signMatch[2]) };
    }
  } catch {
    // If not a full URL, check relative path
    const match = url.match(/^(products|site-assets)\/(.+)$/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
  }

  return null;
}

/** Server function to immediately delete a list of file URLs from Supabase Storage */
export const deleteStorageFiles = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ urls: z.array(z.string()) }).parse(d))
  .handler(async ({ data }) => {
    const bucketGroups: Record<string, string[]> = {};

    for (const u of data.urls) {
      const parsed = parseSupabaseStorageUrl(u);
      if (parsed) {
        if (!bucketGroups[parsed.bucket]) bucketGroups[parsed.bucket] = [];
        bucketGroups[parsed.bucket].push(parsed.path);
      }
    }

    let totalDeleted = 0;
    const errors: string[] = [];

    for (const [bucket, paths] of Object.entries(bucketGroups)) {
      if (!paths.length) continue;
      try {
        const { error, data: res } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
          errors.push(`[${bucket}] ${error.message}`);
        } else {
          totalDeleted += res?.length || paths.length;
        }
      } catch (e: any) {
        errors.push(`[${bucket}] ${e.message}`);
      }
    }

    return { ok: errors.length === 0, deleted: totalDeleted, errors };
  });

/**
 * Scan Supabase Storage buckets (products, site-assets/products) and compare with active
 * database records. Permanently removes any orphaned images that are not used by any product or variant.
 */
export const cleanOrphanProductImages = createServerFn({ method: "POST" })
  .handler(async () => {
    // 1. Fetch all product image references from the database
    const [productsRes, variantsRes] = await Promise.all([
      supabase.from("products").select("id, thumbnail, images"),
      supabase.from("product_variants" as any).select("id, image_url"),
    ]);

    const activeDbUrls = new Set<string>();

    for (const p of productsRes.data || []) {
      if (p.thumbnail && typeof p.thumbnail === "string") {
        activeDbUrls.add(p.thumbnail.trim());
      }
      if (Array.isArray(p.images)) {
        for (const img of p.images) {
          if (img && typeof img === "string") activeDbUrls.add(img.trim());
        }
      }
    }

    for (const v of (variantsRes.data as any[]) || []) {
      if (v.image_url && typeof v.image_url === "string") {
        activeDbUrls.add(v.image_url.trim());
      }
    }

    // 2. Scan Storage: "products" bucket
    const orphanPathsByBucket: Record<string, string[]> = {
      products: [],
      "site-assets": [],
    };

    let totalScanned = 0;

    // List "products" bucket root & "gallery" folder
    try {
      const [rootList, galleryList] = await Promise.all([
        supabase.storage.from("products").list("", { limit: 1000 }),
        supabase.storage.from("products").list("gallery", { limit: 1000 }),
      ]);

      const rootFiles = (rootList.data || []).filter((f) => f.name && !f.id?.endsWith("/"));
      const galleryFiles = (galleryList.data || []).filter((f) => f.name && !f.id?.endsWith("/"));

      for (const f of rootFiles) {
        totalScanned++;
        const { data: pub } = supabase.storage.from("products").getPublicUrl(f.name);
        if (!activeDbUrls.has(pub.publicUrl) && !Array.from(activeDbUrls).some((u) => u.includes(f.name))) {
          orphanPathsByBucket.products.push(f.name);
        }
      }

      for (const f of galleryFiles) {
        totalScanned++;
        const fullPath = `gallery/${f.name}`;
        const { data: pub } = supabase.storage.from("products").getPublicUrl(fullPath);
        if (!activeDbUrls.has(pub.publicUrl) && !Array.from(activeDbUrls).some((u) => u.includes(f.name))) {
          orphanPathsByBucket.products.push(fullPath);
        }
      }
    } catch (e) {
      console.warn("Could not list products bucket:", e);
    }

    // List "site-assets/products" folder
    try {
      const { data: siteAssetsList } = await supabase.storage.from("site-assets").list("products", { limit: 1000 });
      for (const f of siteAssetsList || []) {
        if (!f.name || f.id?.endsWith("/")) continue;
        totalScanned++;
        const fullPath = `products/${f.name}`;
        const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(fullPath);
        if (!activeDbUrls.has(pub.publicUrl) && !Array.from(activeDbUrls).some((u) => u.includes(f.name))) {
          orphanPathsByBucket["site-assets"].push(fullPath);
        }
      }
    } catch (e) {
      console.warn("Could not list site-assets bucket:", e);
    }

    // 3. Delete orphans from storage
    let totalDeleted = 0;
    const deletedList: string[] = [];

    for (const [bucket, paths] of Object.entries(orphanPathsByBucket)) {
      if (!paths.length) continue;
      // Delete in chunks of 50
      for (let i = 0; i < paths.length; i += 50) {
        const chunk = paths.slice(i, i + 50);
        const { error, data: res } = await supabase.storage.from(bucket).remove(chunk);
        if (!error && res) {
          totalDeleted += res.length;
          deletedList.push(...chunk.map((p) => `${bucket}/${p}`));
        }
      }
    }

    return {
      ok: true,
      scanned: totalScanned,
      activeDatabaseImages: activeDbUrls.size,
      deletedCount: totalDeleted,
      deletedFiles: deletedList,
    };
  });
