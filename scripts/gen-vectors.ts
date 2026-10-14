import { mkdirSync, writeFileSync } from 'node:fs';
import { keccak256, toBytes } from 'viem';
import { leafHash, merkleRoot, type Hex, type WorkId } from '../packages/kernel/src/index';

let state = 0x9e3779b9;
const rnd = (): number => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
};

const cases = [];
for (let c = 0; c < 2000; c++) {
  const n = 1 + Math.floor(rnd() * 12);
  const ids = new Set<string>();
  while (ids.size < n) ids.add(keccak256(toBytes(`w${c}-${Math.floor(rnd() * 1e9)}`)));
  const workIds = [...ids].sort() as WorkId[];
  const versions = workIds.map(() => 1 + Math.floor(rnd() * 5));
  const spanHashes = workIds.map((_, i) => keccak256(toBytes(`s${c}-${i}-${Math.floor(rnd() * 1e9)}`)));
  const amounts = workIds.map(() => 1 + Math.floor(rnd() * 50_000));
  const hashes = workIds.map((w, i) => leafHash(w, versions[i] as number, spanHashes[i] as Hex, BigInt(amounts[i] as number)));
  cases.push({ workIds, versions, spanHashes, amounts, root: merkleRoot(hashes) });
}
mkdirSync('contracts/test/vectors', { recursive: true });
for (let f = 0; f < 20; f++) {
  writeFileSync(`contracts/test/vectors/${f}.json`, JSON.stringify({ cases: cases.slice(f * 100, f * 100 + 100) }));
}
process.stdout.write(`wrote ${cases.length} vectors\n`);
