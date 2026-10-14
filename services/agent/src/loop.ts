import { keccak256, toBytes } from 'viem';
import { snapshot, type ArcClient } from '@honorar/chain';
import {
  protocolFee,
  runKernel,
  type Bundle,
  type Hex,
  type KernelResult,
  type RegisteredSource,
  type RegistrySnapshot,
  type WorkId,
} from '@honorar/kernel';
import type { Corpus } from './corpus';
import type { Buyer, ReadOutcome } from './gateway/buyer';
import type { TransferRecord } from './gateway/records';
import type { Model } from './model';
import { readReader, type MandateView, type Striker } from './strike';
import type { Store } from './store';
import { log } from './log';

export type LoopEvent =
  | { stage: 'start'; answerId: Hex; reader: Hex }
  | { stage: 'retrieve'; candidates: { workId: WorkId; title: string; readPrice: string; quotePrice: string }[] }
  | { stage: 'decide'; chosen: WorkId[]; dropped: { workId: WorkId; reason: string }[]; budget: string }
  | { stage: 'read'; workId: WorkId; ok: boolean; transferId?: string; amount?: string; reason?: string; signed?: boolean }
  | { stage: 'draft'; answer: string; citations: number }
  | { stage: 'kernel'; verified: { workId: WorkId; origin: 'model' | 'kernel'; spans: string[] }[]; refused: { workId: WorkId; reason: string; quote: string }[]; owed: { reason: string; sourceUrl: string | null; quote: string }[] }
  | { stage: 'strike'; txHash: Hex; blockNumber: number; total: string; fee: string; fronted: string }
  | { stage: 'skip-strike'; reason: string }
  | { stage: 'bundle'; answerId: Hex }
  | { stage: 'error'; message: string }
  | { stage: 'done'; answerId: Hex };

export type LoopDeps = {
  chain: ArcClient;
  registry: Hex;
  ledger: Hex;
  corpus: Corpus;
  store: Store;
  model: Model;
  buyer: Buyer;
  striker: Striker;
  publicUrl: string;
  readingBudget: bigint;
  maxSources: number;
  onStruck?: (answerId: Hex, result: KernelResult) => Promise<void>;
  onAnswered?: (answerId: Hex, result: KernelResult, struck: boolean) => Promise<void>;
};

export type AskInput = { question: string; reader: Hex };

export function newAnswerId(question: string, reader: Hex, nowMs: number): Hex {
  const nonce = Math.random().toString(36).slice(2);
  return keccak256(toBytes(`${reader.toLowerCase()}|${nowMs}|${nonce}|${question}`));
}

/** Upper bound on what one answer can cost the reader given what will be opened. */
export function projectedSpend(opened: { readPrice: bigint; quotePrice: bigint }[]): bigint {
  const fronted = opened.reduce((a, o) => a + o.readPrice, 0n);
  const quotes = opened.reduce((a, o) => a + o.quotePrice, 0n);
  return fronted + quotes + protocolFee(quotes);
}

export function planReads<T extends { workId: WorkId; readPrice: bigint; quotePrice: bigint }>(
  ranked: T[],
  budget: bigint,
  maxSources: number,
  reader: Pick<MandateView, 'active' | 'maxPerAnswer' | 'allowance' | 'balance'>,
): { chosen: T[]; dropped: { workId: WorkId; reason: string }[] } {
  const chosen: T[] = [];
  const dropped: { workId: WorkId; reason: string }[] = [];
  let fronted = 0n;
  for (const c of ranked) {
    if (chosen.length >= maxSources) {
      dropped.push({ workId: c.workId, reason: 'source limit' });
      continue;
    }
    if (fronted + c.readPrice > budget) {
      dropped.push({ workId: c.workId, reason: 'reading budget' });
      continue;
    }
    const spend = projectedSpend([...chosen, c]);
    if (!reader.active) {
      dropped.push({ workId: c.workId, reason: 'mandate inactive' });
      continue;
    }
    if (spend > reader.maxPerAnswer) {
      dropped.push({ workId: c.workId, reason: 'mandate per-answer cap' });
      continue;
    }
    if (spend > reader.allowance || spend > reader.balance) {
      dropped.push({ workId: c.workId, reason: 'reader allowance or balance' });
      continue;
    }
    chosen.push(c);
    fronted += c.readPrice;
  }
  return { chosen, dropped };
}

export async function runAnswer(deps: LoopDeps, input: AskInput, emit: (e: LoopEvent) => void): Promise<Bundle | null> {
  const answerId = newAnswerId(input.question, input.reader, Date.now());
  emit({ stage: 'start', answerId, reader: input.reader });
  try {
    // 1 retrieve
    const docs = await deps.corpus.search(input.question, 6);
    const ids = docs.map((d) => d.workId as WorkId);
    const snap = await snapshot(deps.chain, deps.registry, ids);
    const cands = docs
      .map((d) => ({ doc: d, work: snap.get(d.workId as WorkId) }))
      .filter((c): c is { doc: typeof c.doc; work: NonNullable<typeof c.work> } => !!c.work && c.work.active);
    emit({
      stage: 'retrieve',
      candidates: cands.map((c) => ({
        workId: c.work.workId,
        title: c.doc.title,
        readPrice: c.work.readPrice.toString(),
        quotePrice: c.work.quotePrice.toString(),
      })),
    });
    if (cands.length === 0) throw new Error('no registered work matches this question');

    // 2 decide: the model proposes an order, deterministic code enforces budget and mandate
    const order = await deps.model.rank(
      input.question,
      cands.map((c) => ({ workId: c.work.workId, title: c.doc.title, excerpt: c.doc.text.slice(0, 280), readPrice: c.work.readPrice })),
    );
    const byId = new Map(cands.map((c) => [c.work.workId, c]));
    const ranked = [
      ...order.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c),
      ...cands.filter((c) => !order.includes(c.work.workId)),
    ];
    const reader = await readReader(deps.chain, deps.ledger, input.reader);
    const plan = planReads(
      ranked.map((c) => ({ ...c, workId: c.work.workId, readPrice: c.work.readPrice, quotePrice: c.work.quotePrice })),
      deps.readingBudget,
      deps.maxSources,
      reader,
    );
    emit({ stage: 'decide', chosen: plan.chosen.map((c) => c.workId), dropped: plan.dropped, budget: deps.readingBudget.toString() });
    if (plan.chosen.length === 0) throw new Error(`nothing can be read: ${plan.dropped.map((d) => d.reason).join(', ') || 'no candidates'}`);

    // 3 read: a real nanopayment for every source
    const opened: RegisteredSource[] = [];
    const transferIds: string[] = [];
    let fronted = 0n;
    await deps.buyer.session(
      deps.readingBudget,
      async (s) => {
        for (const c of plan.chosen) {
          const payTo = c.work.recipients[0] as Hex;
          const url = `${deps.publicUrl}/read/${c.workId}`;
          const r: ReadOutcome = await s.read(url, c.workId, payTo, c.work.readPrice);
          if (r.ok) {
            opened.push({ workId: c.workId, text: r.data.text, url: r.data.url });
            transferIds.push(r.transferId);
            fronted += r.amount;
            emit({ stage: 'read', workId: c.workId, ok: true, transferId: r.transferId, amount: r.amount.toString() });
          } else {
            if (r.signed) {
              const rec: TransferRecord = {
                id: `unconfirmed:${answerId}:${c.workId}`,
                workId: c.workId,
                answerId,
                amount: c.work.readPrice.toString(),
                payTo,
                payer: deps.buyer.address,
                createdAt: new Date().toISOString(),
                state: 'unconfirmed',
                transitions: { unconfirmed: new Date().toISOString() },
                settlementTx: null,
                settlementField: null,
                raw: null,
              };
              await deps.store.put('transfers', rec.id, rec);
            }
            emit({ stage: 'read', workId: c.workId, ok: false, reason: r.reason, signed: r.signed });
          }
        }
      },
      answerId,
    );
    if (opened.length === 0) throw new Error('no source could be read');

    // 4 draft: proposals only
    const proposal = await deps.model.draft(
      input.question,
      opened.map((o) => ({ workId: o.workId, title: byId.get(o.workId)?.doc.title ?? '', text: o.text })),
    );
    emit({ stage: 'draft', answer: proposal.answer, citations: proposal.citations.length });

    // 5 kernel
    const freshSnap: RegistrySnapshot = await snapshot(deps.chain, deps.registry, opened.map((o) => o.workId));
    const unreg = (await deps.corpus.unregistered()).map((d) => ({ url: d.url, text: d.text }));
    const result = runKernel({
      answerId,
      question: input.question,
      proposal,
      registry: freshSnap,
      sources: opened,
      unregistered: unreg,
      transferIds,
      frontedReadingFees: fronted,
    });
    emit({
      stage: 'kernel',
      verified: result.leaves.map((l) => ({ workId: l.workId, origin: l.origin, spans: l.spans })),
      refused: result.refused.map((r) => ({ workId: r.workId, reason: r.reason, quote: r.quote })),
      owed: result.owed.map((o) => ({ reason: o.reason, sourceUrl: o.sourceUrl, quote: o.quote })),
    });

    // 6 strike
    let bundle: Bundle = result.bundle;
    if (result.root && result.leaves.length > 0) {
      const s = await deps.striker.strike({
        ledger: deps.ledger,
        answerId,
        reader: input.reader,
        root: result.root,
        leaves: result.leaves,
        fronted,
        gatewayTransfersHash: result.gatewayTransfersHash,
      });
      bundle = { ...bundle, strike: { chainId: 5042, txHash: s.txHash, blockNumber: s.blockNumber, ledger: deps.ledger, registry: deps.registry } };
      await deps.store.put('strikes', answerId, { answerId, ...s, gasUsed: s.gasUsed.toString(), effectiveGasPrice: s.effectiveGasPrice.toString(), reader: input.reader, at: new Date().toISOString() });
      emit({ stage: 'strike', txHash: s.txHash, blockNumber: s.blockNumber, total: result.totals.total.toString(), fee: result.totals.fee.toString(), fronted: fronted.toString() });
      await deps.onStruck?.(answerId, result);
    } else {
      emit({ stage: 'skip-strike', reason: 'no verified quote, nothing to pay' });
    }

    // 7 bundle
    await deps.store.put('bundles', answerId, bundle);
    await deps.store.put('answers', answerId, {
      answerId,
      question: input.question,
      reader: input.reader,
      answer: bundle.answer,
      createdAt: new Date().toISOString(),
      struck: bundle.strike !== null,
    });
    emit({ stage: 'bundle', answerId });
    await deps.onAnswered?.(answerId, result, bundle.strike !== null).catch((e: unknown) => log.warn('feedback failed', { error: (e as Error).message }));
    emit({ stage: 'done', answerId });
    return bundle;
  } catch (e) {
    log.error('answer failed', { answerId, error: (e as Error).message });
    emit({ stage: 'error', message: (e as Error).message });
    return null;
  }
}
