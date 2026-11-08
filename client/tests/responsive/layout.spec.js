import { test, expect } from '@playwright/test';

const viewports = [
  { width: 320, height: 640 }, { width: 360, height: 740 },
  { width: 375, height: 812 }, { width: 390, height: 844 },
  { width: 414, height: 896 }, { width: 430, height: 932 },
  { width: 600, height: 900 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1280, height: 800 },
  { width: 640, height: 360 }, { width: 844, height: 390 },
];

async function checkLayout(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(120);
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
        a: a.innerText?.trim().slice(0, 60) || a.getAttribute('aria-label') || a.tagName,
        b: b.innerText?.trim().slice(0, 60) || b.getAttribute('aria-label') || b.tagName,
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
  expect(result.document, `overflow horizontal em ${width}x${height}`).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.overlaps, `controles sobrepostos em ${width}x${height}: ${JSON.stringify(result.overlaps)}`).toEqual([]);
}

test.describe('Responsividade do aplicativo +1 KM', () => {
  for (const vp of viewports) {
    test(`shell do PWA sem overflow/sobreposição em ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.route('**/api/**', async (route) => route.fulfill({
        status: 401, contentType: 'application/json', body: JSON.stringify({ erro: 'nao_autenticado' }),
      }));
      await page.goto('/');
      await checkLayout(page, vp.width, vp.height);
    });
  }
});

test.describe('Login administrativo responsivo', () => {
  for (const vp of viewports) {
    test(`login admin sem overflow/sobreposição em ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.route('**/api/admin/eu', async (route) => route.fulfill({
        status: 401, contentType: 'application/json', body: JSON.stringify({ erro: 'nao_autenticado' }),
      }));
      await page.goto('/admin.html');
      await expect(page.locator('#form-login')).toBeVisible();
      await checkLayout(page, vp.width, vp.height);
    });
  }
});
