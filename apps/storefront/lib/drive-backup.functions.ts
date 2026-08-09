import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_NAME = "orizino-call-recordings";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${envOrThrow("LOVABLE_API_KEY")}`,
    "X-Connection-Api-Key": envOrThrow("GOOGLE_DRIVE_API_KEY"),
  };
}

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const findRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: authHeaders(),
  });
  const find = await findRes.json();
  if (!findRes.ok) throw new Error(`drive list failed: ${JSON.stringify(find)}`);
  if (find.files?.[0]?.id) return find.files[0].id;

  const createRes = await fetch(`${DRIVE_GATEWAY}/drive/v3/files`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const created = await createRes.json();
  if (!createRes.ok) throw new Error(`drive folder create failed: ${JSON.stringify(created)}`);
  return created.id;
}

async function uploadToDrive(name: string, mime: string, bytes: ArrayBuffer, folderId: string): Promise<string> {
  const boundary = "lovable-" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name, parents: [folderId] });
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const headBuf = new TextEncoder().encode(head);
  const tailBuf = new TextEncoder().encode(tail);
  const body = new Uint8Array(headBuf.byteLength + bytes.byteLength + tailBuf.byteLength);
  body.set(headBuf, 0);
  body.set(new Uint8Array(bytes), headBuf.byteLength);
  body.set(tailBuf, headBuf.byteLength + bytes.byteLength);

  const res = await fetch(
    `${DRIVE_GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  const out = await res.json();
  if (!res.ok) throw new Error(`drive upload failed: ${JSON.stringify(out)}`);
  return out.id;
}

export const syncRecordingToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ call_log_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    if (!hasSupabaseAdminCredentials()) throw new Error("Service role key missing");
    const sb: any = supabaseAdmin;

    const { data: log, error } = await sb
      .from("call_logs")
      .select("id, recording_user_url, recording_admin_url, drive_file_id, caller_id")
      .eq("id", data.call_log_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!log) throw new Error("call log not found");
    if (log.drive_file_id) return { ok: true, already: true, drive_file_id: log.drive_file_id };

    const path = log.recording_admin_url || log.recording_user_url;
    if (!path) return { ok: false, error: "no recording attached" };

    const { data: blob, error: dlErr } = await sb.storage.from("call-recordings").download(path);
    if (dlErr || !blob) throw new Error(`storage download failed: ${dlErr?.message ?? "no data"}`);

    const folderId = await ensureFolder();
    const arrayBuf = await blob.arrayBuffer();
    const ext = path.split(".").pop() || "webm";
    const fileName = `${log.id}.${ext}`;
    const fileId = await uploadToDrive(fileName, blob.type || "audio/webm", arrayBuf, folderId);

    await sb
      .from("call_logs")
      .update({ drive_file_id: fileId, drive_synced_at: new Date().toISOString() })
      .eq("id", log.id);

    return { ok: true, drive_file_id: fileId };
  });
