import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const i = l.indexOf('=');
  if (i > 0 && !l.startsWith('#')) env[l.slice(0, i)] = l.slice(i + 1);
}
const need = ['DEPLOYER_PRIVATE_KEY', 'AGENT_ADDRESS', 'TREASURY_ADDRESS', 'OWNER_ADDRESS'];
const missing = need.filter((k) => !env[k]);
if (missing.length) {
  process.stderr.write(`missing in .env.local: ${missing.join(', ')}\n`);
  process.exit(1);
}
if (existsSync('deployments/arc-mainnet.json')) {
  process.stderr.write('deployments/arc-mainnet.json already exists; refusing to redeploy\n');
  process.exit(1);
}

const PATH = `${join(homedir(), '.foundry', 'bin')}${delimiter}${process.env.PATH}`;
execFileSync('forge', ['script', 'script/Deploy.s.sol', '--rpc-url', env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io', '--broadcast', '--legacy'], {
  cwd: 'contracts',
  stdio: 'inherit',
  env: { ...process.env, ...env, PATH },
});

const run = JSON.parse(readFileSync('contracts/broadcast/Deploy.s.sol/5042/run-latest.json', 'utf8'));
const creations = run.transactions.filter((t) => t.transactionType === 'CREATE');
const [reg, led] = creations;
const receipts = run.receipts;
const block = Number(BigInt(receipts[receipts.length - 1].blockNumber));
mkdirSync('deployments', { recursive: true });
writeFileSync(
  'deployments/arc-mainnet.json',
  `${JSON.stringify(
    {
      chainId: 5042,
      registry: reg.contractAddress,
      ledger: led.contractAddress,
      treasury: env.TREASURY_ADDRESS,
      agent: env.AGENT_ADDRESS,
      owner: env.DEPLOYER_ADDRESS,
      registryTx: reg.hash,
      ledgerTx: led.hash,
      block,
      deployedAt: new Date().toISOString(),
      compiler: { solc: '0.8.28', optimizerRuns: 200, evmVersion: 'cancun' },
    },
    null,
    2,
  )}\n`,
);
process.stdout.write('wrote deployments/arc-mainnet.json\n');
