import { describe, it, expect } from 'vitest';
import { pinyinInitial, groupByInitial } from '~/utils/slug';

describe('pinyinInitial', () => {
  it('returns uppercase first letter', () => {
    expect(pinyinInitial('zao')).toBe('Z');
    expect(pinyinInitial('chuān')).toBe('C');
  });
  it('returns # for non-alpha', () => {
    expect(pinyinInitial('1abc')).toBe('#');
  });
});

describe('groupByInitial', () => {
  it('groups by initial sorted', () => {
    const list = [
      { data: { pinyin: 'zhong' } },
      { data: { pinyin: 'chi' } },
      { data: { pinyin: 'zao' } },
    ] as any;
    const g = groupByInitial(list);
    expect([...g.keys()]).toEqual(['C', 'Z']);
    expect(g.get('Z')?.map((e: any) => e.data.pinyin)).toEqual(['zao', 'zhong']);
  });
});