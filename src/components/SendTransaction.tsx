import { useState } from 'react'
import type { FormEvent } from 'react'
import { StrKey } from '@stellar/stellar-sdk'
import { EXPLORER } from '../config/network'
import type {
  SendOutcome,
  SendPhase,
} from '../hooks/useSendPayment'
import Banner from './Banner'

/**
 * Send-XLM form.
 *
 * Validates the recipient address and amount on the client before touching
 * the network, then drives the payment pipeline exposed by useSendPayment
 * and renders the outcome: a success banner with the transaction hash (and
 * explorer link) or an error banner with the reason.
 */

interface SendTransactionProps {
  /** Why the form is disabled, or null when the user can send. */
  disabledReason: string | null
  /** Current XLM balance string when funded (used for the max check). */
  balance: string | null
  phase: SendPhase
  txHash: string | null
  error: string | null
  send: (destination: string, amount: string) => Promise<SendOutcome>
  reset: () => void
}

interface FieldErrors {
  destination?: string
  amount?: string
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/ // lumens have 7 decimal places

/**
 * Client-side validation run before the form is submitted.
 *
 * @returns field-level error messages (empty object when valid)
 */
function validateFields(
  destination: string,
  amount: string,
  balance: string | null,
): FieldErrors {
  const errors: FieldErrors = {}
  const trimmedDestination = destination.trim()
  const trimmedAmount = amount.trim()

  if (!trimmedDestination) {
    errors.destination = 'Recipient address is required.'
  } else if (!StrKey.isValidEd25519PublicKey(trimmedDestination)) {
    errors.destination =
      'That does not look like a valid Stellar address — public keys start with G.'
  }

  if (!trimmedAmount) {
    errors.amount = 'Amount is required.'
  } else if (!AMOUNT_PATTERN.test(trimmedAmount)) {
    errors.amount = 'Enter a positive amount with up to 7 decimal places.'
  } else if (Number(trimmedAmount) <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  } else if (balance !== null && Number(trimmedAmount) > Number(balance)) {
    errors.amount = `Amount exceeds your balance of ${balance} XLM.`
  }

  return errors
}

/** Human-readable copy for the pending phases of the pipeline. */
const PENDING_LABEL: Partial<Record<SendPhase, string>> = {
  signing: 'Waiting for your signature in Freighter…',
  submitting: 'Submitting to the Testnet…',
}

export default function SendTransaction({
  disabledReason,
  balance,
  phase,
  txHash,
  error,
  send,
  reset,
}: SendTransactionProps) {
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const isPending = phase === 'signing' || phase === 'submitting'
  const pendingLabel = isPending ? PENDING_LABEL[phase] : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabledReason || isPending) return

    // Validate before doing anything async — no network or wallet call is
    // made unless the inputs are well-formed.
    const errors = validateFields(destination, amount, balance)
    setFieldErrors(errors)
    if (errors.destination || errors.amount) return

    const outcome = await send(destination.trim(), amount.trim())
    if (outcome.ok) {
      // Success — clear the form but keep the result banner visible.
      setDestination('')
      setAmount('')
      setFieldErrors({})
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-slate-100">Send XLM</h2>
      <p className="mt-1 text-sm text-slate-400">
        Pay a recipient on the Stellar Testnet from this wallet.
      </p>

      {disabledReason ? (
        <div className="mt-4">
          <Banner variant="info" title="Sending unavailable">
            {disabledReason}
          </Banner>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="recipient"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Recipient address
              </label>
              <input
                id="recipient"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="G…"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                aria-invalid={Boolean(fieldErrors.destination)}
                className={`w-full rounded-lg border bg-black/20 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                  fieldErrors.destination
                    ? 'border-rose-400/50 focus:ring-rose-400/30'
                    : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-400/30'
                }`}
              />
              {fieldErrors.destination ? (
                <p className="mt-1.5 text-xs text-rose-300">
                  {fieldErrors.destination}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Amount
              </label>
              <div className="relative">
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.0000000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.amount)}
                  className={`w-full rounded-lg border bg-black/20 px-3.5 py-2.5 pr-16 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                    fieldErrors.amount
                      ? 'border-rose-400/50 focus:ring-rose-400/30'
                      : 'border-white/10 focus:border-violet-400/50 focus:ring-violet-400/30'
                  }`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-500">
                  XLM
                </span>
              </div>
              {fieldErrors.amount ? (
                <p className="mt-1.5 text-xs text-rose-300">
                  {fieldErrors.amount}
                </p>
              ) : (
                balance !== null && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Available: {balance} XLM
                  </p>
                )
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {pendingLabel}
                </>
              ) : (
                <>Send XLM</>
              )}
            </button>
            {phase === 'success' || phase === 'error' ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                {phase === 'success' ? 'Send another' : 'Dismiss'}
              </button>
            ) : null}
          </div>
        </form>
      )}

      {/* Outcome banners */}
      <div className="mt-4 space-y-3">
        {phase === 'success' && txHash ? (
          <Banner variant="success" title="Payment sent">
            <p className="break-all font-mono text-xs text-emerald-200/70">
              {txHash}
            </p>
            <a
              href={EXPLORER.tx(txHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/25"
            >
              View on Stellar Expert
              <svg
                className="size-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11 3a1 1 0 1 0 0 2h2.586l-6.293 6.293a1 1 0 1 0 1.414 1.414L15 6.414V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z" />
                <path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z" />
              </svg>
            </a>
          </Banner>
        ) : null}

        {phase === 'error' && error ? (
          <Banner variant="error" title="Payment failed">
            {error}
          </Banner>
        ) : null}
      </div>
    </section>
  )
}
