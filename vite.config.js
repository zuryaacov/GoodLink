import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "good-link",
      project: "javascript-react",
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    sourcemap: true,
  },

  // Vitest configuration for unit/integration tests
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    // רק הבדיקות שלך בתוך src
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // להתעלם מ-node_modules ותיקיות אחרות (backend / workers / playwright)
    exclude: [
      'node_modules/**',
      'goodlink-backend/**',
      'link-redirect/**',
      'logger-worker/**',
      'turnstile-verification/**',
      'url-safety-check/**',
      'lemon-squeezy-webhook/**',
      'tests/**',
      'playwright.config.*',
    ],
  },
})