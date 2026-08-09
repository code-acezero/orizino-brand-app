import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight wrapper around MediaRecorder for capturing one side
 * of a WebRTC voice call. Designed to be started right after we
 * acquire the local microphone stream and stopped on hangup.
 */
export class CallRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mime: string;

  constructor() {
    this.mime = pickMime();
  }

  start(stream: MediaStream): boolean {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return false;
      this.chunks = [];
      this.rec = new MediaRecorder(stream, this.mime ? { mimeType: this.mime } : undefined);
      this.rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
      this.rec.start(1000); // collect in 1s chunks
      return true;
    } catch (e) {
      console.warn("[recorder] failed to start", e);
      return false;
    }
  }

  /** Resolves with the recorded Blob when the recorder fully stops. */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const r = this.rec;
      if (!r || r.state === "inactive") return resolve(null);
      r.onstop = () => {
        const type = this.mime || "audio/webm";
        const blob = new Blob(this.chunks, { type });
        this.chunks = [];
        this.rec = null;
        resolve(blob.size > 0 ? blob : null);
      };
      try { r.stop(); } catch { resolve(null); }
    });
  }

  get extension(): string {
    if (this.mime.includes("mp4")) return "m4a";
    if (this.mime.includes("ogg")) return "ogg";
    return "webm";
  }
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c; } catch { /* noop */ }
  }
  return "";
}

/**
 * Upload a recorded blob to the private `call-recordings` bucket.
 * Path scheme is `{user_id}/{call_log_id}_{role}.{ext}` so that
 * RLS based on the first folder segment matches the uploader.
 */
export async function uploadCallRecording(opts: {
  blob: Blob;
  userId: string;
  callLogId: string;
  role: "user" | "admin";
  ext: string;
}): Promise<string | null> {
  const { blob, userId, callLogId, role, ext } = opts;
  if (!blob || blob.size < 1024) return null; // ignore empty / silence-only

  const path = `${userId}/${callLogId}_${role}.${ext}`;
  const { error } = await supabase.storage
    .from("call-recordings")
    .upload(path, blob, { upsert: true, contentType: blob.type || "audio/webm" });

  if (error) {
    console.warn("[recorder] upload failed", error);
    return null;
  }

  // Persist the storage path on the call log for later signed-URL playback.
  const update = role === "admin"
    ? { recording_admin_url: path }
    : { recording_user_url: path };
  await supabase.from("call_logs").update(update).eq("id", callLogId);

  return path;
}
