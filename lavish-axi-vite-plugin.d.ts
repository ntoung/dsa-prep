// Ambient declaration for the lavish-axi fork's Vite plugin subpath export - the fork ships
// plain JS (checkJs, no declaration emit), so TS needs this to resolve the import in
// vite.config.ts. See lavish-axi's docs/adr/0001-live-app-annotation-overlay.md.
declare module 'lavish-axi/vite-plugin' {
  export function lavishLive(options: { name: string; host?: string; port?: number }): {
    name: string
    apply: 'serve'
    transformIndexHtml: () => Promise<unknown>
  }
}
