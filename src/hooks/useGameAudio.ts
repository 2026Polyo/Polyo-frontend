import { useEffect, useRef } from "react";
import trackSound from "../asset/sound/track.mp3";
import popSound from "../asset/sound/pop.mp3";
import popupSound from "../asset/sound/popup.mp3";
import goodM from "../asset/sound/good_m.wav";
import goodFm from "../asset/sound/good_fm.wav";
import greatM from "../asset/sound/great_m.wav";
import greatFm from "../asset/sound/great_fm.wav";
import excellentM from "../asset/sound/exellent_m.wav";
import excellentFm from "../asset/sound/exellent_fm.wav";
import { getClearTier } from "../features/clearFeedback";
import combo1 from "../asset/sound/combo1.mp3";
import combo2 from "../asset/sound/combo2.mp3";
import combo3 from "../asset/sound/combo3.mp3";
import combo4 from "../asset/sound/combo4.mp3";
import combo5 from "../asset/sound/combo5.mp3";
import combo6 from "../asset/sound/combo6.mp3";
import combo7 from "../asset/sound/combo7.mp3";
import combo8 from "../asset/sound/combo8.mp3";
import gameOverSound from "../asset/sound/game_over.mp3";

const COMBO_SOUNDS = [combo1, combo2, combo3, combo4, combo5, combo6, combo7, combo8];

export interface GameAudio {
  /** Resume the AudioContext; call from a user gesture so playback is allowed. */
  resume: () => void;
  playPop: () => void;
  /** The "block placed" track sound. */
  playPlacement: () => void;
  /** Plays the good/great clear cue plus the escalating combo cue (cleared > 0). */
  playClearFeedback: (cleared: number) => void;
  /** Reset the combo-sound escalation back to the first step. */
  resetComboSound: () => void;
  playGameOver: () => void;
  playPopup: () => void;
}

export function useGameAudio(): GameAudio {
  const ctxRef = useRef<AudioContext | null>(null);
  const trackRef = useRef<AudioBuffer | null>(null);
  const popRef = useRef<AudioBuffer | null>(null);
  const popupRef = useRef<AudioBuffer | null>(null);
  const goodRef = useRef<AudioBuffer[]>([]);
  const greatRef = useRef<AudioBuffer[]>([]);
  const excellentRef = useRef<AudioBuffer[]>([]);
  const comboRef = useRef<AudioBuffer[]>([]);
  const comboStepRef = useRef(0);
  const gameOverRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const decode = (url: string) =>
      fetch(url).then((res) => res.arrayBuffer()).then((buf) => ctx.decodeAudioData(buf));
    decode(trackSound).then((decoded) => { trackRef.current = decoded; }).catch(() => undefined);
    decode(popSound).then((decoded) => { popRef.current = decoded; }).catch(() => undefined);
    decode(popupSound).then((decoded) => { popupRef.current = decoded; }).catch(() => undefined);
    Promise.all([decode(goodM), decode(goodFm)])
      .then((buffers) => { goodRef.current = buffers; })
      .catch(() => undefined);
    Promise.all([decode(greatM), decode(greatFm)])
      .then((buffers) => { greatRef.current = buffers; })
      .catch(() => undefined);
    Promise.all([decode(excellentM), decode(excellentFm)])
      .then((buffers) => { excellentRef.current = buffers; })
      .catch(() => undefined);
    Promise.all(COMBO_SOUNDS.map(decode))
      .then((buffers) => { comboRef.current = buffers; })
      .catch(() => undefined);
    decode(gameOverSound).then((decoded) => { gameOverRef.current = decoded; }).catch(() => undefined);

    return () => { ctx.close().catch(() => undefined); };
  }, []);

  function play(buffer: AudioBuffer | null | undefined) {
    const ctx = ctxRef.current;
    if (!ctx || !buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  }

  function resume() {
    // Browsers start the context suspended until a user gesture occurs.
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume().catch(() => undefined);
  }

  function playPop() {
    play(popRef.current);
  }

  function playPlacement() {
    play(trackRef.current);
  }

  function playClearFeedback(cleared: number) {
    const tier = getClearTier(cleared);
    const pool =
      tier === "good" ? goodRef.current :
      tier === "great" ? greatRef.current :
      tier === "excellent" ? excellentRef.current :
      null;
    if (pool?.length) play(pool[Math.floor(Math.random() * pool.length)]);

    if (cleared > 0 && comboRef.current.length === COMBO_SOUNDS.length) {
      play(comboRef.current[Math.min(comboStepRef.current, COMBO_SOUNDS.length - 1)]);
      comboStepRef.current += 1;
    }
  }

  function resetComboSound() {
    comboStepRef.current = 0;
  }

  function playGameOver() {
    play(gameOverRef.current);
  }

  function playPopup() {
    play(popupRef.current);
  }

  return { resume, playPop, playPlacement, playClearFeedback, resetComboSound, playGameOver, playPopup };
}
