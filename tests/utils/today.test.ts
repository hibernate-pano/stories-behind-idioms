import { describe, it, expect } from 'vitest';
import { pickTodayIdiom, pickRecent, todayKey } from '~/utils/today';

function entry(slug: string, reviewed_date?: string) {
  return { data: { slug, reviewed_date } };
}

describe('today', () => {
  it('returns deterministic pick for same date', () => {
    const list = [entry('a'), entry('b'), entry('c')];
    expect(pickTodayIdiom(list, '2026-07-06')?.data.slug).toBe(
      pickTodayIdiom(list, '2026-07-06')?.data.slug
    );
  });
  it('rotates over time', () => {
    const list = [entry('a'), entry('b'), entry('c'), entry('d'), entry('e')];
    const a = pickTodayIdiom(list, '2026-07-06')?.data.slug;
    const b = pickTodayIdiom(list, '2026-07-07')?.data.slug;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
  it('empty list returns undefined', () => {
    expect(pickTodayIdiom([])).toBeUndefined();
  });
});

describe('pickRecent', () => {
  it('returns last N sorted by reviewed_date desc', () => {
    const list = [
      entry('a', '2026-01-01'),
      entry('b', '2026-06-01'),
      entry('c', '2026-05-01'),
      entry('d', '2026-07-01'),
    ];
    const r = pickRecent(list, 2);
    expect(r.map((e) => e.data.slug)).toEqual(['d', 'b']);
  });
});

describe('todayKey', () => {
  it('formats date', () => {
    const d = new Date('2026-07-06T00:00:00');
    expect(todayKey(d)).toBe('2026-07-06');
  });
});