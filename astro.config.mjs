import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://idioms-stories.pages.dev',
  build: {
    format: 'directory',
  },
  vite: {
    ssr: {
      noExternal: ['fuse.js'],
    },
  },
});
