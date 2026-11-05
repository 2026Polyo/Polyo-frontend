import type { ThemeSoundCue, ThemeSoundEvent } from "./gameThemes";
import { createNeonSound } from "./neonSound";

export interface ThemeAudioPlayer {
  resume: () => void;
  play: (event: ThemeSoundEvent, cleared?: number) => void;
  dispose: () => void;
}

const VOICE_LIMIT = { placement: 2, clear: 1 } as const;
const MAX_PENDING_AGE_MS = 250;

/** One player owns its buffers, voices and pending gesture; never shared across opponents. */
export function createThemeAudioPlayer(
  context: AudioContext,
  cues: Readonly<Record<ThemeSoundEvent, ThemeSoundCue | null>>,
): ThemeAudioPlayer {
  let disposed = false;
  let resuming = false;
  const buffers = new Map<ThemeSoundEvent, AudioBuffer>();
  const voices = { placement: new Set<AudioBufferSourceNode>(), clear: new Set<AudioBufferSourceNode>() };
  const pending = new Map<ThemeSoundEvent, { requestedAt: number; cleared: number }>();
  for (const event of ["placement", "clear"] as const) {
    const cue = cues[event];
    if (!cue) continue;
    if (cue.kind === "synth") {
      const pcm = createNeonSound(cue.preset, context.sampleRate);
      const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
      buffer.getChannelData(0).set(pcm);
      buffers.set(event, buffer);
    } else {
      // No delayed playback after decoding; a missing file simply stays silent.
      void fetch(cue.src).then(response => {
        if (!response.ok) throw new Error("Audio unavailable");
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).then(buffer => {
        if (!disposed) buffers.set(event, buffer);
      }).catch(() => undefined);
    }
  }

  function start(event: ThemeSoundEvent, cleared: number) {
    const cue = cues[event];
    const buffer = buffers.get(event);
    if (disposed || context.state !== "running" || !cue || !buffer) return;
    const active = voices[event];
    if (active.size >= VOICE_LIMIT[event]) {
      const oldest = active.values().next().value!;
      oldest.stop();
      active.delete(oldest);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = event === "clear" ? 1 + Math.min(cleared - 1, 3) * 0.025 : 1;
    gain.gain.value = Number.isFinite(cue.volume) ? Math.max(0, Math.min(1, cue.volume)) : 0;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => { active.delete(source); source.disconnect(); gain.disconnect(); };
    active.add(source);
    source.start();
  }

  function resume() {
    if (disposed || resuming || context.state !== "suspended") return;
    resuming = true;
    void context.resume().then(() => {
      if (disposed) return;
      for (const [event, request] of pending) {
        if (performance.now() - request.requestedAt <= MAX_PENDING_AGE_MS) start(event, request.cleared);
      }
    }).catch(() => undefined).finally(() => { pending.clear(); resuming = false; });
  }

  function play(event: ThemeSoundEvent, cleared = 1) {
    if (disposed || context.state === "closed" || !cues[event] || !buffers.has(event)) return;
    if (event === "clear" && (!Number.isInteger(cleared) || cleared <= 0)) return;
    if (context.state === "running") start(event, cleared);
    else if (context.state === "suspended") {
      pending.set(event, { requestedAt: performance.now(), cleared });
      resume();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    pending.clear();
    for (const active of Object.values(voices)) {
      for (const source of active) source.stop();
      active.clear();
    }
    buffers.clear();
  }
  return { resume, play, dispose };
}
