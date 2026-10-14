import { BatchFacilitatorClient, GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS } from '@circle-fin/x402-batching/server';
import type { Context } from 'hono';
import { ADDRESSES, ARC_CHAIN_ID, GATEWAY_API, readWork, type ArcClient } from '@honorar/chain';
import { contentHash, type Hex, type WorkId } from '@honorar/kernel';
import type { Corpus } from '../corpus';
import type { Store } from '../store';
import { log } from '../log';
import type { TransferRecord } from './records';

const NETWORK = `eip155:${ARC_CHAIN_ID}`;

type Requirements = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
};

export class ReadSeller {
  private readonly facilitator = new BatchFacilitatorClient({ url: GATEWAY_API });
  private extra: Record<string, unknown> | null = null;

  constructor(private readonly deps: { chain: ArcClient; registry: Hex; corpus: Corpus; store: Store; publicUrl: string }) {}

  private async batchExtra(): Promise<Record<string, unknown>> {
    if (this.extra) return this.extra;
    const supported = await this.facilitator.getSupported();
    const kind = supported.kinds.find(
      (k) => k.network === NETWORK && (k.extra as { name?: string } | undefined)?.name === 'GatewayWalletBatched',
    );
    if (!kind?.extra) throw new Error(`gateway does not list a batching kind for ${NETWORK}`);
    this.extra = kind.extra as Record<string, unknown>;
    return this.extra;
  }

  async handle(c: Context): Promise<Response> {
    const workId = c.req.param('workId') as WorkId;
    const answerId = c.req.header('x-honorar-answer') as Hex | undefined;
    if (!answerId || !/^0x[0-9a-fA-F]{64}$/.test(answerId)) return c.json({ error: 'x-honorar-answer header required' }, 400);

    const work = await readWork(this.deps.chain, this.deps.registry, workId);
    if (!work) return c.json({ error: 'unknown work' }, 404);
    if (!work.active) return c.json({ error: 'work inactive' }, 410);
    const payTo = work.recipients[0];
    if (!payTo) return c.json({ error: 'work has no recipient' }, 500);
    const doc = await this.deps.corpus.byWorkId(workId);
    if (!doc) return c.json({ error: 'text not held for this work' }, 404);
    if (contentHash(doc.text) !== work.contentHash) return c.json({ error: 'source changed since registration' }, 409);

    const req: Requirements = {
      scheme: 'exact',
      network: NETWORK,
      asset: ADDRESSES.usdc,
      amount: work.readPrice.toString(),
      payTo,
      maxTimeoutSeconds: GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS,
      extra: await this.batchExtra(),
    };
    const resource = {
      url: `${this.deps.publicUrl}/read/${workId}`,
      description: `Reading fee for ${doc.title}`,
      mimeType: 'application/json',
    };

    const header = c.req.header('payment-signature');
    if (!header) {
      const required = { x402Version: 2, error: 'payment required', resource, accepts: [req] };
      c.header('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(required)).toString('base64'));
      return c.json({ error: 'payment required' }, 402);
    }

    let payload: { x402Version: number; payload: Record<string, unknown>; accepted?: Record<string, unknown> };
    try {
      payload = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as typeof payload;
    } catch {
      return c.json({ error: 'malformed payment header' }, 400);
    }

    const verify = await this.facilitator.verify(payload, req);
    if (!verify.isValid) return c.json({ error: verify.invalidReason ?? 'invalid payment' }, 402);
    const settle = await this.facilitator.settle(payload, req);
    if (!settle.success) return c.json({ error: settle.errorReason ?? 'settlement failed' }, 402);

    const now = new Date().toISOString();
    const rec: TransferRecord = {
      id: settle.transaction,
      workId,
      answerId,
      amount: req.amount,
      payTo: req.payTo as Hex,
      payer: (settle.payer ?? verify.payer ?? null) as Hex | null,
      createdAt: now,
      state: 'received',
      transitions: { received: now },
      settlementTx: null,
      settlementField: null,
      raw: null,
    };
    await this.deps.store.put('transfers', rec.id, rec);
    log.info('reading fee settled', { transfer: rec.id, workId, amount: rec.amount });

    c.header('PAYMENT-RESPONSE', Buffer.from(JSON.stringify(settle)).toString('base64'));
    return c.json({
      workId,
      title: doc.title,
      url: doc.url,
      version: work.version,
      contentHash: work.contentHash,
      text: doc.text,
    });
  }
}
