import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

function getCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'dev';
  }
}

function getBuildDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __COMMIT_HASH__: JSON.stringify(getCommitHash()),
      __BUILD_DATE__: JSON.stringify(getBuildDate()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
