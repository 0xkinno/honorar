'use client';

import { Power } from 'lucide-react';
import { createElement } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { walletReady } from './Providers';

export function WalletButton() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  if (!walletReady) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {!isConnected && (
          <button type="button" className="btn dark small" onClick={() => connect({ connector: injected() })}>
            Connect wallet
          </button>
        )}
        {isConnected && (
          <button type="button" className="btn glass" onClick={() => disconnect()} aria-label="Disconnect" title="Disconnect" style={{ width: 36, minHeight: 36, padding: 0 }}>
            <Power size={16} />
          </button>
        )}
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
