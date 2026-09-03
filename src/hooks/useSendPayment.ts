import { useCallback, useRef, useState } from 'react'
import { toUserMessage } from '../lib/errors'
import {
  buildPaymentTransaction,
  submitPaymentToTestnet,
} from '../lib/stellar'
import { signTransactionXdr } from '../lib/wallet'

/**
 * Orchestrates a single XLM payment from the connected wallet.
 *
 * Pipeline (each step is a separate async call so the UI can report exactly
 * where it is):
 *
 *   1. signing    — build the unsigned transaction from Horizon (fresh
 *                   sequence number) and get it signed in Freighter
 *   2. submitting — submit the signed transaction to Testnet Horizon
 *   3. success    — Horizon accepted it; `txHash` links to the explorer
 *   4. error      — anything failed; `error` holds a friendly reason
 */

export type SendPhase =
  | 'idle'
  | 'signing'
  | 'submitting'
  | 'success'
  | 'error'

export interface SendOutcome {
  ok: boolean
  /** On-chain transaction hash (present only when ok). */
  hash: string | null
}

export interface UseSendPaymentResult {
  phase: SendPhase
  /** Transaction hash after a successful submission (for explorer links). */
  txHash: string | null
  /** User-friendly message from the last failed attempt. */
  error: string | null
  /** Send `amount` XLM to `destination`; resolves when the flow ends. */
  send: (destination: string, amount: string) => Promise<SendOutcome>
  /** Clear the success/error result and go back to the empty form. */
  reset: () => void
}

export function useSendPayment(
  publicKey: string | null,
  onSuccess?: () => void,
): UseSendPaymentResult {
  const [phase, setPhase] = useState<SendPhase>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Guards against double-submits while a flow is already running.
  const busyRef = useRef(false)

  const send = useCallback(
    async (destination: string, amount: string): Promise<SendOutcome> => {
      if (!publicKey || busyRef.current) {
        return { ok: false, hash: null }
      }
      busyRef.current = true
      setError(null)
      setTxHash(null)
      try {
        // 1. Build: fetch the source account's current sequence from Horizon
        //    and construct the payment transaction on the Testnet.
        setPhase('signing')
        const transaction = await buildPaymentTransaction(
          publicKey,
          destination,
          amount,
        )

        // 2. Sign: hand the unsigned XDR to Freighter. The wallet bridge
        //    pins the Testnet passphrase and surfaces user declinations.
        setPhase('submitting')
        const signedXdr = await signTransactionXdr(transaction.toXDR())

        // 3. Submit: reconstruct the signed Transaction and send it to
        //    Testnet Horizon.
        const { hash } = await submitPaymentToTestnet(signedXdr)
        setTxHash(hash)
        setPhase('success')
        // Let the caller refresh the balance now that funds moved.
        onSuccess?.()
        return { ok: true, hash }
      } catch (err) {
        // 4. Failure: map SDK/network errors to plain language.
        setError(toUserMessage(err))
        setPhase('error')
        return { ok: false, hash: null }
      } finally {
        busyRef.current = false
      }
    },
    [publicKey, onSuccess],
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setTxHash(null)
  }, [])

  return { phase, txHash, error, send, reset }
}
