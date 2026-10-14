import { ARC_CHAIN_ID, ARC_EXPLORER, ARC_RPC } from '@honorar/chain';

type Switcher = (args: { chainId: number }) => Promise<unknown>;

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

const ARC_PARAMS = {
  chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
  chainName: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: [ARC_RPC],
  blockExplorerUrls: [ARC_EXPLORER],
};

/** Switches to Arc, adding the chain to the wallet first when the wallet does not know it. */
export async function ensureArc(chainId: number | undefined, switchChain: Switcher): Promise<void> {
  if (chainId === ARC_CHAIN_ID) return;
  try {
    await switchChain({ chainId: ARC_CHAIN_ID });
  } catch (e) {
    const eth = (globalThis as { ethereum?: Eip1193 }).ethereum;
    const code = (e as { code?: number; cause?: { code?: number } }).code ?? (e as { cause?: { code?: number } }).cause?.code;
    if (eth && (code === 4902 || /unrecognized|not added|unknown chain/i.test((e as Error).message))) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [ARC_PARAMS] });
      await switchChain({ chainId: ARC_CHAIN_ID });
      return;
    }
    throw e;
  }
}

/** Plain-language wallet errors. */
export function walletError(e: unknown): string {
  const m = (e as Error)?.message ?? String(e);
  if (/user rejected|user denied|rejected the request|request rejected/i.test(m)) return 'You rejected the request in your wallet.';
  if (/insufficient funds|exceeds the balance|gas required exceeds/i.test(m)) return 'This wallet does not hold enough USDC for gas on Arc.';
  if (/chain/i.test(m) && /mismatch|switch|unsupported/i.test(m)) return 'Switch your wallet to the Arc network and try again.';
  return m.split('\n')[0] ?? m;
}
