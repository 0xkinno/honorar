import { createWalletClient, http, erc20Abi, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arc } from 'viem/chains';
import { ADDRESSES, honorarLedgerAbi } from '@honorar/chain';
import type { Hex, Leaf } from '@honorar/kernel';

export type StrikeArgs = {
  ledger: Hex;
  answerId: Hex;
  reader: Hex;
  root: Hex;
  leaves: Leaf[];
  fronted: bigint;
  gatewayTransfersHash: Hex;
};

export type MandateView = {
  active: boolean;
  maxPerAnswer: bigint;
  maxPer24h: bigint;
  spentWindow: bigint;
  windowStart: bigint;
  allowance: bigint;
  balance: bigint;
};

export async function readReader(client: PublicClient, ledger: Hex, reader: Hex): Promise<MandateView> {
  const [m, allowance, balance] = await Promise.all([
    client.readContract({ address: ledger, abi: honorarLedgerAbi, functionName: 'mandates', args: [reader] }),
    client.readContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'allowance', args: [reader, ledger] }),
    client.readContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [reader] }),
  ]);
  return {
    maxPerAnswer: m[0],
    maxPer24h: m[1],
    spentWindow: m[2],
    windowStart: m[3],
    active: m[4],
    allowance,
    balance,
  };
}

export class Striker {
  private readonly account;

  constructor(
    private readonly client: PublicClient,
    privateKey: Hex,
    private readonly rpcUrl: string,
  ) {
    this.account = privateKeyToAccount(privateKey);
  }

  get address(): Hex {
    return this.account.address;
  }

  /** Simulate, send, wait. Throws if the simulation or the receipt fails. */
  async strike(a: StrikeArgs): Promise<{ txHash: Hex; blockNumber: number; gasUsed: bigint; effectiveGasPrice: bigint }> {
    const leaves = a.leaves.map((l) => ({
      workId: l.workId,
      version: l.version,
      spanHash: l.spanHash,
      amount: l.amount as unknown as bigint,
    }));
    const { request } = await this.client.simulateContract({
      account: this.account,
      address: a.ledger,
      abi: honorarLedgerAbi,
      functionName: 'strike',
      args: [a.answerId, a.reader, a.root, leaves, a.fronted, a.gatewayTransfersHash],
    });
    const wallet = createWalletClient({ account: this.account, chain: arc, transport: http(this.rpcUrl) });
    const txHash = await wallet.writeContract(request);
    const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') throw new Error(`strike reverted: ${txHash}`);
    return {
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
    };
  }
}
