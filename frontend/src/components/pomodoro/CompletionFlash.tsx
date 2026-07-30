import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";

/** Full-window color flash + optional sound when a work interval completes. */
export function CompletionFlash() {
  const flash = usePomodoroStore((s) => s.flash);
  const clearFlash = usePomodoroStore((s) => s.clearFlash);
  const color = useSettingsStore((s) => s.settings.completionColor);
  const soundOn = useSettingsStore((s) => s.settings.notificationSound);

  useEffect(() => {
    if (!flash) return;

    if (soundOn) {
      playChime();
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("ADHDer", { body: "Pomodoro complete. Time for a break!" });
    }

    const timeout = setTimeout(() => clearFlash(), 2100);
    return () => clearTimeout(timeout);
  }, [flash, clearFlash, soundOn]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="completion"
          initial={{ opacity: 0 }}
          // Gentle fade in → hold → fade out (~2s). No flashing.
          animate={{ opacity: [0, 0.72, 0.72, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, times: [0, 0.25, 0.7, 1], ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: color,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      )}
    </AnimatePresence>
  );
}

/** Small WebAudio chime so no audio asset is required (works offline). */
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close();
  } catch {
    // Audio not available (e.g. no user gesture yet) — silently ignore.
  }
}
