/**
 * Estimate reading time in minutes for Chinese text.
 * Chinese reading speed ≈ 350 chars/min for prose.
 */
export function readingTimeMinutes(text: string): number {
  const chars = text.length;
  const minutes = Math.ceil(chars / 350);
  return Math.max(1, minutes);
}
