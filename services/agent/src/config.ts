import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';

const hex = (n: number) => z.string().regex(new RegExp(`^0x[0-9a-fA-F]{${n}}$`));

const schema = z.object({
  ARC_RPC_URL: z.string().url().default('https://rpc.mainnet.arc.io'),
  PORT: z.coerce.number().default(8787),
  PUBLIC_AGENT_URL: z.string().url().default('http://localhost:8787'),
  AGENT_PRIVATE_KEY: hex(64),
  HOUSE_READER_PRIVATE_KEY: hex(64),
  VALIDATOR_PRIVATE_KEY: hex(64).optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL_MAIN: z.string().default('main'),
  LLM_SECOND_BASE_URL: z.string().url().optional(),
  LLM_SECOND_API_KEY: z.string().optional(),
  LLM_MODEL_SECOND: z.string().optional(),
  DATABASE_URL: z.string().optional().transform((v) => (v ? v : undefined)),
  DATA_DIR: z.string().default('.data'),
  READING_BUDGET_USDC6: z.coerce.bigint().default(5000n),
  MAX_SOURCES: z.coerce.number().default(3),
  HOUSE_RATE_LIMIT_PER_HOUR: z.coerce.number().default(20),
  ALLOWED_ORIGINS: z.string().default('*'),
});

export type Config = z.infer<typeof schema>;

export function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const file = loadEnvFile('../../.env.local');
  if (!env.PUBLIC_AGENT_URL && env.RENDER_EXTERNAL_URL) file.PUBLIC_AGENT_URL = env.RENDER_EXTERNAL_URL;
  for (const k of Object.keys(file)) if (file[k] === '') delete file[k];
  return schema.parse({ ...file, ...env });
}
