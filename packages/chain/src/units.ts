/** Native balances use 18 decimals, the ERC-20 view uses 6. Never mix them. */
export const NATIVE_DECIMALS = 18;
export const USDC_DECIMALS = 6;
const SCALE = 10n ** BigInt(NATIVE_DECIMALS - USDC_DECIMALS);

export function nativeToUsdc6(native: bigint): bigint {
  return native / SCALE;
}

export function usdc6ToNative(amount: bigint): bigint {
  return amount * SCALE;
}

export function formatUsdc6(amount: bigint, places = 6): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, '0').slice(0, places);
  return `${neg ? '-' : ''}${whole}${places > 0 ? `.${frac}` : ''}`;
}

export function parseUsdc6(text: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(text.trim());
  if (!m) throw new Error(`invalid USDC amount: ${text}`);
  return BigInt(m[1] as string) * 1_000_000n + BigInt((m[2] ?? '').padEnd(6, '0'));
}
