import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  // Live-mode tests start a cold Vite compiler on a fresh CI runner.
  timeout: 60000,
  expect: { timeout: 20000 },
  use: {
    baseURL: "http://127.0.0.1:5180",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm preview",
      port: 5180,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm dev --port 5181",
      port: 5181,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_MODE: "live", VITE_API_BASE_URL: "/api/v1" },
    },
  ],
});
