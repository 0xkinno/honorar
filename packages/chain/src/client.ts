import { createPublicClient, http, type PublicClient } from 'viem';
import { arc } from 'viem/chains';
import type { Hex, RegistrySnapshot, RegistryWork, WorkId } from '@honorar/kernel';
import { honorarLedgerAbi, honorarRegistryAbi } from './abis';
import { ARC_RPC } from './addresses';


export type ArcClient = PublicClient;

export function createArcClient(rpc: string = ARC_RPC): ArcClient {
  return createPublicClient({ chain: arc, transport: http(rpc) });
}

export async function readWork(
  client: ArcClient,
  registry: Hex,
  workId: WorkId,
  blockNumber?: bigint,
): Promise<RegistryWork | null> {
  const exists = await client.readContract({
    address: registry,
    abi: honorarRegistryAbi,
    functionName: 'exists',
    args: [workId],
    blockNumber,
  });
  if (!exists) return null;
  const w = await client.readContract({
    address: registry,
    abi: honorarRegistryAbi,
    functionName: 'getWork',
    args: [workId],
    blockNumber,
  });
  return {
    workId,
    contentHash: w.contentHash,
    version: w.version,
    active: w.active,
    quotePrice: w.quotePrice,
    readPrice: w.readPrice,
    recipients: [...w.recipients] as Hex[],
    bps: [...w.bps],
  };
}

export async function snapshot(
  client: ArcClient,
  registry: Hex,
  ids: WorkId[],
  blockNumber?: bigint,
): Promise<RegistrySnapshot> {
  const entries = await Promise.all(ids.map(async (id) => [id, await readWork(client, registry, id, blockNumber)] as const));
  const map = new Map<WorkId, RegistryWork>();
  for (const [id, w] of entries) if (w) map.set(id, w);
  return map;
}

export async function readRoot(client: ArcClient, ledger: Hex, answerId: Hex, blockNumber?: bigint): Promise<Hex> {
  return client.readContract({
    address: ledger,
    abi: honorarLedgerAbi,
    functionName: 'roots',
    args: [answerId],
    blockNumber,
  });
}
