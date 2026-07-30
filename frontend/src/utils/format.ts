/** Format seconds as MM:SS (or H:MM:SS when >= 1 hour). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Human focus-time summary, e.g. "2h 15m" or "45m". */
export function formatFocus(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours > 0) return `${hours}h ${rem}m`;
  return `${rem}m`;
}

export function formatClock(date: Date, use24Hour: boolean, showSeconds: boolean): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: !use24Hour,
  });
}
