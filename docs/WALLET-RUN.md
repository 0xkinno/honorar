# WALLET-RUN

Every wallet-signed action of the product, performed on Arc mainnet from a connected wallet through the live app.

## What was run

The project owner wallet was connected through the Reown modal on https://honorar.vercel.app. A Playwright Chromium script drove the real interface; signing happened in a local provider announced as "Capture wallet" (EIP-6963), which broadcasts real transactions through `https://rpc.mainnet.arc.io`. Nothing was simulated.

| Step | Where | Transaction |
|---|---|---|
| Register a work | Library, paste text, hash, Register on Arc | `registerWork` on HonorarRegistry |
| Allowance | Ask, My wallet, Approve 0.20 USDC | `approve` on USDC for HonorarLedger |
| Spending cap | Ask, My wallet, Set mandate (0.05 per answer, 0.20 per 24h) | `setMandate` on HonorarLedger |
| Ask once | Ask, My wallet | the agent strikes from this wallet's allowance |
| Verify | Verify this answer | V1 to V7 PASS in the browser |

Hashes, blocks and the bundle are in [EVIDENCE.md](../EVIDENCE.md) under "Connected wallet" and in `evidence/mainnet/wallet-run.json`.

## Reproduce it with your own wallet

1. Open https://honorar.vercel.app/app/library and connect a browser wallet on Arc mainnet (about 1 USDC for gas and allowance).
2. Paste one of your articles, press Fetch and hash, keep the two default prices, press Register on Arc and sign.
3. Open Ask, choose My wallet, press Approve and sign, press Set mandate on Arc and sign.
4. Ask a question the article answers. The agent reads the work (a Gateway reading fee), the kernel checks the quotes, and one strike pays you from your allowance.
5. Press Verify this answer. Reading fees show Authorized until Gateway settles them, usually within minutes.
6. Disconnect with the round power button.
