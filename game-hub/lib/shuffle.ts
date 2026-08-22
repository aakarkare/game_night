export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const shuffled = [...items];
  let state = 0;

  for (const character of seed) {
    state = (state * 31 + character.charCodeAt(0)) >>> 0;
  }

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
