import type { APIRoute } from 'astro';
import { buildSearchIndex } from '~/content/search-index';

export const GET: APIRoute = async () => {
  const idx = await buildSearchIndex();
  return new Response(JSON.stringify(idx), {
    headers: { 'content-type': 'application/json' },
  });
};
