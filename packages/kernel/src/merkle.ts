import { concat, encodeAbiParameters, keccak256, toBytes } from 'viem';
import { NORM_VERSION, type Hex, type WorkId } from './types';

export function spanHash(spans: string[]): Hex {
  return keccak256(toBytes(`${NORM_VERSION}\n${spans.join('\n')}`));
}

export function leafHash(workId: WorkId, version: number, span: Hex, amount: bigint): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'uint32' }, { type: 'bytes32' }, { type: 'uint64' }],
      [workId, version, span, amount],
    ),
  );
}

function hashPair(a: Hex, b: Hex): Hex {
  return a.toLowerCase() < b.toLowerCase() ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

/** Sorted-pair keccak Merkle root. An odd node is promoted unchanged. Mirrors HonorarLedger. */
export function merkleRoot(hashes: Hex[]): Hex {
  if (hashes.length === 0) throw new Error('merkleRoot: no leaves');
  let level = [...hashes];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as Hex;
      const b = level[i + 1];
      next.push(b === undefined ? a : hashPair(a, b));
    }
    level = next;
  }
  return level[0] as Hex;
}

export function merkleProof(hashes: Hex[], index: number): Hex[] {
  const proof: Hex[] = [];
  let level = [...hashes];
  let idx = index;
  while (level.length > 1) {
    const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
    const s = level[sibling];
    if (s !== undefined) proof.push(s);
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as Hex;
      const b = level[i + 1];
      next.push(b === undefined ? a : hashPair(a, b));
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: Hex[], root: Hex): boolean {
  let h = leaf;
  for (const p of proof) h = hashPair(h, p);
  return h.toLowerCase() === root.toLowerCase();
}

/** keccak256 of the sorted Gateway transfer ids joined by newline. */
export function transfersHash(ids: string[]): Hex {
  return keccak256(toBytes([...ids].sort().join('\n')));
}
