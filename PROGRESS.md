# PROGRESS

## Done
- Contracts `HonorarRegistry` and `HonorarLedger` deployed to Arc mainnet and verified on Sourcify (EVIDENCE.md), 42 Foundry tests
- Attribution kernel (30 tests, golden vectors shared with Foundry) and offline verifier (10 tests)
- Break campaign 12 of 12, including B8 run on mainnet against the real Gateway facilitator
- Agent service on Render (https://honorar-api.onrender.com), Postgres on Supabase, two LLM providers with fallback
- Real answers struck on mainnet through the full loop: Gateway reading fee, model proposal, kernel verdict, strike
- Verifier V1 to V7 pass on mainnet bundles; V8 passes once every reading fee is `completed`
- Discovery E1, E2, E3, E5, E6 measured on mainnet; E4 covered by B8
- ERC-8004 agent registered (id 2436) and validator feedback recorded per struck answer
- Web on Vercel (https://honorar.vercel.app), connected to the agent API, Reown wallet button live
- QA matrix 72 of 72 against the live deployment
- README, DISCOVERY and EVIDENCE are generated from files in `evidence/`

## Waiting or partial
- E6 for 3, 5 and 10 leaves: needs more registered works
- E7 browser withdraw: not exercised
- Explorer-side source verification is behind a bot challenge; both contracts are verified on Sourcify (exact match)
- Wallet-signed flows (register a work, set a mandate) need a human wallet session to exercise end to end
- Demo video

## Next
- Demo video from the live app
- Regenerate README and EVIDENCE after any new mainnet run: `node scripts/evidence.mjs && node scripts/readme-sync.mjs`
