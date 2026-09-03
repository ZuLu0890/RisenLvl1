# Stellar Testnet Wallet

A functional web DApp that connects to the **Freighter** wallet extension,
talks to the **Stellar Testnet** through Horizon, shows your native **XLM**
balance, and lets you **send XLM payments** with clear success/failure
feedback (including a Stellar Expert explorer link per transaction).

> ⚠️ Testnet only — every transaction uses free play money. No real value.

## Features

- **Freighter integration** — detects the extension (with an install prompt
  if missing), connects via `requestAccess()`, and verifies the wallet is on
  the Testnet before anything else. "Disconnect" clears local app state.
- **Balance display** — native XLM balance fetched from Horizon, with a
  loading skeleton and a refresh button. Unfunded accounts get a friendly
  "not found" state instead of a crash, plus one-click **Friendbot funding**.
- **Send XLM** — recipient address + amount form with client-side validation
  (address format, positive amounts, 7-decimal precision, balance check),
  Freighter signing, and Horizon submission with distinct pending states.
  Success shows the transaction hash linked to Stellar Expert; failures show
  a plain-language reason (insufficient balance, invalid address, network
  error…).
- **Auto-refresh** — the balance updates after every successful payment.
- Clean, readable UI built with **Tailwind CSS**.

## Tech stack

| Piece            | Choice                                   |
| ---------------- | ---------------------------------------- |
| Framework        | React 19 + TypeScript (Vite 8)           |
| Stellar SDK      | `@stellar/stellar-sdk` (Horizon client)  |
| Wallet           | `@stellar/freighter-api`                 |
| Network          | Stellar **Testnet** only                 |
| Styling          | Tailwind CSS v4                          |

## Prerequisites

- **Node.js 20+** and npm
- The **Freighter** wallet extension for your browser
  ([freighter.app](https://www.freighter.app/)) — Chrome, Firefox, Edge

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (default <http://localhost:5173>). The app works
out of the box against the SDF Testnet — no `.env` file needed.

### Setting up a testnet wallet

1. Install the Freighter extension and create a wallet (or import one).
2. Open Freighter → settings → switch the network to **Testnet**
   (must be Testnet, not Mainnet/Pubnet).
3. In the app, click **Connect wallet** and approve the request.

### Getting testnet XLM (Friendbot)

New accounts don't exist on the Testnet until they receive a first payment.
Do one of the following from the app after connecting:

- click **Fund with Friendbot** in the balance card (recommended — it funds
  and refreshes automatically), or
- open Friendbot manually:
  <https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY>

Friendbot mints a starting balance of 10,000 testnet XLM instantly.

### Testing the send flow

1. Connect and confirm the balance card shows **10,000 XLM** (or more).
2. Paste a second testnet address as the recipient. To create one, generate
   a throwaway keypair (e.g. in Freighter → "Add account") and fund it once
   with Friendbot so it exists on the network.
3. Enter an amount and click **Send XLM**.
4. Approve the transaction in the Freighter popup (it shows the Testnet
   passphrase).
5. Watch the balance refresh and the success banner appear with the
   transaction hash — click **View on Stellar Expert** to inspect it.

**Failure cases to try:** send more XLM than you hold (insufficient
balance), use a malformed address (client-side validation), or send to an
account that doesn't exist yet (network rejection with a friendly message).

## Project structure

```
src/
├── config/network.ts        # Testnet constants: Horizon URL, passphrase, Friendbot
├── lib/
│   ├── errors.ts            # UserFacingError + friendly mapping of SDK errors
│   ├── stellar.ts           # All Horizon SDK calls (balance, build, submit, Friendbot)
│   └── wallet.ts            # All Freighter calls (detect, connect, network check, sign)
├── hooks/
│   ├── useWallet.ts         # Connect/disconnect + extension detection state
│   ├── useAccount.ts        # Balance fetching, unfunded/loading states, funding
│   └── useSendPayment.ts    # Payment pipeline: build → sign → submit → result
└── components/
    ├── WalletConnect.tsx    # Connect/disconnect card + install prompt
    ├── BalanceDisplay.tsx   # Balance, refresh, Friendbot funding UI
    ├── SendTransaction.tsx  # Send form, validation, result banners
    └── Banner.tsx           # Shared success/error/info alert
```

The three layers are deliberately separated: **UI components** never call the
SDK or the wallet directly — they go through **hooks**, which call the
**lib** modules. All network configuration lives in `config/network.ts` (or
env vars), never inline.

## Environment variables

Everything defaults to the SDF Testnet; copy `.env.example` to `.env` only
to override:

| Variable                  | Default                              | Purpose                    |
| ------------------------- | ------------------------------------ | -------------------------- |
| `VITE_HORIZON_URL`        | `https://horizon-testnet.stellar.org`| Horizon API endpoint       |
| `VITE_NETWORK_NAME`       | `TESTNET`                            | Freighter network name     |
| `VITE_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015`  | Signing passphrase         |
| `VITE_FRIENDBOT_URL`      | `https://friendbot.stellar.org`      | Faucet for new accounts    |

The passphrase is hashed into every transaction signature: the wallet check
and the SDK builders both read this one value, so the app can't
accidentally target two different networks.

## Scripts

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite dev server          |
| `npm run build`   | Type-check (`tsc -b`) + production build |
| `npm run lint`    | Run oxlint                         |
| `npm run preview` | Preview the production build       |

## Notes & limitations

- Freighter has no extension-side "disconnect"; the Disconnect button clears
  the app's local wallet state. Revoke site access inside Freighter if you
  want to remove it there too.
- Transactions time out 30 seconds after build if you take too long to
  approve them in Freighter — just click send again.
- XLM amounts use up to 7 decimal places; anything finer is rejected by the
  client-side validation.
- This app sends **native XLM only** — no issued assets or smart contracts.
