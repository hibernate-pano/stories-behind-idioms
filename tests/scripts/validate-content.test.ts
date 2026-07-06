import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../../scripts/validate-content';

describe('parseFrontmatter', () => {
  it('parses simple frontmatter', () => {
    const out = parseFrontmatter('---\ntitle: 凿壁偷光\nslug: zao\n---\nbody');
    expect(out.title).toBe('凿壁偷光');
    expect(out.slug).toBe('zao');
  });
  it('throws on missing', () => {
    expect(() => parseFrontmatter('body text')).toThrow();
  });
});
