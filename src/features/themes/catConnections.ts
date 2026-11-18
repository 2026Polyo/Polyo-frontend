/** Only orthogonal occupied neighbours join. Colours and original piece IDs do not matter. */
export function getCatConnections(
  isFilled: (row: number, col: number) => boolean,
  row: number,
  col: number,
): string {
  return [
    isFilled(row - 1, col) && "top",
    isFilled(row, col + 1) && "right",
    isFilled(row + 1, col) && "bottom",
    isFilled(row, col - 1) && "left",
  ]
    .filter(Boolean)
    .join(" ");
}
