export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_API_URL ?? '';

export class ApiError extends Error {}

export async function getJson<T>(path: string): Promise<T> {
  if (!AGENT_URL) throw new ApiError('agent API url is not configured');
  const res = await fetch(`${AGENT_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new ApiError(`request failed (${res.status})`);
  return (await res.json()) as T;
}

export type AgentConfig = {
  chainId: number;
  registry: string | null;
  ledger: string | null;
  house: string;
  agent: string;
  readingBudget: string;
};

export type Stats = {
  answers: number;
  answersStruck: number;
  strikes: number;
  readingFees: number;
  readingFeesCompleted: number;
  reconciliations: number;
  mismatches: number;
  readingFeeVolume: string;
};

export type TransferView = {
  id: string;
  workId: string;
  answerId: string;
  amount: string;
  payTo: string;
  state: 'received' | 'batched' | 'confirmed' | 'completed' | 'failed' | 'unconfirmed';
  transitions: Record<string, string>;
  settlementTx: string | null;
  createdAt: string;
};

export type ReconView = {
  txHash: string;
  writer: string;
  honorarSum: string;
  observedCredit: string | null;
  verdict: 'MATCH' | 'WRITER_HAS_OTHER_INCOME' | 'MISMATCH' | 'UNKNOWN';
  note: string;
};

export type AnswerRow = { answerId: string; question: string; reader: string; answer: string; createdAt: string; struck: boolean };

export const clockLabel: Record<TransferView['state'], string> = {
  received: 'Authorized',
  batched: 'Batched',
  confirmed: 'Confirmed',
  completed: 'Settled on Arc',
  failed: 'Failed',
  unconfirmed: 'Unconfirmed',
};
