import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { buildManifest } from './manifest.ts'

/** Writes dist/manifest.json for the Subly origin this build points at (VITE_SUBLY_URL) */
function manifestPlugin(baseUrl: string): Plugin {
  return {
    name: 'subly-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(buildManifest(baseUrl), null, 2) + '\n',
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const baseUrl = env.VITE_SUBLY_URL || 'https://web.subly.app'

  return {
    plugins: [react(), manifestPlugin(baseUrl)],
    build: {
      rollupOptions: {
        // The popup is index.html; the service worker is its own entry so it can share code with it
        input: { main: 'index.html', sw: 'src/background/sw.ts' },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
