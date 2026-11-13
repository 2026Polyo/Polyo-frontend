import bankUrl from "../../asset/sound/minecraft/originals.bin?url";
import { MINECRAFT_AUDIO_BANK } from "../../asset/sound/minecraft/bank";
import type { MinecraftSoundFamily, MinecraftSoundPreset } from "./minecraftSound";

const JAVA_FAMILY: Record<MinecraftSoundFamily, string> = {
  stone: "stone", metal: "metal", slime: "slime_block", coral: "coral_block", nylium: "nylium",
  nether_wart: "wart_block", cherry_wood: "cherry_wood", moss_block: "moss", glass: "glass",
  amethyst_block: "amethyst_block", grass: "grass", cloth: "wool",
};

export function getMinecraftOriginalEvent(preset: MinecraftSoundPreset): { event: string; rate: number } {
  if (preset === "mc-pickup") return { event: "entity.item.pickup", rate: 2 };
  const match = /^mc-(.+)-(place|hit|break)$/.exec(preset);
  const family = match?.[1] as MinecraftSoundFamily;
  if (!match || !Object.prototype.hasOwnProperty.call(JAVA_FAMILY, family)) throw new RangeError("Unknown Minecraft audio event");
  const pitch = family === "metal" ? 1.5 : 1;
  return { event: `block.${JAVA_FAMILY[family]}.${match[2]}`, rate: pitch * (match[2] === "hit" ? 0.5 : 0.8) };
}

export interface MinecraftOriginalBank {
  buffers: ReadonlyMap<number, AudioBuffer>;
  events: typeof MINECRAFT_AUDIO_BANK.events;
}
export type MinecraftAudioLoader = (context: AudioContext) => Promise<MinecraftOriginalBank>;

// Read-only audio data may be reused within one player's context. Other players have separate keys.
const banks = new WeakMap<AudioContext, Promise<MinecraftOriginalBank>>();

export const preloadMinecraftOriginalAudio: MinecraftAudioLoader = context => {
  const existing = banks.get(context); if (existing) return existing;
  const promise = (async () => {
    const response = await fetch(bankUrl);
    if (!response.ok) throw new Error("Minecraft audio unavailable");
    const bytes = await response.arrayBuffer();
    const last = MINECRAFT_AUDIO_BANK.files[MINECRAFT_AUDIO_BANK.files.length - 1];
    if (bytes.byteLength !== last.offset + last.bytes
      || new TextDecoder().decode(bytes.slice(0, 12)) !== "POLYOMCA1\0\0\0") {
      throw new Error("Invalid Minecraft audio bank");
    }
    const buffers = new Map<number, AudioBuffer>(); let cursor = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < MINECRAFT_AUDIO_BANK.files.length) {
        if (context.state === "closed") throw new Error("Audio context closed");
        const index = cursor++, entry = MINECRAFT_AUDIO_BANK.files[index];
        const buffer = await context.decodeAudioData(bytes.slice(entry.offset, entry.offset + entry.bytes));
        buffers.set(index, buffer);
      }
    }));
    return { buffers, events: MINECRAFT_AUDIO_BANK.events };
  })().catch(error => { if (banks.get(context) === promise) banks.delete(context); throw error; });
  banks.set(context, promise);
  return promise;
};
