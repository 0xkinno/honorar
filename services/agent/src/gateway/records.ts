import type { Hex, WorkId } from '@honorar/kernel';

export type TransferState = 'received' | 'batched' | 'confirmed' | 'completed' | 'failed' | 'unconfirmed';

export type TransferRecord = {
  id: string;
  workId: WorkId;
  answerId: Hex;
  amount: string;
  payTo: Hex;
  payer: Hex | null;
  createdAt: string;
  state: TransferState;
  /** first time each state was observed, ISO */
  transitions: Partial<Record<TransferState, string>>;
  settlementTx: Hex | null;
  /** name of the untyped field the settlement hash was read from */
  settlementField: string | null;
  raw: unknown;
};

export type BatchReconciliationRow = {
  txHash: Hex;
  block: number | null;
  writer: Hex;
  honorarSum: string;
  observedCredit: string | null;
  verdict: 'MATCH' | 'WRITER_HAS_OTHER_INCOME' | 'MISMATCH' | 'UNKNOWN';
  checkedAt: string;
  note: string;
};
