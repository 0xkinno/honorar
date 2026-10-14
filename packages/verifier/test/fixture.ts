import { canonicalJson, contentHash, runKernel, type Bundle, type Hex, type RegistryWork, type WorkId } from '@honorar/kernel';
import type { ChainReader, StrikeLog } from '../src/checks';

export const WRITER = ('0x' + '11'.repeat(20)) as Hex;
export const LEDGER = ('0x' + '22'.repeat(20)) as Hex;
export const REGISTRY = ('0x' + '33'.repeat(20)) as Hex;
export const TX = ('0x' + '44'.repeat(32)) as Hex;
export const BLOCK = 1234;
export const ANSWER = ('0x' + '55'.repeat(32)) as Hex;

export const TEXT_A =
  'Stablecoins settle value on a ledger that never closes, which means a payment made on Sunday night clears as fast as one made on Monday morning. A second sentence follows here.';
export const QUOTE_A =
  'Stablecoins settle value on a ledger that never closes, which means a payment made on Sunday night clears as fast as one made on Monday morning.';
export const TEXT_B = 'A citation is a claim about where words came from, and a claim is not the same thing as proof that the words were ever used by anyone.';
export const ID_A = ('0x' + 'aa'.repeat(32)) as WorkId;
export const ID_B = ('0x' + 'bb'.repeat(32)) as WorkId;

export function works(): Map<WorkId, RegistryWork> {
  const mk = (id: WorkId, text: string): RegistryWork => ({
    workId: id,
    contentHash: contentHash(text),
    version: 1,
    active: true,
    quotePrice: 4000n,
    readPrice: 1000n,
    recipients: [WRITER],
    bps: [10000],
  });
  return new Map([
    [ID_A, mk(ID_A, TEXT_A)],
    [ID_B, mk(ID_B, TEXT_B)],
  ]);
}

export function cleanBundle(): Bundle {
  const r = runKernel({
    answerId: ANSWER,
    question: 'what settles?',
    proposal: { answer: `Writers say: "${QUOTE_A}"`, citations: [{ workId: ID_A, quote: QUOTE_A }] },
    registry: works(),
    sources: [
      { workId: ID_A, text: TEXT_A },
      { workId: ID_B, text: TEXT_B },
    ],
    unregistered: [],
    transferIds: ['t1', 't2'],
    frontedReadingFees: 2000n,
  });
  return { ...r.bundle, strike: { chainId: 5042, txHash: TX, blockNumber: BLOCK, ledger: LEDGER, registry: REGISTRY } };
}

export function chainFor(b: Bundle, reg = works()): ChainReader {
  return {
    async readWork(id) {
      return reg.get(id) ?? null;
    },
    async readRoot() {
      return b.root;
    },
    async strikeLogs(): Promise<StrikeLog[]> {
      const total = b.leaves.reduce((a, l) => a + BigInt(l.amount), 0n);
      const logs: StrikeLog[] = b.leaves.map((l) => ({
        kind: 'QuoteStruck',
        args: { answerId: b.answerId, workId: l.workId, spanHash: l.spanHash, amount: BigInt(l.amount) },
      }));
      logs.push({
        kind: 'AnswerStruck',
        args: {
          answerId: b.answerId,
          root: b.root,
          total,
          fee: (total * 250n) / 10_000n,
          frontedReadingFees: BigInt(b.frontedReadingFees),
          gatewayTransfersHash: b.gatewayTransfersHash,
        },
      });
      return logs;
    },
  };
}

export const text = (b: Bundle): string => canonicalJson(b);
