import type { Hex, WorkId } from '@honorar/kernel';

export type CorpusDoc = {
  /** workId when registered on chain, otherwise `url:<sha>` */
  id: string;
  workId: WorkId | null;
  url: string;
  title: string;
  text: string;
  contentHash: Hex;
  ingestedAt: string;
};
