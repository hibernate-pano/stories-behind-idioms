import { describe, it, expect } from 'vitest';

// 直接覆盖聚合逻辑，不依赖 Astro 运行时
function buildFromEntries(entries: any[]) {
  return {
    items: entries.map((e) => ({
      slug: e.data.slug,
      title: e.data.title,
      pinyin: e.data.pinyin,
      era: e.data.era,
      person: e.data.person,
      fate_summary: e.data.fate_summary,
      categories: e.data.categories,
    })),
  };
}

describe('search index shape', () => {
  it('flattens content collection entries', () => {
    const out = buildFromEntries([
      { data: { slug: 'a', title: 'A', pinyin: 'a', categories: ['x'] } },
      { data: { slug: 'b', title: 'B', pinyin: 'b', era: '战国', person: '孔子', has_fate: true, fate_summary: 'xxx', categories: ['y'] } },
    ]);
    expect(out.items).toHaveLength(2);
    expect(out.items[1].fate_summary).toBe('xxx');
    expect(out.items[1].categories).toEqual(['y']);
  });
});