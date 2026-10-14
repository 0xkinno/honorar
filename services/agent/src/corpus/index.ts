import type { Hex, WorkId } from '@honorar/kernel';
import type { Store } from '../store';
import { bm25 } from './bm25';
import type { CorpusDoc } from './types';

export * from './types';
export * from './ingest';
export { bm25, tokenize } from './bm25';

export class Corpus {
  constructor(private readonly store: Store) {}

  async all(): Promise<CorpusDoc[]> {
    return this.store.list<CorpusDoc>('works_cache');
  }

  async upsert(doc: CorpusDoc): Promise<void> {
    await this.store.put('works_cache', doc.id, doc);
  }

  async byWorkId(workId: WorkId): Promise<CorpusDoc | null> {
    return (await this.all()).find((d) => d.workId === workId) ?? null;
  }

  async bindWork(id: string, workId: WorkId, contentHash: Hex): Promise<void> {
    const d = await this.store.get<CorpusDoc>('works_cache', id);
    if (!d) throw new Error('unknown corpus doc');
    await this.upsert({ ...d, workId, contentHash });
  }

  /** Candidates among registered works only. */
  async search(query: string, k: number): Promise<CorpusDoc[]> {
    const registered = (await this.all()).filter((d) => d.workId !== null);
    return bm25(registered, (d) => d.text, (d) => d.title, query, k).map((s) => s.doc);
  }

  async unregistered(): Promise<CorpusDoc[]> {
    return (await this.all()).filter((d) => d.workId === null);
  }
}
