import type { Hex } from '@honorar/kernel';

export const ARC_CHAIN_ID = 5042;
export const ARC_RPC = 'https://rpc.mainnet.arc.io';
export const ARC_EXPLORER = 'https://explorer.arc.io';

export const ADDRESSES = {
  usdc: '0x3600000000000000000000000000000000000000',
  gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE',
  gatewayMinter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205',
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  validationRegistry: '0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58',
  multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
} as const satisfies Record<string, Hex>;

export const GATEWAY_API = 'https://gateway-api.circle.com';

export const txUrl = (hash: string): string => `${ARC_EXPLORER}/tx/${hash}`;
export const addressUrl = (addr: string): string => `${ARC_EXPLORER}/address/${addr}`;
