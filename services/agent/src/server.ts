import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { privateKeyToAccount } from 'viem/accounts';
import { createArcClient, formatUsdc6 } from '@honorar/chain';
import { loadDeployment, type Deployment } from '@honorar/chain/deployments';
import type { Bundle, Hex } from '@honorar/kernel';
import { loadConfig } from './config';
import { Corpus, docFromText, fetchDoc } from './corpus';
import { Buyer } from './gateway/buyer';
import { Reconciler } from './gateway/reconciler';
import { ReadSeller } from './gateway/seller';
import type { BatchReconciliationRow, TransferRecord } from './gateway/records';
import { runAnswer, type LoopEvent } from './loop';
import { log } from './log';
import { chatModel, type Model } from './model';
import { openStore } from './store';
import { Striker } from './strike';
import { feedbackScore, giveFeedback } from './erc8004';

const cfg = loadConfig();
const dep: Deployment | null = loadDeployment('../../deployments/arc-mainnet.json');
const chain = createArcClient(cfg.ARC_RPC_URL);
const store = openStore(cfg.DATABASE_URL, cfg.DATA_DIR);
const corpus = new Corpus(store);
const agentKey = cfg.AGENT_PRIVATE_KEY as Hex;
const houseAddress = privateKeyToAccount(cfg.HOUSE_READER_PRIVATE_KEY as Hex).address as Hex;
const buyer = new Buyer(agentKey, cfg.ARC_RPC_URL);
const reconciler = new Reconciler({
  gateway: buyer.client,
  store,
  agent: buyer.address,
  credit: async () => null,
});

const models: Record<string, Model> = {};
if (cfg.LLM_BASE_URL && cfg.LLM_API_KEY) {
  models.main = chatModel({ baseUrl: cfg.LLM_BASE_URL, apiKey: cfg.LLM_API_KEY, model: cfg.LLM_MODEL_MAIN });
}
if (cfg.LLM_SECOND_BASE_URL && cfg.LLM_SECOND_API_KEY && cfg.LLM_MODEL_SECOND) {
  models.second = chatModel({ baseUrl: cfg.LLM_SECOND_BASE_URL, apiKey: cfg.LLM_SECOND_API_KEY, model: cfg.LLM_MODEL_SECOND });
}

const app = new Hono();
app.use('*', cors({ origin: cfg.ALLOWED_ORIGINS === '*' ? '*' : cfg.ALLOWED_ORIGINS.split(','), exposeHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE'] }));

app.get('/health', (c) => c.json({ ok: true, deployed: dep !== null, models: Object.keys(models), house: houseAddress, agent: buyer.address }));

app.get('/config', (c) =>
  c.json({
    chainId: 5042,
    registry: dep?.registry ?? null,
    ledger: dep?.ledger ?? null,
    house: houseAddress,
    agent: buyer.address,
    readingBudget: cfg.READING_BUDGET_USDC6.toString(),
  }),
);

if (dep) {
  const seller = new ReadSeller({ chain, registry: dep.registry, corpus, store, publicUrl: cfg.PUBLIC_AGENT_URL });
  app.get('/read/:workId', (c) => seller.handle(c));
}

app.get('/corpus', async (c) => {
  const docs = await corpus.all();
  return c.json(docs.map((d) => ({ id: d.id, workId: d.workId, url: d.url, title: d.title, contentHash: d.contentHash, words: d.text.split(/\s+/).length })));
});

/** Fetch and normalize a URL so the writer can sign registerWork with the shown hash. */
app.post('/corpus/preview', async (c) => {
  const body = (await c.req.json()) as { url?: string; text?: string; title?: string };
  try {
    const doc = body.text ? docFromText(body.url ?? 'pasted:text', body.title ?? 'Untitled', body.text) : await fetchDoc(String(body.url));
    await corpus.upsert(doc);
    return c.json({ id: doc.id, title: doc.title, contentHash: doc.contentHash, url: doc.url, text: doc.text });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

/** After the writer's registerWork tx is mined, bind the on-chain work id to the held text. */
app.post('/corpus/bind', async (c) => {
  const { id, workId } = (await c.req.json()) as { id: string; workId: Hex };
  if (!dep) return c.json({ error: 'contracts not deployed' }, 503);
  const { readWork } = await import('@honorar/chain');
  const w = await readWork(chain, dep.registry, workId as never);
  if (!w) return c.json({ error: 'work not found on chain' }, 404);
  await corpus.bindWork(id, workId as never, w.contentHash);
  return c.json({ ok: true });
});

const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= cfg.HOUSE_RATE_LIMIT_PER_HOUR) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

app.post('/ask', async (c) => {
  if (!dep) return c.json({ error: 'contracts not deployed' }, 503);
  const body = (await c.req.json()) as { question?: string; reader?: string; model?: string };
  const question = String(body.question ?? '').trim();
  if (question.length < 5 || question.length > 400) return c.json({ error: 'question must be 5 to 400 characters' }, 400);
  const model = models[body.model ?? 'main'];
  if (!model) return c.json({ error: 'no model configured' }, 503);
  const house = !body.reader || body.reader === 'house';
  const reader = (house ? houseAddress : body.reader) as Hex;
  if (!/^0x[0-9a-fA-F]{40}$/.test(reader)) return c.json({ error: 'invalid reader address' }, 400);
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (house && limited(ip)) return c.json({ error: 'rate limit reached, try again later' }, 429);

  const striker = new Striker(chain, agentKey, cfg.ARC_RPC_URL);
  return streamSSE(c, async (stream) => {
    const emit = (e: LoopEvent): void => {
      void stream.writeSSE({ event: e.stage, data: JSON.stringify(e) });
    };
    await runAnswer(
      {
        chain,
        registry: dep.registry,
        ledger: dep.ledger,
        corpus,
        store,
        model,
        buyer,
        striker,
        publicUrl: cfg.PUBLIC_AGENT_URL,
        readingBudget: cfg.READING_BUDGET_USDC6,
        maxSources: cfg.MAX_SOURCES,
        onStruck: async (answerId, result) => {
          const agentId = process.env.ERC8004_AGENT_ID;
          if (!agentId || !cfg.VALIDATOR_PRIVATE_KEY) return;
          const proposed = result.leaves.filter((l) => l.origin === 'model').length + result.refused.length;
          const score = feedbackScore(result.leaves.filter((l) => l.origin === 'model').length, proposed);
          void giveFeedback(chain, cfg.ARC_RPC_URL, cfg.VALIDATOR_PRIVATE_KEY as Hex, BigInt(agentId), score, answerId).catch((e: unknown) =>
            log.warn('feedback failed', { error: (e as Error).message }),
          );
        },
      },
      { question, reader },
      emit,
    );
  });
});

app.get('/bundle/:answerId', async (c) => {
  const b = await store.get<Bundle>('bundles', c.req.param('answerId'));
  return b ? c.json(b) : c.json({ error: 'not found' }, 404);
});

app.get('/answers', async (c) => c.json((await store.list('answers')).reverse().slice(0, 50)));

app.get('/transfers', async (c) => {
  const list = await store.list<TransferRecord>('transfers');
  const writer = c.req.query('writer')?.toLowerCase();
  const answer = c.req.query('answer')?.toLowerCase();
  return c.json(
    list
      .filter((t) => (!writer || t.payTo.toLowerCase() === writer) && (!answer || t.answerId.toLowerCase() === answer))
      .map((t) => ({ ...t, raw: undefined })),
  );
});

app.get('/reconciliations', async (c) => c.json(await store.list<BatchReconciliationRow>('batch_reconciliations')));

app.get('/stats', async (c) => {
  const [answers, transfers, strikes, recs] = await Promise.all([
    store.list<{ struck: boolean }>('answers'),
    store.list<TransferRecord>('transfers'),
    store.list<{ txHash: string }>('strikes'),
    store.list<BatchReconciliationRow>('batch_reconciliations'),
  ]);
  return c.json({
    answers: answers.length,
    answersStruck: answers.filter((a) => a.struck).length,
    strikes: strikes.length,
    readingFees: transfers.length,
    readingFeesCompleted: transfers.filter((t) => t.state === 'completed').length,
    reconciliations: recs.length,
    mismatches: recs.filter((r) => r.verdict === 'MISMATCH').length,
    readingFeeVolume: formatUsdc6(transfers.reduce((a, t) => a + BigInt(t.amount), 0n)),
  });
});

setInterval(() => {
  void reconciler.tick().catch((e: unknown) => log.warn('reconciler tick failed', { error: (e as Error).message }));
}, 60_000);

serve({ fetch: app.fetch, port: cfg.PORT }, (i) => log.info('agent listening', { port: i.port, deployed: dep !== null }));
