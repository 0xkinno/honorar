'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, type Config } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arc } from 'viem/chains';
import { injected } from 'wagmi/connectors';
import { useState, type ReactNode } from 'react';
import { Motion } from './motion';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? '';
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const walletReady = projectId.length > 0;

const adapter = new WagmiAdapter({ networks: [arc], projectId: projectId || 'unset', ssr: true, connectors: [injected({ shimDisconnect: true })] });

if (walletReady) {
  createAppKit({
    adapters: [adapter],
    networks: [arc],
    defaultNetwork: arc,
    projectId,
    metadata: { name: 'Honorar', description: 'Pay writers for every AI quote', url: site, icons: [`${site}/brand/icon.svg`] },
    themeMode: 'light',
    themeVariables: { '--w3m-accent': '#6A2CF0', '--w3m-border-radius-master': '2px' },
    features: { analytics: false, email: false, socials: false },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={adapter.wagmiConfig as Config}>
      <QueryClientProvider client={client}>
        <Motion>{children}</Motion>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
