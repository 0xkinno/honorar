# ARCHITECTURE

```mermaid
flowchart LR
  R[Reader or house reader] -->|question + on-chain mandate| A[Agent service]
  A -->|retrieve| C[(Corpus: registered works)]
  A -->|open source: x402 nanopayment| GW[Circle Gateway]
  GW -.->|netted in a TEE, settled in batches| ARC[(Arc mainnet)]
  A -->|draft answer + proposed citations| M[Model]
  M -->|proposal only| K[Attribution kernel]
  K -->|verified leaves, OWED records, Merkle root| A
  A -->|strike| L[HonorarLedger]
  L -->|USDC from reader allowance, straight to writers| ARC
  REC[Netting reconciler] --> GW
  V[Offline verifier] -->|bundle + public RPC only| ARC
```

## Components

- `contracts/src/HonorarRegistry.sol`: works, content hashes, prices, co-author splits, versions. Holds no money.
- `contracts/src/HonorarLedger.sol`: mandates, once-only strikes, Merkle root recomputed on chain, 2.5% fee leg. Moves money straight from the reader allowance. Holds no money.
- `packages/kernel`: pure TypeScript. Normalization, citation verification, completeness sweep, leaves, Merkle, bundle.
- `packages/verifier`: checks V1 to V9 over a `ChainReader` interface. CLI and browser.
- `packages/chain`: ABIs, addresses, typed reads, unit helpers.
- `services/agent`: Hono API. Seller (`/read/:workId`), buyer with caps and payee pinning, reconciler, answer loop with SSE, bundle store.
- `apps/web`: Next.js app, landing story, app pages, verify and proof.

## Money boundaries

The model returns an order and a proposal. Prices come from the registry snapshot. The ledger re-reads price and version on chain, so a forged amount reverts.
