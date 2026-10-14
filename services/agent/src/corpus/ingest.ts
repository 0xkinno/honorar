import { contentHash, sha256Hex } from '@honorar/kernel';
import type { CorpusDoc } from './types';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', mdash: '-', ndash: '-', hellip: '...' };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim());
  const article = /<article[\s\S]*?<\/article>/i.exec(html)?.[0] ?? /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
  const text = decode(
    article
      .replace(/<(script|style|nav|header|footer|aside|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n');
  return { title, text };
}

export function docFromText(url: string, title: string, text: string): CorpusDoc {
  return {
    id: `url:${sha256Hex(url).slice(2, 18)}`,
    workId: null,
    url,
    title,
    text,
    contentHash: contentHash(text),
    ingestedAt: new Date().toISOString(),
  };
}

export async function fetchDoc(url: string): Promise<CorpusDoc> {
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('unsupported protocol');
  const res = await fetch(url, { headers: { 'user-agent': 'honorar-ingest/1.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch ${url} failed with ${res.status}`);
  const body = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  const parsed = ct.includes('html') ? htmlToText(body) : { title: u.hostname, text: body.trim() };
  if (parsed.text.length < 200) throw new Error('page text too short to register');
  return docFromText(url, parsed.title || u.hostname, parsed.text);
}
