import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
