/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative asset paths so the built app can be served from any base by the node server
  base: './',
  server: {
    // dev: proxy the API to the zero-dep node server
    proxy: {
      '/api': 'http://localhost:3050',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
