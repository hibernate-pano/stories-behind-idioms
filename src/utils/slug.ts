export function pinyinInitial(pinyin: string): string {
  const first = pinyin.trim().charAt(0).toUpperCase();
  if (!/[A-Z]/.test(first)) return '#';
  return first;
}

export function groupByInitial<T extends { data: { pinyin: string } }>(
  entries: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const k = pinyinInitial(e.data.pinyin);
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.data.pinyin.localeCompare(b.data.pinyin));
  }
  return new Map([...map.entries()].sort());
}