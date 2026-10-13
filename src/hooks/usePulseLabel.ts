import { useCallback, useEffect, useRef, useState } from "react";

export interface PulseLabel {
  /** The text to show, or null when nothing is showing. */
  label: string | null;
  /** Changes on every pulse — use as a React `key` so the animation restarts each time. */
  pulseId: number;
  /** Show `text` transiently; calling again restarts the animation even with the same text. */
  pulse: (text: string) => void;
}

// A short-lived text burst (like the combo effect): show a label, then clear it after a delay.
export function usePulseLabel(durationMs = 940): PulseLabel {
  const [state, setState] = useState<{ text: string; id: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulse = useCallback((text: string) => {
    setState({ text, id: Date.now() });
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  return { label: state?.text ?? null, pulseId: state?.id ?? 0, pulse };
}
