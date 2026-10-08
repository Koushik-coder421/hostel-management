import { sveltekit } from "@sveltejs/kit/vite";
import stylex from "@stylexjs/unplugin";
import { defineConfig } from "vitest/config";
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      }
    }
  },
  preview: { host: "127.0.0.1", port: 5180, strictPort: true },
  plugins: [
    ...(process.env.VITEST
      ? []
      : [
          stylex.vite({
            dev: process.env.NODE_ENV !== "production",
            runtimeInjection: false,
            treeshakeCompensation: true,
            useCSSLayers: { prefix: "product" },
            lightningcssOptions: {
              targets: {
                chrome: 123 << 16,
                firefox: 120 << 16,
                safari: (17 << 16) | (5 << 8),
              },
            },
            unstable_moduleResolution: {
              type: "commonJS",
              rootDir: process.cwd(),
            },
          }),
        ]),
    sveltekit(),
  ],
  optimizeDeps: { exclude: ["@astryx-svelte/core"] },
  ssr: { noExternal: ["@astryx-svelte/core"] },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
