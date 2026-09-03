import { useCallback, useEffect, useRef, useState } from 'react'
import { AccountNotFoundError, toUserMessage } from '../lib/errors'
import {
  fetchAccount,
  fundAccountWithFriendbot,
  getNativeXlmBalance,
} from '../lib/stellar'

/** High-level state of the connected account, for the UI to switch on. */
export type AccountStatus =
  | 'idle' // no wallet connected
  | 'loading' // first fetch in flight
  | 'funded' // account exists; balance is available
  | 'unfunded' // account does not exist on the Testnet yet
  | 'error'

export interface UseAccountResult {
  status: AccountStatus
  /** Native XLM balance in lumens (string, e.g. "10000.0000000"), or null. */
  balance: string | null
  /** User-friendly message from the last failed fetch/funding attempt. */
  error: string | null
  /** True while a fetch is in flight. */
  isLoading: boolean
  /** True while the Friendbot funding request is in flight. */
  isFunding: boolean
  /** Re-fetch the account (also called automatically after a payment). */
  refresh: () => Promise<void>
  /** Fund the account with testnet XLM via Friendbot, then refresh. */
  fundWithFriendbot: () => Promise<boolean>
}

export function useAccount(publicKey: string | null): UseAccountResult {
  const [status, setStatus] = useState<AccountStatus>('idle')
  const [balance, setBalance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFunding, setIsFunding] = useState(false)

  // Generation counter: any fetch that started before the latest refresh or
  // public-key change is discarded when it resolves, so stale responses can
  // never overwrite newer state (e.g. disconnect -> quick reconnect).
  const generationRef = useRef(0)

  const refresh = useCallback(async (): Promise<void> => {
    if (!publicKey) {
      setStatus('idle')
      setBalance(null)
      setIsLoading(false)
      return
    }

    const generation = ++generationRef.current
    setIsLoading(true)
    setError(null)
    // Only show the full loading state when we have nothing to display yet;
    // background refreshes (e.g. after sending) keep the last known balance.
    setStatus((previous) =>
      previous === 'funded' || previous === 'unfunded' ? previous : 'loading',
    )

    try {
      const account = await fetchAccount(publicKey)
      if (generation !== generationRef.current) return // stale response
      setBalance(getNativeXlmBalance(account))
      setStatus('funded')
    } catch (err) {
      if (generation !== generationRef.current) return // stale response
      setBalance(null)
      if (err instanceof AccountNotFoundError) {
        // The account simply doesn't exist on the Testnet yet — show the
        // fund-via-Friendbot prompt instead of a scary error.
        setStatus('unfunded')
        setError(null)
      } else {
        setStatus('error')
        setError(toUserMessage(err))
      }
    } finally {
      if (generation === generationRef.current) {
        setIsLoading(false)
      }
    }
  }, [publicKey])

  // Fetch whenever the connected public key changes (initial connect and
  // switching accounts in the wallet).
  useEffect(() => {
    // Canonical data-fetch-on-change pattern: refresh() flips to the loading
    // state synchronously so the skeleton shows the instant the key changes.
    // eslint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const fundWithFriendbot = useCallback(async (): Promise<boolean> => {
    if (!publicKey || isFunding) return false
    setIsFunding(true)
    setError(null)
    try {
      await fundAccountWithFriendbot(publicKey)
      // Friendbot created the account — pull the fresh balance.
      await refresh()
      return true
    } catch (err) {
      setError(toUserMessage(err))
      return false
    } finally {
      setIsFunding(false)
    }
  }, [publicKey, isFunding, refresh])

  return {
    status,
    balance,
    error,
    isLoading,
    isFunding,
    refresh,
    fundWithFriendbot,
  }
}
