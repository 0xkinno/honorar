import { AsyncLocalStorage } from 'node:async_hooks';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Hex, WorkId } from '@honorar/kernel';
import { log } from '../log';

export type ReadData = {
  workId: WorkId;
  title: string;
  url: string;
  version: number;
  contentHash: Hex;
  text: string;
};

export type ReadOutcome =
  | { ok: true; transferId: string; amount: bigint; data: ReadData }
  | { ok: false; reason: string; signed: boolean };

export type ReadSession = {
  read: (url: string, workId: WorkId, payTo: Hex, price: bigint) => Promise<ReadOutcome>;
  remaining: () => bigint;
};

type State = {
  remaining: bigint;
  /** url -> payee and price pinned from the registry, never from the seller's response */
  pinned: Map<string, { payTo: string; amount: bigint }>;
  currentUrl: string | null;
  signed: boolean;
};

/**
 * Buyer discipline: price cap and payee pinning before signing, a single attempt only.
 * A signed payment is never retried (I11); ambiguity is resolved with searchTransfers.
 */
export class Buyer {
  private readonly als = new AsyncLocalStorage<State>();
  readonly client: GatewayClient;

  constructor(privateKey: Hex, rpcUrl: string) {
    this.client = new GatewayClient({ chain: 'arc', privateKey, rpcUrl });
    this.client.onBeforePaymentCreation(async (ctx) => {
      const s = this.als.getStore();
      if (!s) return { abort: true, reason: 'no active read session' };
      const pin = s.currentUrl ? s.pinned.get(s.currentUrl) : undefined;
      if (!pin) return { abort: true, reason: 'resource not pinned' };
      const req = ctx.selectedRequirements;
      const amount = BigInt(req.amount);
      if (req.payTo.toLowerCase() !== pin.payTo.toLowerCase()) return { abort: true, reason: 'payee differs from registry' };
      if (amount !== pin.amount) return { abort: true, reason: 'amount differs from registry price' };
      if (amount > s.remaining) return { abort: true, reason: 'reading budget exceeded' };
      return undefined;
    });
    this.client.onAfterPaymentCreation(async () => {
      const s = this.als.getStore();
      if (s) s.signed = true;
    });
    // Never return { recovered: true }: that would sign a second authorization.
    this.client.onPaymentResponse(async () => undefined);
  }

  get address(): Hex {
    return this.client.address;
  }

  async session<T>(budget: bigint, fn: (s: ReadSession) => Promise<T>, answerId: Hex): Promise<T> {
    const state: State = { remaining: budget, pinned: new Map(), currentUrl: null, signed: false };
    return this.als.run(state, () =>
      fn({
        remaining: () => state.remaining,
        read: async (url, workId, payTo, price) => {
          state.pinned.set(url, { payTo, amount: price });
          state.currentUrl = url;
          state.signed = false;
          try {
            const r = await this.client.pay<ReadData>(url, { headers: { 'x-honorar-answer': answerId } });
            state.remaining -= r.amount;
            return { ok: true, transferId: r.transaction, amount: r.amount, data: r.data };
          } catch (e) {
            const reason = (e as Error).message;
            log.warn('read failed', { workId, signed: state.signed, reason });
            return { ok: false, reason, signed: state.signed };
          }
        },
      }),
    );
  }
}
