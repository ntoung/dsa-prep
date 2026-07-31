import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { lavishLive } from 'lavish-axi/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Phase 0 spike for annotating the running app (not just a static Lavish
    // artifact) - see lavish-axi's docs/adr/0001-live-app-annotation-overlay.md.
    // Dev-only (apply: 'serve' inside the plugin itself), and it fails soft if
    // the Lavish server isn't running - `npm run dev` works with or without it.
    lavishLive({ name: 'dsa-prep-live' }),
  ],
  // Vite only exposes env vars to client code (import.meta.env) when their
  // name matches this prefix - normally 'VITE_'. FEEDBACK_ENDPOINT/SECRET
  // are the only env vars this app reads client-side, so they're named
  // explicitly here instead of using the 'VITE_' prefix.
  envPrefix: 'FEEDBACK_',
})