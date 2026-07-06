export interface IdiomEntryLike {
  data: {
    slug: string;
    reviewed_date?: string;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function pickTodayIdiom<T extends IdiomEntryLike>(
  entries: T[],
  dateKey: string = todayKey()
): T | undefined {
  if (entries.length === 0) return undefined;
  const idx = hashString(dateKey) % entries.length;
  return entries[idx];
}

export function pickRecent<T extends IdiomEntryLike>(
  entries: T[],
  n: number = 5
): T[] {
  return [...entries]
    .sort((a, b) => (b.data.reviewed_date ?? '').localeCompare(a.data.reviewed_date ?? ''))
    .slice(0, n);
}
