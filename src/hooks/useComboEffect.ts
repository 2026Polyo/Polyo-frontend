import { useEffect, useRef, useState } from "react";

export function useComboEffect(combo: number): number | null {
  const [comboEffectValue, setComboEffectValue] = useState<number | null>(null);
  const previousComboRef = useRef<number>(combo);

  useEffect(() => {
    if (combo <= previousComboRef.current) {
      previousComboRef.current = combo;
      return undefined;
    }

    previousComboRef.current = combo;
    setComboEffectValue(null);
    const frameId = window.requestAnimationFrame(() => setComboEffectValue(combo));
    const timerId = window.setTimeout(() => setComboEffectValue(null), 980);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [combo]);

  return comboEffectValue;
}
