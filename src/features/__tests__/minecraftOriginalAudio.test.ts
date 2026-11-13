/// <reference types="node" />
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINECRAFT_AUDIO_BANK } from "../../asset/sound/minecraft/bank";
import { getMinecraftOriginalEvent, preloadMinecraftOriginalAudio } from "../themes/minecraftOriginalAudio";
import { MINECRAFT_SOUND_FAMILIES } from "../themes/minecraftSound";
import { fakeAudioContext } from "./audioTestContext";

const bankBytes = readFileSync(new URL("../../asset/sound/minecraft/originals.bin", import.meta.url));
const hash = (algorithm: string, bytes: Uint8Array) => createHash(algorithm).update(bytes).digest("hex");
const asArrayBuffer = () => Uint8Array.from(bankBytes).buffer;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("versioned original Minecraft audio", () => {
  it("retains the verified original Ogg bytes and valid event references", () => {
    const provenance = JSON.parse(readFileSync(new URL("../../asset/sound/minecraft/provenance.json", import.meta.url), "utf8"));
    expect(hash("sha256", bankBytes)).toBe(provenance.bank.sha256);
    expect(bankBytes.length).toBe(provenance.bank.bytes);
    expect(bankBytes.subarray(0, 12).toString()).toBe("POLYOMCA1\0\0\0");
    expect(provenance.files).toHaveLength(MINECRAFT_AUDIO_BANK.files.length);
    let offset = 12;
    for (const [index, entry] of MINECRAFT_AUDIO_BANK.files.entries()) {
      expect(entry.offset).toBe(offset);
      const bytes = bankBytes.subarray(entry.offset, entry.offset + entry.bytes);
      expect(bytes.subarray(0, 4).toString()).toBe("OggS");
      expect(bytes.includes(Buffer.from("\x01vorbis"))).toBe(true);
      const source = provenance.files[index];
      expect(source.id).toBe(entry.id);
      expect(hash("sha256", bytes)).toBe(source.sha256);
      expect(hash("sha1", Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))).toBe(source.gitBlobSha1);
      offset += entry.bytes;
    }
    expect(offset).toBe(bankBytes.length);
    for (const family of MINECRAFT_SOUND_FAMILIES) {
      for (const action of ["place", "hit", "break"] as const) {
        const { event } = getMinecraftOriginalEvent(`mc-${family}-${action}`);
        const samples = MINECRAFT_AUDIO_BANK.events[event];
        expect(samples).toHaveLength(2);
        for (const sample of samples) expect(MINECRAFT_AUDIO_BANK.files[sample.file]).toBeDefined();
      }
    }
    expect(getMinecraftOriginalEvent("mc-metal-place").rate).toBeCloseTo(1.2);
    expect(getMinecraftOriginalEvent("mc-stone-place").rate).toBe(0.8);
    expect(getMinecraftOriginalEvent("mc-pickup")).toEqual({ event: "entity.item.pickup", rate: 2 });
  });

  it("fetches once per context, bounds parallel decoding and reuses decoded originals", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, arrayBuffer: async () => asArrayBuffer() }));
    vi.stubGlobal("fetch", fetcher);
    let active = 0, peak = 0;
    const { ctx } = fakeAudioContext();
    const decode = vi.fn(async (bytes: ArrayBuffer) => {
      active++; peak = Math.max(peak, active);
      expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("OggS");
      await Promise.resolve(); active--;
      return ctx.createBuffer(1, 8, ctx.sampleRate);
    });
    Object.assign(ctx, { decodeAudioData: decode });
    const first = preloadMinecraftOriginalAudio(ctx);
    expect(preloadMinecraftOriginalAudio(ctx)).toBe(first);
    const bank = await first;
    expect(bank.buffers.size).toBe(MINECRAFT_AUDIO_BANK.files.length);
    expect(decode).toHaveBeenCalledTimes(MINECRAFT_AUDIO_BANK.files.length);
    expect(peak).toBeLessThanOrEqual(4);
    expect(await preloadMinecraftOriginalAudio(ctx)).toBe(bank);
    expect(fetcher).toHaveBeenCalledOnce();
    const other = fakeAudioContext();
    Object.assign(other.ctx, { decodeAudioData: decode });
    expect(await preloadMinecraftOriginalAudio(other.ctx)).not.toBe(bank);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects unavailable or corrupt banks and allows a later retry", async () => {
    const { ctx } = fakeAudioContext();
    const decode = vi.fn(async () => ctx.createBuffer(1, 8, ctx.sampleRate));
    Object.assign(ctx, { decodeAudioData: decode });
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(12) })
      .mockResolvedValue({ ok: true, arrayBuffer: async () => asArrayBuffer() });
    vi.stubGlobal("fetch", fetcher);
    for (let i = 0; i < 3; i++) await expect(preloadMinecraftOriginalAudio(ctx)).rejects.toThrow();
    expect(decode).not.toHaveBeenCalled();
    expect((await preloadMinecraftOriginalAudio(ctx)).buffers.size).toBe(MINECRAFT_AUDIO_BANK.files.length);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
