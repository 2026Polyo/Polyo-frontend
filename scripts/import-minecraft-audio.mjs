import fs from "node:fs/promises";
import crypto from "node:crypto";

// Run deliberately to import the pinned Java 1.21.1 audio; never runs during build/test.
const repository = "InventivetalentDev/minecraft-assets";
const version = "1.21.1";
const revision = "aef047f783f44424a591eeecf6b230d5bb0c8095";
const destination = "src/asset/sound/minecraft";
const families = ["stone", "metal", "slime_block", "coral_block", "nylium", "wart_block",
  "cherry_wood", "moss", "glass", "amethyst_block", "grass", "wool"];
const digest = (kind, bytes) => crypto.createHash(kind).update(bytes).digest("hex");
async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
const tree = JSON.parse(await fetchBytes(`https://api.github.com/repos/${repository}/git/trees/${revision}?recursive=1`));
if (tree.truncated) throw Error("Incomplete source file roster");
const roster = new Map(tree.tree.map(entry => [entry.path, entry]));
const base = `https://raw.githubusercontent.com/${repository}/${revision}/assets/minecraft/`;
const definitionBytes = await fetchBytes(base + "sounds.json");
const definitions = JSON.parse(definitionBytes);
const events = {};
const names = new Set();
for (const event of [...families.flatMap(family => ["place", "hit", "break"].map(action => `block.${family}.${action}`)), "entity.item.pickup"]) {
  if (!definitions[event]?.sounds?.length) throw Error(`Missing original event ${event}`);
  events[event] = definitions[event].sounds.slice(0, 2).map(sound => {
    const sample = typeof sound === "string" ? { name: sound } : sound;
    if (sample.type === "event" || !/^[a-z0-9_/-]+$/.test(sample.name)) throw Error(`Unsupported original sample ${event}`);
    names.add(sample.name);
    return { name: sample.name, volume: sample.volume ?? 1, pitch: sample.pitch ?? 1 };
  });
}
const fileNames = [...names].sort();
const downloads = new Map(); let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < fileNames.length) {
    const name = fileNames[cursor++], path = `assets/minecraft/sounds/${name}.ogg`;
    const entry = roster.get(path); if (!entry) throw Error(`Source file missing: ${path}`);
    const bytes = await fetchBytes(base + `sounds/${name}.ogg`);
    if (bytes.length !== entry.size || bytes.subarray(0, 4).toString() !== "OggS" || bytes.indexOf(Buffer.from("\x01vorbis")) < 0) throw Error(`Invalid Ogg Vorbis: ${name}`);
    const gitHash = digest("sha1", Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));
    if (gitHash !== entry.sha) throw Error(`Source hash mismatch: ${name}`);
    downloads.set(name, { bytes, gitHash, sha256: digest("sha256", bytes), url: base + `sounds/${name}.ogg` });
  }
}));
const chunks = [Buffer.from("POLYOMCA1\0\0\0")]; let offset = chunks[0].length;
const files = fileNames.map((name, index) => {
  const source = downloads.get(name), entry = { id: name, offset, bytes: source.bytes.length };
  chunks.push(source.bytes); offset += source.bytes.length;
  return { ...entry, index, ...source, bytes: source.bytes.length };
});
const bank = Buffer.concat(chunks);
const runtime = {
  version,
  files: files.map(({ id, offset, bytes }) => ({ id, offset, bytes })),
  events: Object.fromEntries(Object.entries(events).map(([event, samples]) => [event,
    samples.map(sample => ({ file: fileNames.indexOf(sample.name), volume: sample.volume, pitch: sample.pitch }))])),
};
const provenance = {
  version, repository: `https://github.com/${repository}`, revision,
  copyright: "Original Minecraft audio © Mojang AB. Source availability grants no new license.",
  license: "LicenseRef-Mojang-Proprietary",
  soundDefinitions: { url: base + "sounds.json", sha256: digest("sha256", definitionBytes) },
  selection: "First two original samples per used sound event; shared samples deduplicated. Audio bytes are not re-encoded.",
  bank: { file: "originals.bin", bytes: bank.length, sha256: digest("sha256", bank) },
  files: files.map(({ id, offset, bytes, gitHash, sha256, url }) => ({ id, offset, bytes, gitBlobSha1: gitHash, sha256, url })),
};
await fs.mkdir(destination, { recursive: true });
// Refuse to overwrite a different package; updates must use a new reviewed destination.
for (const name of ["originals.bin", "bank.ts", "provenance.json"]) {
  try { await fs.access(`${destination}/${name}`); throw Error(`Destination already exists: ${name}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await fs.writeFile(`${destination}/originals.bin`, bank, { flag: "wx" });
await fs.writeFile(`${destination}/bank.ts`, "// Generated from the pinned Java 1.21.1 sounds.json. Original bytes are in originals.bin.\n"
  + "export interface MinecraftBankSample { file: number; volume: number; pitch: number }\n"
  + "export const MINECRAFT_AUDIO_BANK: {version: string; files: {id: string; offset: number; bytes: number}[]; events: Record<string, readonly MinecraftBankSample[]>} = "
  + JSON.stringify(runtime, null, 2) + ";\n", { flag: "wx" });
await fs.writeFile(`${destination}/provenance.json`, JSON.stringify(provenance, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ version, revision, files: files.length, events: Object.keys(events).length, bytes: bank.length, sha256: provenance.bank.sha256 }));
