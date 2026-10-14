import { readFileSync, writeFileSync } from 'node:fs';
import { createArcClient } from '../packages/chain/src/index';
import { registerAgent } from '../services/agent/src/erc8004';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const client = createArcClient(env.ARC_RPC_URL);
const uri = `${env.NEXT_PUBLIC_AGENT_API_URL}/agent.json`;
const r = await registerAgent(client, env.ARC_RPC_URL as string, env.DEPLOYER_PRIVATE_KEY as `0x${string}`, uri);
writeFileSync('evidence/mainnet/erc8004.json', `${JSON.stringify({ agentId: r.agentId.toString(), txHash: r.txHash, metadataUri: uri, registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432', owner: 'deployer', ranAt: new Date().toISOString() }, null, 2)}\n`);
process.stdout.write(`agent id ${r.agentId} tx ${r.txHash}\n`);
