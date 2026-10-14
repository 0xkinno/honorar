import { createWalletClient, http, keccak256, parseAbi, parseEventLogs, toHex, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';
import { ADDRESSES } from '@honorar/chain';
import type { Hex } from '@honorar/kernel';

const identityAbi = parseAbi([
  'function register(string metadataURI) returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]);

const reputationAbi = parseAbi([
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
]);

export async function registerAgent(client: PublicClient, rpcUrl: string, ownerKey: Hex, metadataUri: string): Promise<{ agentId: bigint; txHash: Hex }> {
  const account = privateKeyToAccount(ownerKey);
  const wallet = createWalletClient({ account, chain: arc, transport: http(rpcUrl) });
  const { request } = await client.simulateContract({
    account,
    address: ADDRESSES.identityRegistry,
    abi: identityAbi,
    functionName: 'register',
    args: [metadataUri],
  });
  const txHash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  const logs = parseEventLogs({ abi: identityAbi, logs: receipt.logs, eventName: 'Transfer' });
  const minted = logs.find((l) => l.args.to.toLowerCase() === account.address.toLowerCase());
  if (!minted) throw new Error('registration emitted no Transfer to the owner');
  return { agentId: minted.args.tokenId, txHash };
}

/** round(100 * verified / max(1, proposed)), clamped to 0..100. */
export function feedbackScore(verified: number, proposed: number): number {
  return Math.max(0, Math.min(100, Math.round((100 * verified) / Math.max(1, proposed))));
}

export type FeedbackTag = 'answer_settled' | 'answer_refused';

export async function giveFeedback(
  client: PublicClient,
  rpcUrl: string,
  validatorKey: Hex,
  agentId: bigint,
  score: number,
  answerId: Hex,
  tag: FeedbackTag = 'answer_settled',
): Promise<Hex> {
  const account = privateKeyToAccount(validatorKey);
  const wallet = createWalletClient({ account, chain: arc, transport: http(rpcUrl) });
  const { request } = await client.simulateContract({
    account,
    address: ADDRESSES.reputationRegistry,
    abi: reputationAbi,
    functionName: 'giveFeedback',
    args: [agentId, BigInt(score), 0, tag, '', '', '', keccak256(toHex(answerId))],
  });
  const txHash = await wallet.writeContract(request);
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
