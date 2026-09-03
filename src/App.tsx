import BalanceDisplay from './components/BalanceDisplay'
import SendTransaction from './components/SendTransaction'
import WalletConnect from './components/WalletConnect'
import { useAccount } from './hooks/useAccount'
import { useSendPayment } from './hooks/useSendPayment'
import { useWallet } from './hooks/useWallet'

/**
 * Stellar Testnet Wallet
 *
 * Wires the three feature areas together:
 *
 *   WalletConnect  — Freighter detection, connect / disconnect
 *   BalanceDisplay — native XLM balance, Friendbot funding for new accounts
 *   SendTransaction— validated XLM payments with success/failure feedback
 *
 * Each owns its logic through a dedicated hook; App only composes state.
 */

/** Why the send form is disabled right now, or null when sending is fine. */
function getSendDisabledReason(
  publicKey: string | null,
  accountStatus: ReturnType<typeof useAccount>['status'],
): string | null {
  if (!publicKey) return 'Connect your wallet above to send XLM.'
  if (accountStatus === 'unfunded') {
    return 'This account is not funded yet — use the Friendbot faucet above to create it with testnet XLM, then send.'
  }
  if (accountStatus === 'loading' || accountStatus === 'idle') {
    return 'Loading the account…'
  }
  if (accountStatus === 'error') {
    return 'The balance could not be loaded, so sending is disabled. Refresh the balance above and try again.'
  }
  return null
}

export default function App() {
  const wallet = useWallet()
  const account = useAccount(wallet.publicKey)
  // After a successful payment the balance has moved — refresh it.
  const payment = useSendPayment(wallet.publicKey, () => void account.refresh())

  const sendDisabledReason = getSendDisabledReason(
    wallet.publicKey,
    account.status,
  )

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-105 w-200 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
            <svg
              className="size-6 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 1.75a1 1 0 0 1 .933.62l1.448 3.71a1 1 0 0 0 .537.538l3.711 1.448a1 1 0 0 1 0 1.868l-3.71 1.448a1 1 0 0 0-.538.537l-1.448 3.711a1 1 0 0 1-1.866 0l-1.448-3.71a1 1 0 0 0-.537-.538l-3.71-1.448a1 1 0 0 1 0-1.868l3.71-1.448a1 1 0 0 0 .537-.538l1.448-3.71A1 1 0 0 1 10 1.75Z" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-50">
              Stellar Testnet Wallet
            </h1>
            <p className="text-xs text-slate-400">
              Freighter · Horizon · Testnet
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="mt-8 flex flex-col gap-5">
          <WalletConnect
            isChecking={wallet.isChecking}
            isFreighterInstalled={wallet.isFreighterInstalled}
            isConnecting={wallet.isConnecting}
            publicKey={wallet.publicKey}
            connectError={wallet.connectError}
            onConnect={() => void wallet.connect()}
            onDisconnect={wallet.disconnect}
            onClearError={wallet.clearError}
            onRecheck={() => void wallet.recheckFreighter()}
          />

          {wallet.publicKey ? (
            <>
              <BalanceDisplay
                publicKey={wallet.publicKey}
                status={account.status}
                balance={account.balance}
                error={account.error}
                isLoading={account.isLoading}
                isFunding={account.isFunding}
                onRefresh={() => void account.refresh()}
                onFund={() => void account.fundWithFriendbot()}
              />
              <SendTransaction
                disabledReason={sendDisabledReason}
                balance={account.balance}
                phase={payment.phase}
                txHash={payment.txHash}
                error={payment.error}
                send={payment.send}
                reset={payment.reset}
              />
            </>
          ) : null}
        </main>

        {/* Footer */}
        <footer className="mt-auto pt-12">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            Testnet only — no real value. Make sure your Freighter wallet is
            set to the{' '}
            <span className="font-medium text-amber-300/80">Testnet</span>{' '}
            network. Transactions are viewable on the Stellar Expert testnet
            explorer.
          </p>
        </footer>
      </div>
    </div>
  )
}
