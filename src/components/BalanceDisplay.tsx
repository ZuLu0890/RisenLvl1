import { EXPLORER, NETWORK } from '../config/network'
import type { AccountStatus } from '../hooks/useAccount'
import Banner from './Banner'

/**
 * Balance card for the connected account.
 *
 * Switches on the account status coming from useAccount:
 * - loading: skeleton while the first fetch is in flight,
 * - funded:  the native XLM balance with a refresh action,
 * - unfunded: explains the account doesn't exist yet and offers Friendbot
 *   funding (button funds in-app; the link is a manual fallback),
 * - error:   fetch failed with a retry action.
 */

interface BalanceDisplayProps {
  /** Connected account address (needed for faucet/explorer links). */
  publicKey: string
  status: AccountStatus
  balance: string | null
  error: string | null
  isLoading: boolean
  isFunding: boolean
  onRefresh: () => void
  onFund: () => void
}

/** Friendbot page users can open manually if the in-app call fails. */
function friendbotLink(publicKey: string): string {
  return `${NETWORK.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`
}

/** Render a Horizon balance string (e.g. "10000.0000000") readably. */
function formatXlm(balance: string): string {
  const value = Number(balance)
  if (Number.isNaN(value)) return balance
  return value.toLocaleString('en-US', { maximumFractionDigits: 7 })
}

export default function BalanceDisplay({
  publicKey,
  status,
  balance,
  error,
  isLoading,
  isFunding,
  onRefresh,
  onFund,
}: BalanceDisplayProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">XLM balance</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || status === 'unfunded'}
          title={status === 'unfunded' ? 'No account to refresh yet' : 'Refresh balance'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
              clipRule="evenodd"
            />
          </svg>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4">
        {status === 'loading' ? (
          // Initial fetch: show a placeholder skeleton instead of "0".
          <div className="space-y-2">
            <div className="h-10 w-44 animate-pulse rounded-lg bg-white/10" />
            <div className="h-4 w-64 animate-pulse rounded bg-white/5" />
          </div>
        ) : null}

        {status === 'funded' && balance !== null ? (
          <div>
            <p className="text-4xl font-bold tracking-tight text-slate-50">
              {formatXlm(balance)}
              <span className="ml-2 text-xl font-medium text-slate-400">XLM</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Native balance on the Stellar{' '}
              <span className="font-medium text-amber-300/90">Testnet</span>
              {' · '}
              <a
                href={EXPLORER.account(publicKey)}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300/80 underline decoration-sky-700 underline-offset-2 transition hover:text-sky-200"
              >
                view on Stellar Expert
              </a>
            </p>
          </div>
        ) : null}

        {status === 'unfunded' ? (
          <div className="space-y-4">
            <Banner variant="info" title="Account not found on the Testnet">
              This address has no account yet — it needs a first deposit of at
              least 1 XLM to be created. Friendbot will create it with free
              testnet XLM so you can start sending.
            </Banner>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onFund}
                disabled={isFunding}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFunding ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Funding account…
                  </>
                ) : (
                  <>Fund with Friendbot</>
                )}
              </button>
              <a
                href={friendbotLink(publicKey)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-2 transition hover:text-slate-200"
              >
                Open Friendbot manually
              </a>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="space-y-3">
            <Banner variant="error" title="Could not load the balance">
              {error}
            </Banner>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : null}

        {status === 'idle' ? (
          <p className="text-sm text-slate-500">No wallet connected.</p>
        ) : null}
      </div>
    </section>
  )
}
