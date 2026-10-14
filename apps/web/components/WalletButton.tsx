'use client';

import { Power } from 'lucide-react';
import { createElement } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { walletReady } from './Providers';

export function WalletButton() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  if (!walletReady) {
    return (
      <span className="chip warn" title="Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable wallets">
        Wallet not configured
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {createElement('appkit-button', { size: 'sm', balance: 'hide' })}
      {isConnected && (
        <button
          type="button"
          className="btn glass"
          onClick={() => disconnect()}
          aria-label="Disconnect"
          title="Disconnect"
          style={{ width: 36, minHeight: 36, padding: 0 }}
        >
          <Power size={16} />
        </button>
      )}
    </span>
  );
}
