import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import pg from 'pg';

export type Collection =
  | 'works_cache'
  | 'answers'
  | 'bundles'
  | 'transfers'
  | 'transfer_events'
  | 'batch_reconciliations'
  | 'strikes'
  | 'house_usage';

export interface Store {
  put<T>(c: Collection, id: string, value: T): Promise<void>;
  get<T>(c: Collection, id: string): Promise<T | null>;
  list<T>(c: Collection): Promise<T[]>;
}

type Dump = Record<string, Record<string, unknown>>;

/** Single-process JSON file store for local development. */
export class FileStore implements Store {
  private data: Dump = {};

  constructor(private readonly path: string) {
    if (existsSync(path)) this.data = JSON.parse(readFileSync(path, 'utf8')) as Dump;
  }

  private flush(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.path);
  }

  async put<T>(c: Collection, id: string, value: T): Promise<void> {
    (this.data[c] ??= {})[id] = value;
    this.flush();
  }

  async get<T>(c: Collection, id: string): Promise<T | null> {
    return ((this.data[c] ?? {})[id] as T | undefined) ?? null;
  }

  async list<T>(c: Collection): Promise<T[]> {
    return Object.values(this.data[c] ?? {}) as T[];
  }
}

/** Postgres store. The chain is the source of truth; this is a rebuildable index. */
export class PgStore implements Store {
  private readonly pool: pg.Pool;
  private ready: Promise<void>;

  constructor(url: string) {
    this.pool = new pg.Pool({ connectionString: url, max: 5, ssl: /supabase|render.com/.test(url) ? { rejectUnauthorized: false } : undefined });
    this.ready = this.pool
      .query(
        `create table if not exists docs (
           collection text not null,
           id text not null,
           data jsonb not null,
           created_at timestamptz not null default now(),
           primary key (collection, id)
         )`,
      )
      .then(() => undefined);
  }

  async put<T>(c: Collection, id: string, value: T): Promise<void> {
    await this.ready;
    await this.pool.query(
      `insert into docs (collection, id, data) values ($1, $2, $3)
       on conflict (collection, id) do update set data = excluded.data`,
      [c, id, JSON.stringify(value)],
    );
  }

  async get<T>(c: Collection, id: string): Promise<T | null> {
    await this.ready;
    const r = await this.pool.query('select data from docs where collection = $1 and id = $2', [c, id]);
    return (r.rows[0]?.data as T | undefined) ?? null;
  }

  async list<T>(c: Collection): Promise<T[]> {
    await this.ready;
    const r = await this.pool.query('select data from docs where collection = $1 order by created_at', [c]);
    return r.rows.map((row) => row.data as T);
  }
}

export function openStore(databaseUrl: string | undefined, dataDir: string): Store {
  return databaseUrl ? new PgStore(databaseUrl) : new FileStore(`${dataDir}/store.json`);
}
