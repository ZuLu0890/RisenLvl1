import { useCallback, useEffect, useState } from 'react'
import { toUserMessage, UserFacingError } from '../lib/errors'
import {
  assertWalletOnExpectedNetwork,
  isFreighterAvailable,
  requestWalletAccess,
} from '../lib/wallet'

/**
 * Wallet connection state machine for the Freighter extension.
 *
 * Owns everything between "no wallet" and "connected with a public key":
 * extension detection, the connect flow (probe -> network check -> access
 * request) and disconnecting.
 */

export interface UseWalletResult {
  /** True while the extension probe runs (shortly after page load). */
  isChecking: boolean
  /** Whether the Freighter extension responded to the detection probe. */
  isFreighterInstalled: boolean
  /** True while the connect flow is awaiting the Freighter popup. */
  isConnecting: boolean
  /** Connected account's public key, or null while disconnected. */
  publicKey: string | null
  /** User-friendly message from the last failed connect attempt. */
  connectError: string | null
  /** Run the connect flow; resolves true when connected. */
  connect: () => Promise<boolean>
  /** Clear local wallet state and return to the disconnected view. */
  disconnect: () => void
  /** Dismiss the visible connect error. */
  clearError: () => void
  /** Re-run the extension detection probe (after installing/enabling). */
  recheckFreighter: () => Promise<void>
}

export function useWallet(): UseWalletResult {
  const [isChecking, setIsChecking] = useState(true)
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)

  // Probe for the extension once on mount. The probe resolves after ~2s
  // when no extension answers, so this also covers the "installed but
  // disabled" case by showing the install prompt again.
  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      const available = await isFreighterAvailable()
      if (!cancelled) {
        setIsFreighterInstalled(available)
        setIsChecking(false)
      }
    }
    void probe()
    return () => {
      cancelled = true
    }
  }, [])

  const recheckFreighter = useCallback(async () => {
    setIsChecking(true)
    const available = await isFreighterAvailable()
    setIsFreighterInstalled(available)
    setIsChecking(false)
  }, [])

  const connect = useCallback(async (): Promise<boolean> => {
    setConnectError(null)
    setIsConnecting(true)
    try {
      // 1. The extension must be installed and reachable.
      const available = await isFreighterAvailable()
      setIsFreighterInstalled(available)
      if (!available) {
        throw new UserFacingError(
          'Freighter extension not detected. Install it from freighter.app, enable it for this site, then try again.',
        )
      }

      // 2. Make sure the wallet is on the Testnet before asking for access.
      await assertWalletOnExpectedNetwork()

      // 3. Ask the user to allow this app to read their address. This pops
      //    the Freighter approval UI; it resolves once the user decides.
      const address = await requestWalletAccess()
      setPublicKey(address)
      setConnectError(null)
      return true
    } catch (err) {
      setConnectError(toUserMessage(err))
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    // Freighter has no extension-side "disconnect" (access grants are
    // managed inside the extension itself), so disconnecting here means
    // clearing the local app state and showing the disconnected view.
    setPublicKey(null)
    setConnectError(null)
  }, [])

  const clearError = useCallback(() => setConnectError(null), [])

  return {
    isChecking,
    isFreighterInstalled,
    isConnecting,
    publicKey,
    connectError,
    connect,
    disconnect,
    clearError,
    recheckFreighter,
  }
}
