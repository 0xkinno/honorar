import type { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Hex } from '@honorar/kernel';
import type { Store } from '../store';
import { log } from '../log';
import type { BatchReconciliationRow, TransferRecord, TransferState } from './records';

const TERMINAL: TransferState[] = ['completed', 'failed'];
const HASH = /^0x[0-9a-fA-F]{64}$/;

/** Finds the settlement tx hash in the untyped part of a transfer response. */
export function extractSettlement(raw: Record<string, unknown>): { hash: Hex; field: string } | null {
  const known = ['transactionHash', 'txHash', 'settlementTxHash', 'settlementTransactionHash', 'transaction', 'hash', 'batchTxHash'];
  const walk = (obj: Record<string, unknown>, prefix: string): { hash: Hex; field: string } | null => {
    for (const k of known) {
      const v = obj[k];
      if (typeof v === 'string' && HASH.test(v)) return { hash: v as Hex, field: `${prefix}${k}` };
    }
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && HASH.test(v) && /tx|hash|transaction/i.test(k)) return { hash: v as Hex, field: `${prefix}${k}` };
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const r = walk(v as Record<string, unknown>, `${prefix}${k}.`);
        if (r) return r;
      }
    }
    return null;
  };
  return walk(raw, '');
}

export type CreditReader = (writer: Hex, txHash: Hex) => Promise<{ credit: bigint; block: number } | null>;

export class Reconciler {
  constructor(
    private readonly deps: {
      gateway: Pick<GatewayClient, 'getTransferById' | 'searchTransfers'>;
      store: Store;
      credit: CreditReader;
      agent: Hex;
    },
  ) {}

  async pollOne(rec: TransferRecord, force = false): Promise<TransferRecord> {
    if (!force && TERMINAL.includes(rec.state)) return rec;
    const t = await this.deps.gateway.getTransferById(rec.id);
    const now = new Date().toISOString();
    const state = t.status as TransferState;
    const next: TransferRecord = { ...rec, raw: t, state, transitions: { ...rec.transitions } };
    if (!next.transitions[state]) next.transitions[state] = now;
    const s = extractSettlement(t as Record<string, unknown>);
    if (s) {
      next.settlementTx = s.hash;
      next.settlementField = s.field;
    }
    await this.deps.store.put('transfers', next.id, next);
    return next;
  }

  async tick(): Promise<{ polled: number; reconciled: number }> {
    const all = await this.deps.store.list<TransferRecord>('transfers');
    let polled = 0;
    for (const rec of all) {
      if (TERMINAL.includes(rec.state) && rec.settlementTx) continue;
      try {
        await this.pollOne(rec, true);
        polled++;
      } catch (e) {
        log.warn('poll failed', { id: rec.id, error: (e as Error).message });
      }
    }
    const reconciled = await this.reconcileBatches();
    return { polled, reconciled };
  }

  /** I9: honorar transfers to a writer in one batch tx must not exceed the writer's observed credit. */
  async reconcileBatches(): Promise<number> {
    const all = await this.deps.store.list<TransferRecord>('transfers');
    const groups = new Map<string, TransferRecord[]>();
    for (const r of all) {
      if (r.state !== 'completed' || !r.settlementTx) continue;
      const key = `${r.settlementTx}|${r.payTo.toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    let done = 0;
    for (const [key, recs] of groups) {
      if (await this.deps.store.get('batch_reconciliations', key)) continue;
      const first = recs[0] as TransferRecord;
      const sum = recs.reduce((a, r) => a + BigInt(r.amount), 0n);
      const observed = await this.deps.credit(first.payTo, first.settlementTx as Hex).catch(() => null);
      let verdict: BatchReconciliationRow['verdict'] = 'UNKNOWN';
      let note = 'observed credit unavailable';
      if (observed) {
        if (observed.credit === sum) {
          verdict = 'MATCH';
          note = 'writer credit equals honorar transfers in this batch';
        } else if (observed.credit > sum) {
          verdict = 'WRITER_HAS_OTHER_INCOME';
          note = 'writer credit exceeds honorar transfers (other payers in the batch)';
        } else {
          verdict = 'MISMATCH';
          note = 'writer credit is below the sum of honorar transfers';
        }
      }
      const row: BatchReconciliationRow = {
        txHash: first.settlementTx as Hex,
        block: observed?.block ?? null,
        writer: first.payTo,
        honorarSum: sum.toString(),
        observedCredit: observed ? observed.credit.toString() : null,
        verdict,
        checkedAt: new Date().toISOString(),
        note,
      };
      await this.deps.store.put('batch_reconciliations', key, row);
      done++;
    }
    return done;
  }

  /** I11: a signed payment with an ambiguous result is resolved here, never retried. */
  async resolveUnconfirmed(payTo: Hex, startDate: string): Promise<{ id: string; status: string; amount: string }[]> {
    const res = await this.deps.gateway.searchTransfers({ from: this.deps.agent, to: payTo, startDate });
    return res.transfers.map((t) => ({ id: t.id, status: t.status, amount: t.amount }));
  }
}

export const CLOCK_ORDER: TransferState[] = ['received', 'batched', 'confirmed', 'completed'];

export function clockLabel(state: TransferState): string {
  switch (state) {
    case 'received':
      return 'Authorized';
    case 'batched':
      return 'Batched';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Settled on Arc';
    case 'failed':
      return 'Failed';
    case 'unconfirmed':
      return 'Unconfirmed';
  }
}
