const { expect } = require('@playwright/test');

let counter = 0;
const runTag = Date.now().toString(36).slice(-5);

/** Datos únicos para una cuenta de prueba. */
function newAccount(label = 'u') {
  counter += 1;
  const username = `${label}_${runTag}${counter}`;
  return { username, email: `${username}@example.test`, password: 'password-e2e-123' };
}

/** Registra la cuenta por API (la cookie queda en el contexto del navegador). */
async function registerByApi(page, account, referralCode) {
  const response = await page.request.post('/api/v1/auth/register', {
    data: { ...account, ...(referralCode ? { referralCode } : {}) },
  });
  expect(response.status(), await response.text()).toBe(201);
}

/** Crea un luchador por API v2 (idempotente por requestId) y devuelve el luchador. */
async function createFighterByApi(page, name) {
  const response = await page.request.post('/api/v2/fighters', {
    data: { name, requestId: `e2e-${name}-${Date.now()}` },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).fighter;
}

async function myReferralCode(page) {
  const response = await page.request.get('/api/v2/referrals/me');
  expect(response.status()).toBe(200);
  return (await response.json()).referralCode;
}

async function logoutByApi(page) {
  const response = await page.request.post('/api/v1/auth/logout');
  expect(response.status()).toBe(204);
}

module.exports = { newAccount, registerByApi, createFighterByApi, myReferralCode, logoutByApi };
