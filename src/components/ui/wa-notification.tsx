import React from "react";
import { RealtimeEventPayload, realtimeHub } from "@/lib/realtime-events";


// Play subtle browser notification chime using Web Audio API
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {}
}







// Global programmatic trigger
export function triggerWaNotification(
  opts: Omit<RealtimeEventPayload, "id" | "timestamp">
) {
  realtimeHub.emit(opts);
  playChime();
}
