/**
 * Stellar Testnet Wallet
 *
 * A small DApp that connects to the Freighter wallet extension, reads the
 * native XLM balance from the Stellar Testnet and sends testnet XLM.
 *
 * This is the top-level component; the real features (wallet connection,
 * balance display, sending) are wired in as the app grows.
 */
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
          Stellar Testnet Wallet
        </h1>
        <p className="mt-3 text-slate-400">
          Freighter + Horizon Testnet demo — features coming soon
        </p>
      </div>
    </main>
  )
}
