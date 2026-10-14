import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-15-pro', width: 393, height: 852 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'galaxy-s20', width: 360, height: 800 },
  { name: 'ipad-mini', width: 768, height: 1024 },
  { name: 'ipad-pro', width: 1024, height: 1366 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];
const ROUTES = ['/', '/app/ask', '/app/library', '/app/earnings', '/app/ledger', '/verify', '/proof', '/app/agent'];

const root = join(process.cwd(), '..', '..');
const qaDir = join(root, 'docs', 'qa');
const results: Record<string, unknown>[] = [];

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const route of ROUTES) {
      test(`${route}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        page.on('pageerror', (e) => errors.push(e.message));
        const failed: string[] = [];
        page.on('requestfailed', (r) => {
          if (r.url().startsWith(process.env.PW_BASE_URL ?? 'http://localhost:3100') && r.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(`${r.url()} ${r.failure()?.errorText}`);
        });

        await page.goto(route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
        const h1s = await page.locator('h1').count();

        const overlaps = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a[href], button, input, textarea, select')).filter((e) => {
            const r = (e as HTMLElement).getBoundingClientRect();
            const s = getComputedStyle(e as HTMLElement);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
          }) as HTMLElement[];
          const bad: string[] = [];
          for (let i = 0; i < els.length; i++) {
            for (let j = i + 1; j < els.length; j++) {
              const a = els[i]!;
              const b = els[j]!;
              if (a.contains(b) || b.contains(a)) continue;
              const ra = a.getBoundingClientRect();
              const rb = b.getBoundingClientRect();
              const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
              const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
              if (w > 2 && h > 2) bad.push(`${a.tagName}:${a.textContent?.slice(0, 20)} x ${b.tagName}:${b.textContent?.slice(0, 20)}`);
            }
          }
          return bad.slice(0, 5);
        });

        let heroClear = true;
        if (route === '/') {
          heroClear = await page.evaluate(() => {
            const h = document.querySelector('h1')?.getBoundingClientRect();
            const chips = Array.from(document.querySelectorAll('.scene-chip')).map((c) => c.getBoundingClientRect());
            if (!h || chips.length === 0) return false;
            return chips.every((o) => !(Math.min(h.right, o.right) - Math.max(h.left, o.left) > 4 && Math.min(h.bottom, o.bottom) - Math.max(h.top, o.top) > 4));
          });
        }

        let stickyOk = true;
        if (route === '/') {
          for (let step = 1; step <= 10; step++) {
            const ok = await page.evaluate(async (s) => {
              const el = document.querySelector('#follow section') as HTMLElement | null;
              if (!el) return true;
              const total = el.offsetHeight - window.innerHeight;
              const top = el.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: top + (total * s) / 10, behavior: 'instant' });
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
              const stage = el.querySelector('.sticky-stage')?.firstElementChild as HTMLElement | null;
              if (!stage) return true;
              const r = stage.getBoundingClientRect();
              return r.top >= -2 && r.bottom <= window.innerHeight + 2;
            }, step);
            if (!ok) stickyOk = false;
            await page.waitForTimeout(80);
          }
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        }

        mkdirSync(qaDir, { recursive: true });
        await page.screenshot({ path: join(qaDir, `${vp.name}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`) });

        results.push({ viewport: vp.name, route, noHScroll, h1s, overlaps: overlaps.length, heroClear, stickyOk, consoleErrors: errors.length, failedRequests: failed.length });

        expect(noHScroll, 'horizontal scroll').toBe(true);
        expect(h1s, 'exactly one h1').toBe(1);
        expect(overlaps, `overlaps ${overlaps.join(' | ')}`).toEqual([]);
        expect(heroClear, 'hero headline and object separate').toBe(true);
        expect(stickyOk, 'sticky stage stays in viewport').toBe(true);
        expect(failed).toEqual([]);
        expect(errors.filter((e) => !/Failed to load resource|agent|fetch|CORS|ERR_CONNECTION_REFUSED|WalletConnect|Reown|Analytics SDK/i.test(e))).toEqual([]);
      });
    }
  });
}

test.afterAll(() => {
  const out = join(root, 'evidence', 'qa.json');
  const prev = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')) as { results: Record<string, unknown>[] }).results : [];
  const merged = [...prev.filter((p) => !results.some((r) => r.viewport === p.viewport && r.route === p.route)), ...results];
  mkdirSync(join(root, 'evidence'), { recursive: true });
  writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), results: merged }, null, 2));
});
