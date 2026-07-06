import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const idiomSchema = z.object({
  title: z.string().min(2).max(8),
  pinyin: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case latin'),
  era: z.string().optional(),
  era_year: z.number().int().optional(),
  person: z.string().optional(),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
  contributed_by: z.string().default('ai-draft-v1'),
  reviewed_date: z.string().optional(),
}).refine(
  (data) => !data.has_fate || (data.fate_summary && data.fate_summary.length > 0),
  { message: 'has_fate=true 时必须填 fate_summary', path: ['fate_summary'] }
);

const idioms = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/idioms' }),
  schema: idiomSchema,
});

export const collections = { idioms };