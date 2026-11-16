const { test, expect } = require('@playwright/test');
const {
  newAccount,
  registerByApi,
  createFighterByApi,
  myReferralCode,
  logoutByApi,
} = require('./helpers');

test.describe('Cuenta y luchador', () => {
  test('registro por la interfaz, creación de luchador y panel', async ({ page }) => {
    const account = newAccount('ui');
    await page.goto('/');
    await page.getByRole('link', { name: 'Crear cuenta' }).click();
    await page.getByLabel('Nombre de usuario').fill(account.username);
    await page.getByLabel('Correo electrónico').fill(account.email);
    await page.getByLabel('Contraseña').fill(account.password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/create-fighter$/);
    await page.getByLabel('Nombre del luchador').fill('Colmillo  Rojo');
    await page.getByRole('button', { name: 'Crear luchador' }).click();
    await expect(page.getByText('Atributos asignados por el servidor')).toBeVisible();

    await page.getByRole('button', { name: 'Ir al panel' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    // Conserva mayúsculas y colapsa espacios dobles.
    await expect(page.getByRole('heading', { level: 1, name: 'Colmillo Rojo' })).toBeVisible();
  });

  test('el formulario rechaza nombres con HTML o emojis y no los envía', async ({ page }) => {
    await registerByApi(page, newAccount('nm'));
    await page.goto('/create-fighter');
    const field = page.getByLabel('Nombre del luchador');
    for (const bad of ['<script>x</script>', '🔥🔥🔥Fuego', 'ab', 'Hola!']) {
      await field.fill(bad);
      await page.getByRole('button', { name: 'Crear luchador' }).click();
      await expect(page.getByRole('alert').first()).toContainText('no es válido');
    }
    const list = await page.request.get('/api/v2/fighters');
    expect((await list.json()).fighters).toHaveLength(0);
  });

  test('el servidor también rechaza nombres no permitidos (no depende del cliente)', async ({ page }) => {
    await registerByApi(page, newAccount('sv'));
    for (const name of ['<script>x</script>', '🔥🔥🔥Fuego', 'a--b']) {
      const response = await page.request.post('/api/v2/fighters', {
        data: { name, requestId: `bad-${Date.now()}-${name.length}` },
      });
      expect(response.status()).toBe(400);
    }
  });

  test('inicio de sesión incorrecto muestra error y el correcto entra al panel', async ({ page }) => {
    const account = newAccount('lg');
    await registerByApi(page, account);
    await createFighterByApi(page, 'LoginFiera');
    await logoutByApi(page);

    await page.goto('/login');
    await page.getByLabel('Usuario o correo electrónico').fill(account.username);
    await page.getByLabel('Contraseña').fill('contraseña-equivocada');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('alert')).toContainText('no son válidos');

    await page.getByLabel('Contraseña').fill(account.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1, name: 'LoginFiera' })).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/($|login)/);
  });

  test('las rutas protegidas redirigen a /login sin sesión', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Varios luchadores y alumnos', () => {
  test('una cuenta con varios luchadores puede abrir /students (regresión v1 → v2)', async ({ page }) => {
    await registerByApi(page, newAccount('mf'));
    await createFighterByApi(page, 'PrimeraFiera');
    await createFighterByApi(page, 'SegundaFiera');

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Seleccionar luchador' }).first().click();
    await expect(page.getByText('Luchador activo').first()).toBeVisible();

    await page.getByRole('link', { name: 'Ver alumnos' }).click();
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByRole('heading', { name: 'Tus alumnos' })).toBeVisible();
    await expect(page.getByLabel('Enlace de invitación')).toHaveValue(
      /\/register\?referralCode=[a-f0-9]{32}$/
    );
  });

  test('el enlace de invitación vincula al alumno y aparece en /students', async ({ page, browser }) => {
    await registerByApi(page, newAccount('ms'));
    await createFighterByApi(page, 'MaestroFiera');
    const code = await myReferralCode(page);

    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    const student = newAccount('st');
    await studentPage.goto(`/register?referralCode=${code}`);
    await expect(studentPage.getByLabel('Código de invitación (opcional)')).toHaveValue(code);
    await studentPage.getByLabel('Nombre de usuario').fill(student.username);
    await studentPage.getByLabel('Correo electrónico').fill(student.email);
    await studentPage.getByLabel('Contraseña').fill(student.password);
    await studentPage.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(studentPage).toHaveURL(/\/create-fighter$/);
    await studentContext.close();

    await page.goto('/students');
    await expect(page.getByText(student.username)).toBeVisible();
  });

  test('un código de invitación inexistente se rechaza con un mensaje claro', async ({ page }) => {
    const account = newAccount('bc');
    await page.goto(`/register?referralCode=${'0'.repeat(32)}`);
    await page.getByLabel('Nombre de usuario').fill(account.username);
    await page.getByLabel('Correo electrónico').fill(account.email);
    await page.getByLabel('Contraseña').fill(account.password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('alert')).toContainText('invitación no es válido');
  });
});

test.describe('Arena y clasificación', () => {
  test('desafiar a un rival, ver el resultado y el historial', async ({ page, browser }) => {
    const rivalContext = await browser.newContext();
    const rivalPage = await rivalContext.newPage();
    await rivalPage.goto('/');
    await registerByApi(rivalPage, newAccount('rv'));
    await createFighterByApi(rivalPage, 'RivalValiente');
    await rivalContext.close();

    await registerByApi(page, newAccount('hr'));
    await createFighterByApi(page, 'HeroeArena');

    await page.goto('/arena');
    await expect(page.getByRole('heading', { name: 'La Arena' })).toBeVisible();
    await page.getByLabel('Nombre del rival').fill('RivalValiente');
    await page.getByRole('button', { name: 'Buscar rivales' }).click();
    await page.getByRole('button', { name: 'Elegir rival' }).first().click();
    await page.getByRole('button', { name: /Desafiar a RivalValiente/ }).click();

    await expect(page).toHaveURL(/\/battles\/[a-f0-9]{24}$/);
    await expect(page.getByRole('heading', { name: 'Secuencia del combate' })).toBeVisible();

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'Historial de combates' })).toBeVisible();
    await expect(page.getByRole('link', { name: /RivalValiente/ }).first()).toBeVisible();
  });

  test('la clasificación muestra una sola fila por cuenta aunque tenga varios luchadores', async ({ page }) => {
    const account = newAccount('lb');
    await registerByApi(page, account);
    await createFighterByApi(page, 'LbUno');
    await createFighterByApi(page, 'LbDos');
    await createFighterByApi(page, 'LbTres');

    await page.goto('/leaderboards');
    await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
    await expect(page.getByText(`@${account.username}`)).toHaveCount(1);
  });

  test('la clasificación es pública y conserva las mayúsculas del nombre', async ({ page, browser }) => {
    await registerByApi(page, newAccount('pb'));
    await createFighterByApi(page, 'LeónDorado');
    const anonymous = await browser.newContext();
    const anonPage = await anonymous.newPage();
    await anonPage.goto('/leaderboards');
    await expect(anonPage.getByText('LeónDorado')).toBeVisible();
    await anonymous.close();
  });
});

test.describe('Navegación tras autenticarse', () => {
  test('al iniciar sesión se vuelve a la página protegida que se intentó abrir', async ({ page }) => {
    const account = newAccount('dl');
    await registerByApi(page, account);
    await createFighterByApi(page, 'DeepLinkFiera');
    await logoutByApi(page);

    await page.goto('/history');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Usuario o correo electrónico').fill(account.username);
    await page.getByLabel('Contraseña').fill(account.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/history$/);
  });
});

test.describe('Humo: todas las pantallas cargan sin errores de consola', () => {
  test('recorre las rutas públicas y privadas', async ({ page, browser }) => {
    const problems = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    });

    const rivalContext = await browser.newContext();
    const rivalPage = await rivalContext.newPage();
    const rivalAccount = newAccount('sr');
    await registerByApi(rivalPage, rivalAccount);
    await createFighterByApi(rivalPage, 'HumoRival');
    await rivalContext.close();

    const account = newAccount('sm');
    await registerByApi(page, account);
    await createFighterByApi(page, 'HumoHeroe');

    // Se juega un combate por API para que historial y resultado tengan contenido.
    const me = await (await page.request.get('/api/v2/fighters/active')).json();
    const opponents = await (await page.request.get('/api/v2/arena/opponents?q=HumoRival')).json();
    const challenge = await page.request.post('/api/v2/arena/challenges', {
      data: {
        fighterId: me.fighter.id,
        opponentFighterId: opponents.fighters[0].id,
        requestId: `smoke-${Date.now()}`,
      },
    });
    expect(challenge.status()).toBe(201);
    const battleId = (await challenge.json()).battle.id;

    const routes = [
      ['/', /./],
      ['/leaderboards', 'Clasificación'],
      [`/profile/${rivalAccount.username}`, 'HumoRival'],
      ['/dashboard', 'HumoHeroe'],
      ['/arena', 'La Arena'],
      ['/history', 'Historial de combates'],
      ['/collection', /colecci/i],
      ['/students', 'Tus alumnos'],
      [`/battles/${battleId}`, 'Secuencia del combate'],
      ['/create-fighter', 'Crea tu luchador'],
    ];
    for (const [path, expected] of routes) {
      await page.goto(path);
      if (expected instanceof RegExp) {
        await expect(page.getByText(expected).first()).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: expected }).first()).toBeVisible();
      }
    }

    // Categorías de la clasificación.
    await page.goto('/leaderboards');
    for (const category of ['level', 'students', 'elo']) {
      await page.getByRole('combobox').selectOption(category);
      await expect(page.getByRole('table')).toBeVisible();
    }

    expect(problems).toEqual([]);
  });
});
