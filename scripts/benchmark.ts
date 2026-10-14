import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { bm25 } from '../services/agent/src/corpus/bm25';
import { chatModel, withFallback, type Model } from '../services/agent/src/model';
import { contentHash, runKernel, type Hex, type RegistryWork, type WorkId } from '../packages/kernel/src/index';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

type Doc = { id: string; title: string; text: string; workId: WorkId; injected: boolean };
const raw = JSON.parse(readFileSync('corpus/seed/bench-corpus.json', 'utf8')) as { id: string; title: string; text?: string; file?: string; injected?: boolean }[];
const docs: Doc[] = raw.map((d) => {
  const text = (d.file ? readFileSync(`corpus/seed/${d.file}`, 'utf8') : (d.text as string)).trim();
  const workId = `0x${createHash('sha256').update(`bench:${d.id}`).digest('hex')}` as WorkId;
  return { id: d.id, title: d.title, text, workId, injected: d.injected === true };
});
const registry = new Map<WorkId, RegistryWork>(
  docs.map((d) => [d.workId, { workId: d.workId, contentHash: contentHash(d.text), version: 1, active: true, quotePrice: 4000n, readPrice: 1000n, recipients: ['0x' + '11'.repeat(20)] as Hex[], bps: [10000] }]),
);

const questions = (JSON.parse(readFileSync('bench/questions.json', 'utf8')) as { questions: { id: number; text: string }[] }).questions;

const main = chatModel({ baseUrl: env.LLM_BASE_URL as string, apiKey: env.LLM_API_KEY as string, model: env.LLM_MODEL_MAIN as string });
const second = chatModel({ baseUrl: env.LLM_SECOND_BASE_URL as string, apiKey: env.LLM_SECOND_API_KEY as string, model: env.LLM_MODEL_SECOND as string });
const MODELS: { label: string; model: Model }[] = [
  { label: 'main', model: withFallback(main, second) },
  { label: 'second', model: second },
];

type Row = { question: number; model: string; opened: string[]; cited: string[]; verified: string[]; refused: number; arms: Record<string, string[]>; error?: string };
const rows: Row[] = [];

const previous = existsSync('evidence/benchmark.json') ? (JSON.parse(readFileSync('evidence/benchmark.json', 'utf8')) as { rows: Row[] }).rows.filter((r) => !r.error) : [];
rows.push(...previous);
const done = new Set(previous.map((r) => `${r.model}:${r.question}`));
const tasks = MODELS.flatMap(({ label, model }) => questions.filter((q) => !done.has(`${label}:${q.id}`)).map((q) => ({ label, model, q })));
const hash01 = (x: string): number => parseInt(createHash('sha256').update(`seed1234567${x}`).digest('hex').slice(0, 8), 16) / 2 ** 32;
let next = 0;
async function worker(): Promise<void> {
  for (;;) {
    const t = tasks[next++];
    if (!t) return;
    const { label, model, q } = t;
    const top = bm25(docs, (d) => d.text, (d) => d.title, q.text, 3).map((r) => r.doc);
    const opened = top.length ? top : docs.slice(0, 2);
    try {
      let proposal: Awaited<ReturnType<Model['draft']>> | null = null;
      for (let attempt = 0; attempt < 6 && !proposal; attempt++) {
        try {
          proposal = await model.draft(q.text, opened.map((d) => ({ workId: d.workId, title: d.title, text: d.text })));
        } catch (err) {
          if (attempt === 5) throw err;
          await new Promise((res) => setTimeout(res, 12_000 * (attempt + 1)));
        }
      }
      if (!proposal) throw new Error('no proposal');
      const r = runKernel({
        answerId: ('0x' + '00'.repeat(32)) as Hex,
        question: q.text,
        proposal,
        registry,
        sources: opened.map((d) => ({ workId: d.workId, text: d.text })),
        unregistered: [],
        transferIds: [],
        frontedReadingFees: 0n,
      });
      const verified = r.leaves.map((l) => l.workId as string);
      const cited = [...new Set(proposal.citations.map((c) => c.workId as string))];
      const pool = opened.map((d) => d.workId as string);
      const randomPick = [...pool].sort((m, n) => hash01(`${q.id}${m}`) - hash01(`${q.id}${n}`)).slice(0, verified.length);
      rows.push({ question: q.id, model: label, opened: pool, cited, verified, refused: r.refused.length, arms: { payPerRead: pool, modelAttribution: cited, randomControl: randomPick, honorar: verified } });
    } catch (e) {
      rows.push({ question: q.id, model: label, opened: [], cited: [], verified: [], refused: 0, arms: {}, error: (e as Error).message });
    }
    process.stdout.write(`${label} q${q.id}\n`);
  }
}
await Promise.all(Array.from({ length: 2 }, () => worker()));
rows.sort((x, y) => x.model.localeCompare(y.model) || x.question - y.question);

const idToDoc = new Map(docs.map((d) => [d.workId as string, d]));
function metrics(model: string): Record<string, { misdirectedPct: number; unpaidUse: number; fabricatedPaid: number; stuffedPaid: number; paid: number }> {
  const out: Record<string, { misdirectedPct: number; unpaidUse: number; fabricatedPaid: number; stuffedPaid: number; paid: number }> = {};
  for (const arm of ['payPerRead', 'modelAttribution', 'randomControl', 'honorar']) {
    let paid = 0;
    let wrong = 0;
    let unpaid = 0;
    let fabricated = 0;
    let stuffed = 0;
    for (const r of rows.filter((x) => x.model === model && !x.error)) {
      const set = r.arms[arm] ?? [];
      const truth = new Set(r.verified);
      for (const id of set) {
        paid++;
        if (!truth.has(id)) wrong++;
        if (idToDoc.get(id)?.injected) stuffed++;
      }
      for (const id of truth) if (!set.includes(id)) unpaid++;
      if (arm === 'modelAttribution') fabricated += r.cited.filter((id) => !truth.has(id)).length;
    }
    out[arm] = { misdirectedPct: paid ? Math.round((wrong / paid) * 1000) / 10 : 0, unpaidUse: unpaid, fabricatedPaid: fabricated, stuffedPaid: stuffed, paid };
  }
  return out;
}

const byModel = Object.fromEntries(MODELS.map((m) => [m.label, metrics(m.label)]));
const filesHash = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');
const result = {
  commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  ranAt: new Date().toISOString(),
  questions: questions.length,
  models: MODELS.map((m) => m.label),
  modelIds: [env.LLM_MODEL_MAIN, env.LLM_MODEL_SECOND],
  corpus: docs.map((d) => ({ id: d.id, contentHash: contentHash(d.text), injected: d.injected })),
  arms: byModel.main,
  secondModelArms: byModel.second,
  errors: rows.filter((r) => r.error).length,
  rows,
};
mkdirSync('evidence', { recursive: true });
writeFileSync('evidence/benchmark.json', `${JSON.stringify(result, null, 2)}\n`);
const manifest = { commit: result.commit, ranAt: result.ranAt, modelIds: result.modelIds, corpusHash: createHash('sha256').update(docs.map((d) => contentHash(d.text)).join('')).digest('hex'), files: Object.fromEntries(['evidence/benchmark.json', 'bench/questions.json'].concat(readdirSync('evidence/break').map((f) => `evidence/break/${f}`)).map((f) => [f, filesHash(f)])) };
writeFileSync('evidence/run_manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ main: byModel.main, second: byModel.second, errors: result.errors })}\n`);
