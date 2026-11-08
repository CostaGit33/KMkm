import { test, expect } from '@playwright/test';

const viewports = [
  { width: 320, height: 640 }, { width: 360, height: 740 },
  { width: 375, height: 812 }, { width: 390, height: 844 },
  { width: 414, height: 896 }, { width: 430, height: 932 },
  { width: 600, height: 900 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1280, height: 800 },
  { width: 640, height: 360 }, { width: 844, height: 390 },
];

async function checkLayout(page, width, height, view) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(180);
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const controls = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="tab"]')]
      .filter((el) => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 &&
          r.width > 0 && r.height > 0 && el.getClientRects().length;
      });
    const overlaps = [];
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i], b = controls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
      const w = Math.min(x.right, y.right) - Math.max(x.left, y.left);
      const h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      if (w > 3 && h > 3) overlaps.push({
        a: a.innerText?.trim().slice(0, 45) || a.getAttribute('aria-label') || a.tagName,
        b: b.innerText?.trim().slice(0, 45) || b.getAttribute('aria-label') || b.tagName,
        area: Math.round(w * h),
      });
    }
    return {
      viewport: root.clientWidth,
      document: Math.max(root.scrollWidth, body.scrollWidth),
      controls: controls.length,
      overlaps: overlaps.slice(0, 12),
    };
  });
  expect(result.document, `overflow horizontal em ${view} em ${width}x${height}`).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.overlaps, `controles sobrepostos em ${view} em ${width}x${height}: ${JSON.stringify(result.overlaps)}`).toEqual([]);
}

async function prepareSignedInApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('mais1km-eunapolis:v4', JSON.stringify({
      version: 4,
      user: { name: 'Pessoa de Teste' },
      cityId: 'eunapolis',
      theme: 'dark',
      themeChosen: false,
      conquered: [],
      discovered: [],
      history: [],
      account: { nome: 'Pessoa de Teste', email: 'teste@example.com', criadoEm: '2026-01-01T12:00:00.000Z' },
      session: true,
      updatedAt: '2026-01-01T12:00:00.000Z',
    }));
  });
  await page.route('**/api/conta/sessao', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ usuario: { id: 1, nome: 'Pessoa de Teste', email: 'teste@example.com', admin: false } }),
  }));
  await page.route('**/api/caderneta', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ eventos: [], colecao: { itens: [] } }),
  }));
  await page.route('**/api/config-mapa', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({}),
  }));
  await page.route('**/api/map-tiles/**', (route) => route.abort());
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#bottom-nav')).toBeVisible();
  await expect(page.locator('#app')).not.toContainText('Criar conta');
}

test.describe('Telas autenticadas do aplicativo +1 KM', () => {
  for (const vp of viewports) {
    test(`navegação e layout das telas internas em ${vp.width}x${vp.height}`, async ({ page }) => {
      await prepareSignedInApp(page);
      await checkLayout(page, vp.width, vp.height, 'Início');

      for (const [view, title] of [
        ['map', 'Mapa'], ['routes', 'Rotas'], ['collection', 'Carimbos'],
      ]) {
        await page.locator(`#bottom-nav [data-action="switch-view"][data-view="${view}"]:visible, #side-rail [data-action="switch-view"][data-view="${view}"]:visible`).first().click();
        await page.waitForTimeout(180);
        if (view === 'map') await expect(page.locator('#real-map')).toBeVisible();
        else await expect(page.locator('#app')).toContainText(title);
        await checkLayout(page, vp.width, vp.height, title);
      }

      await page.locator('.nav-more:visible').first().click();
      await expect(page.locator('#app-side-menu')).toBeVisible();
      await page.locator('#app-side-menu [data-action="switch-view"][data-view="profile"]').click();
      await expect(page.locator('#app')).toContainText('Meu perfil');
      await checkLayout(page, vp.width, vp.height, 'Perfil');
    });
  }
});
