import { mkdirSync, writeFileSync } from 'node:fs';
import { htmlToText } from '../services/agent/src/corpus/ingest';

const res = await fetch('https://medium.com/feed/@ojilerekingsley', { headers: { 'user-agent': 'Mozilla/5.0' } });
const xml = await res.text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1] as string);
mkdirSync('corpus/medium', { recursive: true });
const want = [/Touchplate uses Qwen/i, /MNEMON/i, /Real Value, Hidden/i];
const out: { slug: string; title: string; url: string; words: number }[] = [];
for (const [i, re] of want.entries()) {
  const it = items.find((x) => re.test(x));
  if (!it) continue;
  const title = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(it)?.[1] ?? '';
  const link = (/<link>([\s\S]*?)<\/link>/.exec(it)?.[1] ?? '').split('?')[0] as string;
  const html = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/.exec(it)?.[1] ?? '';
  const { text } = htmlToText(`<article>${html}</article>`);
  const slug = ['touchplate', 'mnemon', 'mantissa'][i] as string;
  writeFileSync(`corpus/medium/${slug}.txt`, `${title}\n\n${text}\n`);
  out.push({ slug, title, url: link, words: text.split(/\s+/).length });
}
writeFileSync('corpus/medium/index.json', `${JSON.stringify(out, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(out)}\n`);
