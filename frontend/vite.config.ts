/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Fuso diferente do de Brasília: prova que as datas não dependem do fuso do computador.
    env: { TZ: 'UTC' },
    // Testes de formulário digitam muitos campos; 5 s (padrão) falhava por lentidão com a suíte em paralelo.
    testTimeout: 15_000,
  },
});
