import { describe, it, expect } from 'vitest';
import { readingTimeMinutes } from '~/utils/reading';

describe('readingTimeMinutes', () => {
  it('returns at least 1 minute for short text', () => {
    expect(readingTimeMinutes('凿壁偷光')).toBe(1);
    expect(readingTimeMinutes('')).toBe(1);
  });

  it('rounds up partial minutes', () => {
    // 350 chars exactly -> 1 minute
    expect(readingTimeMinutes('字'.repeat(350))).toBe(1);
    // 351 chars -> 2 minutes
    expect(readingTimeMinutes('字'.repeat(351))).toBe(2);
  });

  it('scales for longer text', () => {
    // 700 chars -> 2 minutes
    expect(readingTimeMinutes('字'.repeat(700))).toBe(2);
    // 3500 chars -> 10 minutes
    expect(readingTimeMinutes('字'.repeat(3500))).toBe(10);
  });
});
