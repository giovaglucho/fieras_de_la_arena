// Pruebas end-to-end con Playwright.
// Levantan su propio servidor (puerto 3100) y cliente Vite (puerto 5174) contra una base
// de datos exclusiva (`fieras_e2e`) que se recrea en cada ejecución, sin tocar tus datos.
const { defineConfig, devices } = require('@playwright/test');

const SERVER_PORT = 3100;
const CLIENT_PORT = 5174;
const MONGO_BASE = process.env.E2E_MONGODB_BASE ?? 'mongodb://127.0.0.1:27017';
const E2E_DB = 'fieras_e2e';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: require.resolve('./e2e/global-setup.js'),
  globalTeardown: require.resolve('./e2e/global-teardown.js'),
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node src/server.js',
      cwd: './server',
      url: `http://localhost:${SERVER_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(SERVER_PORT),
        CLIENT_URL: `http://localhost:${CLIENT_PORT}`,
        MONGODB_URI: `${MONGO_BASE}/${E2E_DB}`,
        SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
        TRUST_PROXY: '0',
        RATE_LIMIT_STORE: 'memory',
        REGISTRATION_RATE_LIMIT: '1000',
        LOGIN_RATE_LIMIT: '1000',
        SENSITIVE_READ_RATE_LIMIT: '5000',
        FIGHTER_CREATION_ACCOUNT_LIMIT: '100',
        FIGHTER_CREATION_IP_LIMIT: '1000',
      },
    },
    {
      command: `npm run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: './client',
      url: `http://localhost:${CLIENT_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${SERVER_PORT}` },
    },
  ],
});
