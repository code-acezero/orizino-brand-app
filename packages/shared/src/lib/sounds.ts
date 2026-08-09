// Web Audio API sound generators — no external files needed

let audioCtx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneTimeout: ReturnType<typeof setTimeout> | null = null;

export type NotificationSoundStyle = "chime" | "ping" | "pop" | "bell";

const LS_ENABLED = "notif_sound_enabled";
const LS_STYLE = "notif_sound_style";
const LS_VOLUME = "notif_sound_volume";

export function setNotificationSoundEnabled(enabled: boolean) {
  try { localStorage.setItem(LS_ENABLED, enabled ? "1" : "0"); } catch {}
}
export function getNotificationSoundEnabled(): boolean {
  try { return (localStorage.getItem(LS_ENABLED) ?? "1") === "1"; } catch { return true; }
}
export function setNotificationSoundStyle(style: NotificationSoundStyle) {
  try { localStorage.setItem(LS_STYLE, style); } catch {}
}
export function getNotificationSoundStyle(): NotificationSoundStyle {
  try { return (localStorage.getItem(LS_STYLE) as NotificationSoundStyle) || "chime"; } catch { return "chime"; }
}
export function setNotificationSoundVolume(v: number) {
  try { localStorage.setItem(LS_VOLUME, String(Math.max(0, Math.min(1, v)))); } catch {}
}
export function getNotificationSoundVolume(): number {
  try { const v = parseFloat(localStorage.getItem(LS_VOLUME) ?? "0.5"); return isNaN(v) ? 0.5 : v; } catch { return 0.5; }
}

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, startTime: number, ctx: AudioContext, gain: GainNode, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Play the ringtone arpeggio: C5-E5-G5-C6, looped every 2s */
export function playRingtone() {
  stopRingtone();
  const ctx = getCtx();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const noteDur = 0.15;
  const gap = 0.05;

  const playArpeggio = () => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.connect(ctx.destination);
    notes.forEach((freq, i) => {
      playTone(freq, noteDur, ctx.currentTime + i * (noteDur + gap), ctx, gain);
    });
    const totalDur = notes.length * (noteDur + gap);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + totalDur);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + totalDur + 0.1);
  };

  playArpeggio();
  ringtoneInterval = setInterval(playArpeggio, 2000);
}

export function stopRingtone() {
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (ringtoneTimeout) { clearTimeout(ringtoneTimeout); ringtoneTimeout = null; }
}

/** Preview a sound style — respects user volume but bypasses enabled flag */
export function previewNotificationSound(style?: NotificationSoundStyle) {
  playNotificationSoundRaw(style ?? getNotificationSoundStyle(), getNotificationSoundVolume());
}

/** Play notification — respects user preferences (enabled + style + volume) */
export function playNotificationSound() {
  if (!getNotificationSoundEnabled()) return;
  playNotificationSoundRaw(getNotificationSoundStyle(), getNotificationSoundVolume());
}

function playNotificationSoundRaw(style: NotificationSoundStyle, volume: number) {
  try {
    const ctx = getCtx();
    const gain = ctx.createGain();
    const v = Math.max(0, Math.min(1, volume));
    gain.gain.setValueAtTime(v * 0.25, ctx.currentTime);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    switch (style) {
      case "ping": {
        playTone(880, 0.12, t, ctx, gain, "sine");
        gain.gain.setValueAtTime(v * 0.25, t + 0.12);
        gain.gain.linearRampToValueAtTime(0, t + 0.25);
        break;
      }
      case "pop": {
        playTone(440, 0.05, t, ctx, gain, "triangle");
        playTone(660, 0.05, t + 0.04, ctx, gain, "triangle");
        gain.gain.setValueAtTime(v * 0.25, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        break;
      }
      case "bell": {
        playTone(1046.5, 0.3, t, ctx, gain, "sine");
        playTone(1318.5, 0.3, t, ctx, gain, "sine");
        gain.gain.setValueAtTime(v * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        break;
      }
      case "chime":
      default: {
        playTone(659.25, 0.1, t, ctx, gain, "sine");
        playTone(783.99, 0.15, t + 0.12, ctx, gain, "sine");
        gain.gain.setValueAtTime(v * 0.25, t + 0.27);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
      }
    }
  } catch {
    // AudioContext not available
  }
}
// code:4ce0
