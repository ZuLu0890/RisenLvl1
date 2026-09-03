import {
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api'
import { NETWORK } from '../config/network'
import { UserFacingError } from './errors'

/**
 * Thin wrapper around the Freighter browser-extension API.
 *
 * Keeping every freighter-api call in one module means the UI never talks to
 * the extension directly: detection, network verification, connection and
 * signing all funnel through the helpers below, and every failure is
 * converted into a message a user can act on.
 *
 * Note: Freighter has no extension-side "disconnect" — revoking access is
 * done from inside the extension. "Disconnecting" in this app simply means
 * clearing our local wallet state (see useWallet).
 */

/** Freighter install page, shown when the extension is not detected. */
export const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/'

/**
 * Detect whether the Freighter extension is present and reachable.
 *
 * isConnected() resolves to false after a short timeout when no extension
 * answers, so this doubles as both "installed?" and "responding?".
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const { isConnected: connected } = await isConnected()
    return connected === true
  } catch {
    // Extension bridge threw (e.g. not installed) — treat as unavailable.
    return false
  }
}

/**
 * Ask the user to allow this app to read their wallet addresses.
 *
 * @returns the selected account's public key (G... address)
 * @throws UserFacingError when the user denies the request
 */
export async function requestWalletAccess(): Promise<string> {
  let result: Awaited<ReturnType<typeof requestAccess>>
  try {
    result = await requestAccess()
  } catch (err) {
    console.error('requestAccess failed', err)
    throw new UserFacingError(
      'Freighter did not respond to the connection request. Make sure the extension is unlocked, then try again.',
    )
  }

  // A denial (or a failed request) comes back as an error and/or no address.
  if (result.error || !result.address) {
    throw new UserFacingError(
      'Connection request was denied. Approve the connection inside the Freighter popup to continue.',
    )
  }
  return result.address
}

/**
 * Verify the wallet is connected to the network this app expects (Testnet).
 *
 * Transactions signed for the wrong network are invalid everywhere, so this
 * fails fast with an actionable message instead of letting the user sign a
 * doomed transaction.
 */
export async function assertWalletOnExpectedNetwork(): Promise<void> {
  let result: Awaited<ReturnType<typeof getNetwork>>
  try {
    result = await getNetwork()
  } catch (err) {
    console.error('getNetwork failed', err)
    throw new UserFacingError(
      'Freighter did not respond to the network check. Unlock the extension and try again.',
    )
  }

  const walletPassphrase = result.networkPassphrase
  if (!walletPassphrase || walletPassphrase !== NETWORK.networkPassphrase) {
    throw new UserFacingError(
      `Freighter is connected to "${
        result.network || 'an unknown network'
      }", but this app only works on the Stellar Testnet. Switch your wallet network to the Testnet and try again.`,
    )
  }
}

/**
 * Ask Freighter to sign an unsigned transaction XDR.
 *
 * @param transactionXdr - base64 XDR of the unsigned transaction
 * @returns base64 XDR of the signed transaction
 * @throws UserFacingError when the user declines or signing fails
 */
export async function signTransactionXdr(
  transactionXdr: string,
): Promise<string> {
  let result: Awaited<ReturnType<typeof signTransaction>>
  try {
    // Pass the expected network passphrase explicitly: Freighter refuses to
    // sign with a mismatched network, which double-checks our Testnet setup.
    result = await signTransaction(transactionXdr, {
      networkPassphrase: NETWORK.networkPassphrase,
    })
  } catch (err) {
    console.error('signTransaction failed', err)
    throw new UserFacingError(
      'Freighter did not respond to the signing request. Make sure the extension is unlocked, then try again.',
    )
  }

  if (result.error || !result.signedTxXdr) {
    throw new UserFacingError(
      'The transaction signature was declined. Approve the transaction inside the Freighter popup to send it.',
    )
  }
  return result.signedTxXdr
}
