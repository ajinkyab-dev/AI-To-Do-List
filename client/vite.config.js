import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devServerPort = Number.parseInt(env.VITE_DEV_SERVER_PORT || '5173', 10);
  const proxyTarget = env.VITE_API_PROXY || env.VITE_API_BASE_URL || (mode === 'development' ? 'http://localhost:8000' : undefined);

  const server = {
    port: devServerPort
  };

  if (proxyTarget) {
    server.proxy = {
      '/api': {
        target: proxyTarget,
        changeOrigin: true
      }
    };
  }

  return {
    plugins: [react()],
    server,
    build: {
      outDir: 'dist'
    }
  };
});