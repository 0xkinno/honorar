export type Hex = `0x${string}`;
export type WorkId = Hex & { readonly __brand: 'WorkId' };
/** USDC amount in 6 decimal base units. Only `price()` creates one, from a registry snapshot. */
export type Usdc6 = bigint & { readonly __brand: 'Usdc6' };

export const NORM_VERSION = 'NORM_V1' as const;

/** The model can only produce this. No amounts, no addresses, no prices. */
export type ModelProposal = {
  answer: string;
  citations: { workId: WorkId; quote: string }[];
};

export type RegistryWork = {
  workId: WorkId;
  contentHash: Hex;
  version: number;
  active: boolean;
  quotePrice: bigint;
  readPrice: bigint;
  recipients: Hex[];
  bps: number[];
};

/** Prices and versions fetched from chain. The only legal source of amounts. */
export type RegistrySnapshot = ReadonlyMap<WorkId, RegistryWork>;

export type RegisteredSource = {
  workId: WorkId;
  /** canonical (not normalized) text as served by the read endpoint */
  text: string;
  url?: string;
};

export type UnregisteredSource = {
  url: string;
  text: string;
};

export type RefusalReason =
  | 'REFUSED_LENGTH'
  | 'REFUSED_NOT_IN_SOURCE'
  | 'REFUSED_SOURCE_CHANGED'
  | 'REFUSED_NOT_IN_ANSWER'
  | 'REFUSED_UNKNOWN_WORK'
  | 'REFUSED_INACTIVE_WORK';

export type Refusal = {
  workId: WorkId;
  quote: string;
  reason: RefusalReason;
};

export type Owed = {
  reason: 'writer_not_registered' | 'work_inactive';
  sourceUrl: string | null;
  workId: WorkId | null;
  quote: string;
};

export type Span = { start: number; end: number; text: string };

export type Leaf = {
  workId: WorkId;
  version: number;
  spanHash: Hex;
  amount: Usdc6;
  origin: 'model' | 'kernel';
  spans: string[];
};

export type BundleSource = {
  workId: WorkId;
  contentHash: Hex;
  version: number;
  text: string;
};

export type BundleUnregistered = { url: string; text: string };

export type StrikeRecord = {
  chainId: number;
  txHash: Hex;
  blockNumber: number;
  ledger: Hex;
  registry: Hex;
};

export type Bundle = {
  bundleVersion: 1;
  normVersion: typeof NORM_VERSION;
  answerId: Hex;
  question: string;
  answer: string;
  sources: BundleSource[];
  unregistered: BundleUnregistered[];
  leaves: {
    workId: WorkId;
    version: number;
    spanHash: Hex;
    amount: string;
    origin: 'model' | 'kernel';
    spans: string[];
  }[];
  refused: Refusal[];
  owed: Owed[];
  root: Hex;
  frontedReadingFees: string;
  transferIds: string[];
  gatewayTransfersHash: Hex;
  feeBps: number;
  strike: StrikeRecord | null;
};

export type KernelInput = {
  answerId: Hex;
  question: string;
  proposal: ModelProposal;
  registry: RegistrySnapshot;
  sources: RegisteredSource[];
  unregistered: UnregisteredSource[];
  transferIds: string[];
  frontedReadingFees: bigint;
};

export type KernelResult = {
  leaves: Leaf[];
  refused: Refusal[];
  owed: Owed[];
  root: Hex | null;
  gatewayTransfersHash: Hex;
  totals: { total: bigint; fee: bigint; fronted: bigint; spend: bigint };
  bundle: Bundle;
};
