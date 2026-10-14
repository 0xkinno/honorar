import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { Hex } from './types';

const cls = (codes: number[]): RegExp => new RegExp('[' + String.fromCharCode(...codes) + ']', 'g');
const ZERO_WIDTH = cls([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad]);
const CURLY_DOUBLE = cls([0x201c, 0x201d, 0x201e, 0x201f, 0x00ab, 0x00bb, 0x2033]);
const CURLY_SINGLE = cls([0x2018, 0x2019, 0x201a, 0x201b, 0x2032]);
const DASHES = cls([0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212]);

/** Quote marks to straight, nothing else. Used to find quoted segments in raw answers. */
export function straightenQuotes(text: string): string {
  return text.replace(CURLY_DOUBLE, '"').replace(CURLY_SINGLE, "'");
}

/**
 * NORM_V1: NFKC, lowercase, curly quotes to straight, strip zero-width characters,
 * unify dashes, collapse whitespace. No stemming, no synonyms.
 */
export function normalize(text: string): string {
  let t = text.replace(ZERO_WIDTH, '');
  t = t.normalize('NFKC').toLowerCase().normalize('NFKC');
  t = t.replace(ZERO_WIDTH, '');
  t = straightenQuotes(t).replace(DASHES, '-');
  return t.replace(/\s+/g, ' ').trim();
}

export function wordCount(normalized: string): number {
  return normalized === '' ? 0 : normalized.split(' ').length;
}

export function sha256Hex(text: string): Hex {
  return `0x${bytesToHex(sha256(utf8ToBytes(text)))}` as Hex;
}

/** contentHash = sha256(normalize(text)) */
export function contentHash(text: string): Hex {
  return sha256Hex(normalize(text));
}
