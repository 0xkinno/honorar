import { parseProposal, type ModelProposal, type WorkId } from '@honorar/kernel';

export type Candidate = { workId: WorkId; title: string; excerpt: string; readPrice: bigint };
export type OpenedSource = { workId: WorkId; title: string; text: string };

/** The model never returns amounts or addresses: only an order and a proposal. */
export interface Model {
  readonly id: string;
  rank(question: string, candidates: Candidate[]): Promise<WorkId[]>;
  draft(question: string, sources: OpenedSource[]): Promise<ModelProposal>;
}

type ChatConfig = { baseUrl: string; apiKey: string; model: string };

async function chat(cfg: ChatConfig, system: string, user: string): Promise<string> {
  const body = JSON.stringify({
    model: cfg.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
      body,
    });
    status = res.status;
    if (res.ok) {
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return j.choices?.[0]?.message?.content ?? '';
    }
    if (status !== 429 && status < 500) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(`model request failed: ${status}`);
}

function parseJson(text: string): unknown {
  const m = /\{[\s\S]*\}/.exec(text);
  try {
    return JSON.parse(m ? m[0] : text);
  } catch {
    return {};
  }
}

const RANK_SYSTEM =
  'You choose which sources to open to answer a question. Reply with JSON {"order": [<candidate numbers, best first>]}. Use only the numbers given.';

const DRAFT_SYSTEM = [
  'You answer a question using ONLY the provided sources.',
  'Write a concise answer. When you rely on a source, quote it verbatim inside double quotation marks.',
  'Each quote must be copied exactly from the source, between 8 and 80 words.',
  'Reply with JSON {"answer": string, "citations": [{"workId": string, "quote": string}]}.',
  'Never state prices, amounts or addresses.',
].join(' ');

export function chatModel(cfg: ChatConfig): Model {
  return {
    id: cfg.model,
    async rank(question, candidates) {
      const list = candidates.map((c, i) => `${i + 1}. ${c.title}: ${c.excerpt}`).join('\n');
      const out = parseJson(await chat(cfg, RANK_SYSTEM, `Question: ${question}\n\nCandidates:\n${list}`));
      const order = (out as { order?: unknown }).order;
      const picked: WorkId[] = [];
      if (Array.isArray(order)) {
        for (const n of order) {
          const c = candidates[Number(n) - 1];
          if (c && !picked.includes(c.workId)) picked.push(c.workId);
        }
      }
      return picked;
    },
    async draft(question, sources) {
      const body = sources.map((s) => `[workId ${s.workId}] ${s.title}\n${s.text}`).join('\n\n---\n\n');
      const out = parseJson(await chat(cfg, DRAFT_SYSTEM, `Question: ${question}\n\nSources:\n${body}`));
      return parseProposal(out);
    },
  };
}
