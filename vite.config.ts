import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite only exposes env vars to client code (import.meta.env) when their
  // name matches this prefix - normally 'VITE_'. FEEDBACK_ENDPOINT/SECRET
  // are the only env vars this app reads client-side, so they're named
  // explicitly here instead of using the 'VITE_' prefix.
  envPrefix: 'FEEDBACK_',
})