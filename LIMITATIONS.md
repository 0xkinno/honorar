# LIMITATIONS

- Reading fees for co-authored works go to `recipients[0]` in v1. Honorarium strikes split correctly on chain.
- The 24h mandate window resets once the first spend is older than 24h (fixed window per reader), not a continuous sliding window.
- One honorarium per work per answer. Multiple distinct spans from one work are listed in the receipt and paid once.
- The writer credit view used for netting reconciliation (I9) depends on archive reads being available from the RPC. Where it is not, the verdict is UNKNOWN, never guessed.
- Foundry fork tests cannot execute the Arc native transfer precompile with stock Foundry. The fork test degrades to a skip. Strike behaviour is covered by the unit suite and by mainnet evidence.
- Explorer source verification is behind a bot challenge. Sourcify verification is used where available.
- Gateway withdrawal from a browser wallet (E7) has not been established yet. A CLI path is the fallback.
- The model is optional for payouts: if no model key is configured the answer loop is unavailable, and scripted answers must be labelled as such.
- Quotes shorter than 8 words or longer than 80 words are refused by design.
- The live Vercel deployment is not yet connected to a hosted agent API, so on-site asking, registering and earnings need that service before they work end to end.
