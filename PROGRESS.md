# PROGRESS

## Done
- P0 setup: hooks (gitleaks, check-clean, trailer block), wallets, reference clones
- P2 contracts: Registry and Ledger, 42 Foundry tests, deployed to Arc mainnet (see EVIDENCE.md)
- P3 kernel: 30 tests, golden vectors shared with Foundry
- P6 verifier: V1 to V9, 10 tests
- P7 break campaign: 11 of 12 recorded results pass offline or on Foundry (B8 needs mainnet)
- P9 UI: landing, app pages, verify, proof
- Agent service code: seller, buyer, reconciler, loop, ERC-8004 helpers (typechecked, unit tested)
- Web deployed to Vercel: https://honorar.vercel.app (agent API and Reown id not connected yet)
- README rewritten per Phase R; supporting docs aligned
- QA matrix 72 of 72 locally and hero recomposed
- Deployer funded other wallets (agent, house reader, validator, writer test)

## Blocked or waiting
- First mainnet answer: `scripts/mainnet-seed.ts` (house mandate, registerWork, scripted strike) was not created because the auto-mode classifier denied the write. Needs the human to allow it or run an equivalent.
- LLM key (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_MAIN`, `LLM_MODEL_SECOND`) for the real answer loop and benchmark
- Phase D experiments E1 to E7 (need Gateway deposit and a running seller)
- ERC-8004 registration, validator feedback
- Source verification on Sourcify and the explorer
- Reown project id (wallet connect on the live site), Render account for the agent service and `NEXT_PUBLIC_AGENT_API_URL`, Postgres URL, GitHub push credentials for `0xkinno/honorar`
- Commit email for 0xkinno is the GitHub noreply address; replace via `git config user.email` if desired

## Next
- Run seed, then Phase D, G, A on mainnet; generate benchmark; regenerate EVIDENCE.md and PROOF.md; deploy
