import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { BatchFacilitatorClient, GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS } from '@circle-fin/x402-batching/server';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import type { Hex } from 'viem';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const WRITER = env.WRITER_TEST_ADDRESS as Hex;
const fac = new BatchFacilitatorClient({ url: 'https://gateway-api.circle.com' });
const kind = (await fac.getSupported()).kinds.find((k) => k.network === 'eip155:5042' && (k.extra as { name?: string })?.name === 'GatewayWalletBatched');
if (!kind?.extra) throw new Error('no batching kind');
const req = { scheme: 'exact', network: 'eip155:5042', asset: '0x3600000000000000000000000000000000000000', amount: '1000', payTo: WRITER, maxTimeoutSeconds: GATEWAY_AUTH_VALIDITY_WINDOW_SECONDS, extra: kind.extra as Record<string, unknown> };

let signedRequests = 0;
let settled: { transaction: string; success: boolean } | null = null;
const server = createServer(async (rq, rs) => {
  const sig = rq.headers['payment-signature'];
  if (!sig) {
    const required = { x402Version: 2, error: 'payment required', resource: { url: 'http://localhost:8799/read', description: 'B8 fault test', mimeType: 'application/json' }, accepts: [req] };
    rs.writeHead(402, { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(required)).toString('base64'), 'content-type': 'application/json' });
    rs.end('{"error":"payment required"}');
    return;
  }
  signedRequests++;
  const payload = JSON.parse(Buffer.from(String(sig), 'base64').toString('utf8'));
  const v = await fac.verify(payload, req);
  if (v.isValid) settled = (await fac.settle(payload, req)) as typeof settled;
  rq.socket.destroy(); // seller drops the connection after the payment was signed and settled
});
await new Promise<void>((r) => server.listen(8799, r));

const startedAt = new Date(Date.now() - 2000).toISOString();
const agent = new GatewayClient({ chain: 'arc', privateKey: env.AGENT_PRIVATE_KEY as Hex, rpcUrl: env.ARC_RPC_URL });
let signed = false;
agent.onAfterPaymentCreation(async () => {
  signed = true;
});
agent.onPaymentResponse(async () => undefined);
let error = '';
try {
  await agent.pay('http://localhost:8799/read');
} catch (e) {
  error = (e as Error).message;
}
server.close();
await new Promise((r) => setTimeout(r, 3000));
const found = await agent.searchTransfers({ from: agent.address, to: WRITER, startDate: startedAt });
const result = {
  experiment: 'E4-B8',
  attack: 'Seller drops the connection after the agent signed',
  commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  ranAt: new Date().toISOString(),
  payCallError: error,
  signedBeforeError: signed,
  signedRequestsReceivedBySeller: signedRequests,
  sellerSettled: settled,
  transfersFoundBySearch: found.transfers.map((t) => ({ id: t.id, status: t.status, amount: t.amount })),
  verdict: signed && signedRequests === 1 && found.transfers.length === 1 ? 'RECOVERED' : 'FAILED',
};
writeFileSync('evidence/discovery/E4-b8.json', `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result)}\n`);
