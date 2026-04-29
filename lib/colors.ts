// Map a frustration score (1-10) to an HSL color string.
// Score 1  -> hue 120 (green)
// Score 10 -> hue 0   (red)
export function frustrationColor(score: number): string {
  const clamped = Math.max(1, Math.min(10, score));
  const t = (clamped - 1) / 9; // 0..1
  const hue = 120 - 120 * t;
  return `hsl(${hue}, 70%, 45%)`;
}

// Pick a readable text color (white or near-black) given a background hue.
// At our saturation/lightness, white reads fine across the whole range.
export function frustrationTextColor(): string {
  return '#ffffff';
}
