import { vi } from "vitest";

export function fakeAudioContext(state: AudioContextState = "running") {
  function makeSource() {
    return { buffer: null as AudioBuffer | null, playbackRate: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
  }
  const sources: ReturnType<typeof makeSource>[] = [];
  const gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    sampleRate: 8000, state, currentTime: 3, destination: {},
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const samples = new Float32Array(length);
      return { duration: length / sampleRate, length, sampleRate, getChannelData: () => samples };
    },
    createBufferSource: () => { const source = makeSource(); sources.push(source); return source; },
    createGain: () => { const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain; },
    resume: vi.fn(async () => { context.state = "running"; }),
  };
  return { context, ctx: context as unknown as AudioContext, sources, gains };
}
