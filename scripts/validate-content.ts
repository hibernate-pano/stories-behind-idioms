import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Matches src/content/config.ts idiomSchema closely; reviewed_date is z.string()
// (not Date) so YAML-parsed unquoted date strings like `2026-07-06` don't get
// coerced into Date objects that would fail validation. See Task 4 fix.
const schema = z.object({
  title: z.string().min(2).max(8),
  pinyin: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  has_fate: z.boolean(),
  fate_summary: z.string().optional(),
  categories: z.array(z.string()).min(1),
  sources: z.array(z.string()).min(1),
  contributed_by: z.string(),
  reviewed_date: z.string().optional(),
}).refine(
  (d) => !d.has_fate || (d.fate_summary && d.fate_summary.length > 0),
  { message: 'fate_summary required when has_fate=true' }
).refine(
  (d) => d.contributed_by !== 'reviewed' || (d.reviewed_date && /^\d{4}-\d{2}-\d{2}$/.test(d.reviewed_date)),
  { message: 'reviewed must have valid reviewed_date' }
);

/**
 * Minimal frontmatter parser - sufficient for flat string fields used in tests
 * and as a contract for the simple line-based frontmatter shape. For real
 * validation against `content/` and `drafts/`, see `parseRealFrontmatter`.
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('No frontmatter found');
  const out: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

/**
 * Real frontmatter parser that handles quoted strings, booleans, numbers, and
 * `- item` arrays so that production entries (e.g. `has_fate: true`,
 * `categories: [...]`) match the zod schema's typed fields.
 */
function parseRealFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('No frontmatter found');
  const block = m[1];
  const out: Record<string, unknown> = {};
  const lines = block.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    let rest = kv[2];

    // Array block: `- item` lines indented under an empty-value key.
    if (rest === '') {
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^\s+-\s+/, ''));
        j++;
      }
      if (items.length > 0) {
        out[key] = items;
        i = j;
        continue;
      }
    }

    // Strip surrounding quotes.
    if (
      (rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2) ||
      (rest.startsWith("'") && rest.endsWith("'") && rest.length >= 2)
    ) {
      rest = rest.slice(1, -1);
    }

    if (rest === 'true') out[key] = true;
    else if (rest === 'false') out[key] = false;
    else if (rest !== '' && /^-?\d+$/.test(rest)) out[key] = Number(rest);
    else out[key] = rest;

    i++;
  }
  return out;
}

export function validateDir(dir: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!exists(dir)) return { ok: true, errors: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const fm = parseRealFrontmatter(raw);
    const res = schema.safeParse(fm);
    if (!res.success) {
      errors.push(`${f}: ${res.error.errors.map((e) => e.message).join(', ')}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function exists(p: string): boolean {
  try { statSync(p); return true; } catch { return false; }
}

// Only run the CLI when invoked directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prod = validateDir('content/idioms');
  const draft = validateDir('drafts/idioms');
  const allErrors = [
    ...prod.errors.map((e) => `[content] ${e}`),
    ...draft.errors.map((e) => `[drafts] ${e}`),
  ];
  if (allErrors.length > 0) {
    console.error('✗ Content validation failed:\n' + allErrors.join('\n'));
    process.exit(1);
  }
  const prodCount = exists('content/idioms')
    ? readdirSync('content/idioms').filter((f) => f.endsWith('.md')).length
    : 0;
  const draftCount = exists('drafts/idioms')
    ? readdirSync('drafts/idioms').filter((f) => f.endsWith('.md')).length
    : 0;
  console.log(`✓ Content validated (${prodCount} prod, ${draftCount} drafts)`);
}
