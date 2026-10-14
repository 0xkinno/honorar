import { parseEventLogs } from 'viem';
import { honorarLedgerAbi, readRoot, readWork, type ArcClient } from '@honorar/chain';
import type { Hex, WorkId } from '@honorar/kernel';
import type { ChainReader, StrikeLog } from './checks';

export function rpcReader(client: ArcClient, registry: Hex, ledger: Hex): ChainReader {
  return {
    readWork: (workId: WorkId, block: bigint) => readWork(client, registry, workId, block),
    readRoot: (answerId: Hex, block: bigint) => readRoot(client, ledger, answerId, block),
    async strikeLogs(txHash: Hex): Promise<StrikeLog[]> {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      const logs = parseEventLogs({ abi: honorarLedgerAbi, logs: receipt.logs, eventName: ['QuoteStruck', 'AnswerStruck'] });
      return logs
        .filter((l) => l.address.toLowerCase() === ledger.toLowerCase())
        .map((l) => ({ kind: l.eventName as StrikeLog['kind'], args: l.args as unknown as Record<string, unknown> }));
    },
  };
}
