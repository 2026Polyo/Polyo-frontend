import type { ThemeSoundCue } from "./gameThemes";

type FileCue = Extract<ThemeSoundCue, { kind: "file" | "files" }>;
const filesByContext = new WeakMap<AudioContext, Map<string, Promise<AudioBuffer>>>();

/** Share decoded assets, while playback and variation order stay player-local. */
export async function preloadThemeFiles(context: AudioContext, cue: FileCue): Promise<{ src: string; buffer: AudioBuffer }[]> {
  let cache = filesByContext.get(context);
  if (!cache) { cache = new Map(); filesByContext.set(context, cache); }
  const sources = cue.kind === "file" ? [cue.src] : [...new Set(cue.sources)];
  const results = await Promise.allSettled(sources.map(async src => {
    let decoded = cache.get(src);
    if (!decoded) {
      decoded = fetch(src).then(response => {
        if (!response.ok) throw new Error("Audio unavailable");
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes));
      cache.set(src, decoded);
    }
    try {
      return { src, buffer: await decoded };
    } catch (error) {
      if (cache.get(src) === decoded) cache.delete(src);
      throw error;
    }
  }));
  return results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
}
