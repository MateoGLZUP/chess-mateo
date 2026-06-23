import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// En build (GitHub Pages) la app vive bajo /chess-mateo/.
// En desarrollo local se sirve desde la raiz.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/chess-mateo/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,woff,woff2,wasm}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: "Chess Mateo — Puzzles",
        short_name: "Chess Mateo",
        description: "Entrena tactica de ajedrez con puzzles adaptativos.",
        lang: "es",
        theme_color: "#16161f",
        background_color: "#16161f",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
}));
