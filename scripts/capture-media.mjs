import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'https://honorar.vercel.app';
const b = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const shoot = async (name, fn, vp = { width: 1440, height: 900 }) => {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1.5 });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  if (fn) await fn(p);
  await p.screenshot({ path: `docs/media/${name}.png` });
  await p.close();
};
const atBeat = (frac) => async (p) => {
  await p.evaluate((f) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const el = document.querySelector('#follow section');
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (el.offsetHeight - innerHeight) * f, behavior: 'instant' });
  }, frac);
  await p.waitForTimeout(1200);
};
await shoot('hero', null);
await shoot('story', atBeat((3 + 0.5) / 7));
await shoot('story-netting', atBeat((5 + 0.5) / 7));
await shoot('how-it-pays', async (p) => {
  await p.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo({ top: document.querySelector('#how').getBoundingClientRect().top + scrollY - 40, behavior: 'instant' });
  });
  await p.waitForTimeout(900);
});
await b.close();
