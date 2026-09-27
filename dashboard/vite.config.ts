import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dashboard/' : '/',
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('../dashboard-dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/zrender/')) return 'zrender';
          if (id.includes('/node_modules/echarts/')) return 'echarts';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
