import { getCollection } from 'astro:content';

export interface SearchItem {
  slug: string;
  title: string;
  pinyin: string;
  era?: string;
  person?: string;
  fate_summary?: string;
  categories: string[];
}

export async function buildSearchIndex(): Promise<{ items: SearchItem[] }> {
  const idioms = await getCollection('idioms');
  return {
    items: idioms.map((e) => ({
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