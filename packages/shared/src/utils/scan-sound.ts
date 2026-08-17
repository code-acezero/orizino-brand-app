/**
 * Scanner Audio Synthesizer (Web Audio API)
 * Plays success chimes or failure warning beeps with Mute/Unmute toggle support.
 */

export function isScanSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("orizino_scan_sound_muted") === "true";
  } catch {
    return false;
  }
}

export function setScanSoundMuted(muted: boolean): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("orizino_scan_sound_muted", String(muted));
      window.dispatchEvent(new CustomEvent("orizino:scan-sound-toggle", { detail: { muted } }));
    } catch {}
  }
}

export function toggleScanSound(): boolean {
  const next = !isScanSoundMuted();
  setScanSoundMuted(next);
  return next;
}

export function playScanSound(type: "success" | "error"): void {
  if (typeof window === "undefined" || isScanSoundMuted()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "success") {
      // Crisp 2-tone success chime (880Hz -> 1320Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Low buzz error tone (220Hz saw -> 160Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("[ScanSound] Could not play sound:", e);
  }
}
