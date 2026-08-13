import { supabase } from "@/integrations/supabase/client";

export async function upsertSiteSettings(input: any) {
  const payload = input?.data ?? input;
  const entries: { key: string; value: any }[] = payload?.entries || [];
  if (!entries.length) return { ok: true, saved: 0 };

  const updatedAt = new Date().toISOString();
  for (const entry of entries) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: entry.key, value: entry.value, updated_at: updatedAt },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
  }
  return { ok: true, saved: entries.length };
}

export async function sendAdminAnnouncement(input: any) {
  const data = input?.data ?? input;
  const { error } = await supabase.from("notifications").insert({ ...data, user_id: null });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAdminAnnouncement(input: any) {
  const data = input?.data ?? input;
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", data.id)
    .is("user_id", null)
    .in("type", ["announcement", "offer", "update"]);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function upsertAdminPopup(input: any) {
  const data = input?.data ?? input;
  const { id, ...rest } = data;
  const cleaned = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
  for (const key of ["starts_at", "ends_at"] as const) {
    if (cleaned[key] === "") cleaned[key] = null;
  }
  const result = id
    ? await supabase.from("popups").update(cleaned as any).eq("id", id)
    : await supabase.from("popups").insert(cleaned as any);
  if (result.error) throw new Error(result.error.message);
  return { ok: true };
}

export async function deleteAdminPopup(input: any) {
  const data = input?.data ?? input;
  const { error } = await supabase.from("popups").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}