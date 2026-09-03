import { useState } from 'react'
import { NETWORK } from '../config/network'
import { FREIGHTER_INSTALL_URL } from '../lib/wallet'
import Banner from './Banner'

/**
 * Wallet connection card.
 *
 * Covers the whole wallet lifecycle in the UI:
 * - probing / prompting when the Freighter extension is missing,
 * - the "Connect wallet" action,
 * - the connected view (address, network badge, disconnect),
 * - connection errors.
 *
 * The component is deliberately dumb: it receives state and callbacks from
 * App (which owns the useWallet hook) so it stays a pure view.
 */

interface WalletConnectProps {
  isChecking: boolean
  isFreighterInstalled: boolean
  isConnecting: boolean
  publicKey: string | null
  connectError: string | null
  onConnect: () => void
  onDisconnect: () => void
  onClearError: () => void
  onRecheck: () => void
}

/** Compact "GABCD…WXYZ" rendering of a Stellar public key. */
function shortenAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

export default function WalletConnect({
  isChecking,
  isFreighterInstalled,
  isConnecting,
  publicKey,
  connectError,
  onConnect,
  onDisconnect,
  onClearError,
  onRecheck,
}: WalletConnectProps) {
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!publicKey) return
    try {
      await navigator.clipboard.writeText(publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — ignore.
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
        <p className="text-sm text-slate-300">Checking for the Freighter extension…</p>
      </div>
    )
  }

  if (!isFreighterInstalled) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <Banner variant="warning" title="Freighter extension not detected">
          This app needs the Freighter wallet extension to connect to the
          Stellar Testnet. Install it, enable it for this site, then come back
          here.
        </Banner>
        <div className="flex flex-wrap gap-3">
          <a
            href={FREIGHTER_INSTALL_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Install Freighter
          </a>
          <button
            type="button"
            onClick={() => void onRecheck()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
          >
            I&apos;ve installed it — re-check
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {connectError ? (
        <div className="mb-4">
          <Banner
            variant="error"
            title="Could not connect"
            onDismiss={onClearError}
          >
            {connectError}
          </Banner>
        </div>
      ) : null}

      {!publicKey ? (
        // --- Disconnected state ---
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Connect your wallet
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Connect the Freighter extension to view your Testnet XLM balance
              and send payments.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConnecting ? (
              <>
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Awaiting approval…
              </>
            ) : (
              <>
                <svg
                  className="size-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                    clipRule="evenodd"
                  />
                </svg>
                Connect wallet
              </>
            )}
          </button>
        </div>
      ) : (
        // --- Connected state ---
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              <h2 className="text-lg font-semibold text-slate-100">Connected</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                {NETWORK.networkName}
              </span>
              <button
                type="button"
                onClick={onDisconnect}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <code className="text-sm text-slate-200" title={publicKey}>
              {shortenAddress(publicKey)}
            </code>
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
