import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/wagmi/',
  plugins: [react()],
  server: {
    proxy: {
      '/rpc/sepolia': {
        target: 'https://ethereum-sepolia-rpc.publicnode.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/',
      },
    },
  },
});
