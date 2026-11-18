# Minecraft theme reference assets

## Block faces — current artwork

The 18 user-approved material choices use the original Minecraft block textures again. The simplified SVG alternatives were removed. The 22 PNG faces are flat 64×64 renders from [Block Render](https://blockrender.dev/minecraft-textures/) with shading disabled and no margin.

The material names and color mapping remain stable. Crimson nylium uses its red top on the board and distinct side/top/bottom faces on the item cube. TNT also uses distinct side/top/bottom faces. Normal tiles, tray pieces, previews, mining snapshots, and six-face CSS item cubes share these textures through `minecraftMaterials.ts`.

All images are local. Existing colored frames remain outside the artwork. Gameplay never fetches images from third-party services.

## Removal animation — retained reference artwork

The 22 block faces, 10 mining-crack PNGs (`destroy_stage_0`…`destroy_stage_9`) and 8 white particle PNGs (`generic_0`…`generic_7`) are original Minecraft artwork belonging to Mojang AB. Source access does not convey a new license. `provenance.json` records all 40 files with source URLs, dimensions, byte lengths and SHA-256 hashes.

- Mining cracks: [Block Render](https://blockrender.dev/minecraft-textures/), 16×16.
- White particles: [Minecraft Java Edition 1.21.1 asset reference](https://github.com/InventivetalentDev/minecraft-assets/tree/1.21.1/assets/minecraft/textures/particle), 8×8. Playback order remains 7 → 0.

No source text is added to the game UI.
