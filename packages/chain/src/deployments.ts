import { existsSync, readFileSync } from 'node:fs';
import type { Hex } from '@honorar/kernel';

export type Deployment = {
  chainId: number;
  registry: Hex;
  ledger: Hex;
  treasury: Hex;
  agent: Hex;
  owner: Hex;
  registryTx: Hex;
  ledgerTx: Hex;
  block: number;
  deployedAt: string;
  compiler: { solc: string; optimizerRuns: number; evmVersion: string };
};

export function loadDeployment(path = 'deployments/arc-mainnet.json'): Deployment | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Deployment;
}
