import type { RegistrySnapshot, Usdc6, WorkId } from './types';

export const FEE_BPS = 250n;

/** The only function that creates a Usdc6. Prices come from the on-chain registry snapshot. */
export function price(snapshot: RegistrySnapshot, workId: WorkId): Usdc6 {
  const w = snapshot.get(workId);
  if (!w) throw new Error(`price: unknown work ${workId}`);
  return w.quotePrice as Usdc6;
}

export function protocolFee(total: bigint): bigint {
  return (total * FEE_BPS) / 10_000n;
}

export function splitShares(amount: bigint, bps: number[]): bigint[] {
  let paid = 0n;
  return bps.map((b, i) => {
    const share = i === bps.length - 1 ? amount - paid : (amount * BigInt(b)) / 10_000n;
    paid += share;
    return share;
  });
}
