import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
}).refine(
  (d) => !d.has_fate || (d.fate_summary && d.fate_summary.length > 0),
  { message: 'fate required when has_fate' }
);

describe('idiom schema (smoke)', () => {
  it('rejects bad slug', () => {
    expect(() => schema.parse({ slug: 'Not Slug', has_fate: false, categories: ['x'] })).toThrow();
  });
  it('requires fate_summary when has_fate', () => {
    expect(() => schema.parse({ slug: 'ok', has_fate: true, categories: ['x'] })).toThrow(/fate/);
  });
  it('accepts valid', () => {
    expect(schema.parse({ slug: 'ok-1', has_fate: false, categories: ['x'] })).toBeTruthy();
  });
});