# SECURITY

- Secrets live only in `.env.local` (gitignored). gitleaks runs as a pre-commit hook. Wallets in this project were created for this build only.
- The ledger never holds funds and has no admin function that can move money, change fees or edit roots. The owner may rotate the agent and set the treasury.
- The agent key can only call `strike`, and only within each reader on-chain mandate.
- The buyer pins payee and price from the registry before signing and never retries a signed payment.
- Reports: open a private security advisory on the repository.
