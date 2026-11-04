export type CatCell = readonly [row: number, col: number];
export const CAT_EXPRESSIONS = [
  "dazed",
  "sleepy",
  "playful",
  "teary",
  "sparkle",
  "wonder",
  "happy",
  "grin",
] as const;
export type CatExpression = (typeof CAT_EXPRESSIONS)[number];
export interface CatRegion {
  id: string;
  cells: CatCell[];
  face: { row: number; col: number };
  ears: [CatCell, CatCell];
}

/** Small player-local flood fill; never reads colours, mutates the board or consumes gameplay randomness. */
export function getCatRegions(
  input: readonly CatCell[],
  groupAt: (row: number, col: number) => string = () => "normal",
): CatRegion[] {
  const occupied = new Set(
    input
      .filter(
        ([r, c]) =>
          Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0,
      )
      .map(([r, c]) => `${r},${c}`),
  );
  const pending = new Set(occupied);
  const regions: CatRegion[] = [];
  for (const key of occupied) {
    if (!pending.delete(key)) continue;
    const cells: CatCell[] = [key.split(",").map(Number) as [number, number]];
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      for (const [nr, nc] of [
        [r - 1, c],
        [r, c + 1],
        [r + 1, c],
        [r, c - 1],
      ]) {
        if (pending.has(`${nr},${nc}`) && groupAt(nr, nc) === groupAt(r, c)) {
          pending.delete(`${nr},${nc}`);
          cells.push([nr, nc]);
        }
      }
    }
    cells.sort(([ar, ac], [br, bc]) => ar - br || ac - bc);
    const top = cells.filter(([r]) => r === cells[0][0]);
    const centre = {
      row: cells.reduce((sum, [r]) => sum + r + 0.5, 0) / cells.length,
      col: cells.reduce((sum, [, c]) => sum + c + 0.5, 0) / cells.length,
    };
    // The mean can fall in the empty part of an L or a ring. Only allow a face
    // whose whole footprint lies inside the component, including its centre.
    const component = new Set(cells.map(([r, c]) => `${r},${c}`));
    const fits = ({ row, col }: typeof centre) =>
      [-0.4, 0, 0.4].every((dy) =>
        [-0.4, 0, 0.4].every((dx) =>
          component.has(`${Math.floor(row + dy)},${Math.floor(col + dx)}`),
        ),
      );
    const candidates = [
      centre,
      ...cells.map(([row, col]) => ({ row: row + 0.5, col: col + 0.5 })),
    ];
    const face = candidates
      .filter(fits)
      .sort(
        (a, b) =>
          (a.row - centre.row) ** 2 +
          (a.col - centre.col) ** 2 -
          (b.row - centre.row) ** 2 -
          (b.col - centre.col) ** 2,
      )[0];
    regions.push({
      id: `${cells[0][0]}-${cells[0][1]}`,
      cells,
      face,
      ears: [top[0], top[top.length - 1]],
    });
  }
  return regions;
}

export function hashCatIdentity(identity: string): number {
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++)
    hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
  return hash >>> 0;
}
export function getCatExpression(
  regionId: string,
  seed: number,
): CatExpression {
  return CAT_EXPRESSIONS[
    hashCatIdentity(`${seed}:${regionId}`) % CAT_EXPRESSIONS.length
  ];
}
