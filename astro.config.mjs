import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://idioms-stories.pages.dev',
  build: {
    format: 'directory',
  },
  experimental: {
    contentLayer: true,
  },
  vite: {
    ssr: {
      noExternal: ['fuse.js'],
    },
  },
});
