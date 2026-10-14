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
- Live end to end on Vercel: ask on honorar.vercel.app, Render agent, Gateway reading fee, kernel, mainnet strike, in-browser verify V1 to V8 PASS (screenshots in docs/qa/live-*.png)
- README, DISCOVERY and EVIDENCE are generated from files in `evidence/`
- Connected-wallet run on mainnet through the live UI: registerWork, approve, setMandate and a wallet-paid answer (docs/WALLET-RUN.md)
- Multi-writer corpus: six registered works plus two builder articles; strikes with 1, 2, 3 and 5 leaves
- Reputation feedback for every answer, struck or refused; E7 withdraw on mainnet
- Wallet fallback: injected browser wallet works without a Reown project id

- Demo film rendered locally (reference/video, not committed): 2:56, 1920x1080, voiceover, real mainnet capture; uploaded: https://youtu.be/qlJBYSb3liQ

## Waiting or partial
- E6 for 10 leaves: needs ten registered works (1, 2, 3 and 5 leaves measured)
- E7: withdraw works from the writer key; browser-wallet signing of the burn intent not exercised
- Explorer-side source verification is behind a bot challenge; both contracts are verified on Sourcify (exact match)

## Next
- Regenerate README and EVIDENCE after any new mainnet run: `node scripts/evidence.mjs && node scripts/readme-sync.mjs`
