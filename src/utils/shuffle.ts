// Fisher–Yates shuffle. `shuffleInPlace` mutates and returns the same array;
// `shuffle` returns a new shuffled array and leaves the input untouched.
export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function shuffle<T>(array: readonly T[]): T[] {
  return shuffleInPlace([...array]);
}
