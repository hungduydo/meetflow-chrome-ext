/// <reference types="node" />
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                // Sidebar — injected into Google Meet DOM (T1.2)
                sidebar: resolve(__dirname, "sidebar.html"),
                // Extension popup
                popup: resolve(__dirname, "popup.html"),
                // Background service worker (T1.3 audio capture, WS)
                background: resolve(__dirname, "src/background.ts"),
                // Content script injected into meet.google.com
                content: resolve(__dirname, "src/content.ts"),
            },
            output: {
                entryFileNames: (chunk) => {
                    // Keep background/content as flat files (MV3 requirement)
                    if (["background", "content"].includes(chunk.name)) {
                        return "src/[name].js";
                    }
                    return "assets/[name]-[hash].js";
                },
                chunkFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash].[ext]",
            },
        },
    },
    resolve: {
        alias: { "@": resolve(__dirname, "src") },
    },
});
