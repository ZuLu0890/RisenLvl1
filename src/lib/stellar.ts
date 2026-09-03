import {
  Asset,
  BASE_FEE,
  Horizon,
  NotFoundError,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import { NETWORK } from '../config/network'
import { AccountNotFoundError, UserFacingError } from './errors'

/**
 * All Stellar SDK (Horizon) calls live here, separated from the UI and from
 * the Freighter wallet bridge (wallet.ts). Components and hooks only ever
 * call these helpers — they never construct SDK objects themselves.
 *
 * Every Horizon endpoint used below targets the Testnet URL configured in
 * src/config/network.ts.
 */

let server: Horizon.Server | null = null

/** Lazily-created Horizon client; reuses one HTTP connection pool. */
export function getHorizonServer(): Horizon.Server {
  server ??= new Horizon.Server(NETWORK.horizonUrl)
  return server
}

/**
 * Fetch the full account record for a public key from Horizon.
 *
 * @throws AccountNotFoundError when the account has never been funded
 *         (it does not exist on this network yet)
 */
export async function fetchAccount(
  publicKey: string,
): Promise<Horizon.AccountResponse> {
  try {
    return await getHorizonServer().loadAccount(publicKey)
  } catch (err) {
    if (err instanceof NotFoundError) {
      // Horizon answers 404 for unfunded accounts — turn it into the
      // dedicated error so callers can offer Friendbot funding.
      throw new AccountNotFoundError()
    }
    throw err
  }
}

/**
 * Pull the native XLM balance out of an account's balance array.
 *
 * An account's `balances` is a mixed array of native and issued-asset
 * lines; the native line is identified by asset_type === "native".
 *
 * @returns balance in lumens as a string, or null if no native line exists
 */
export function getNativeXlmBalance(
  account: Horizon.AccountResponse,
): string | null {
  const native = account.balances.find(
    (balance) => balance.asset_type === 'native',
  )
  return native ? native.balance : null
}

/**
 * Fund a (new) account with free testnet XLM from the Friendbot faucet.
 *
 * Friendbot creates the account on the Testnet with a starting balance:
 * GET https://friendbot.stellar.org?addr=<public key>
 *
 * @throws UserFacingError when the faucet is unreachable or refuses
 */
export async function fundAccountWithFriendbot(publicKey: string): Promise<void> {
  const url = `${NETWORK.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`

  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    console.error('Friendbot request failed', err)
    throw new UserFacingError(
      'Could not reach the Friendbot faucet. Check your internet connection and try again.',
    )
  }

  if (!response.ok) {
    // Friendbot reports the reason in JSON (e.g. "account already funded").
    let detail = ''
    try {
      const body = (await response.json()) as { detail?: string; title?: string }
      detail = body.detail ?? body.title ?? ''
    } catch {
      // Non-JSON error body — fall through to the generic message.
    }
    throw new UserFacingError(
      detail
        ? `Friendbot could not fund this account: ${detail}`
        : `Friendbot returned an error (HTTP ${response.status}). Please try again.`,
    )
  }
}

/**
 * Build an unsigned XLM payment transaction.
 *
 * Steps:
 * 1. Load the source account from Horizon — this gives us the current
 *    sequence number, which every transaction must carry to be accepted.
 * 2. Start a TransactionBuilder pinned to the Testnet passphrase.
 * 3. Add a single native-asset payment operation for the given amount.
 * 4. setTimeout(30) bounds how long the transaction stays valid — if the
 *    user takes longer than 30s to approve it in Freighter, the network
 *    will reject it as stale and we rebuild on retry.
 * 5. build() produces the unsigned Transaction, which is handed to
 *    Freighter for signing (we never hold the secret key).
 *
 * @param destination - recipient's G... public key
 * @param amount - amount in lumens as a decimal string (e.g. "12.5")
 */
export async function buildPaymentTransaction(
  sourcePublicKey: string,
  destination: string,
  amount: string,
): Promise<Transaction> {
  const sourceAccount = await fetchAccount(sourcePublicKey)

  return new TransactionBuilder(sourceAccount, {
    // BASE_FEE (100 stroops) is the minimum network fee; fine for Testnet.
    fee: BASE_FEE,
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      }),
    )
    .setTimeout(30)
    .build()
}

/**
 * Submit an already-signed transaction to the Testnet Horizon server.
 *
 * Freighter returns the signed transaction as base64 XDR; we reconstruct a
 * Transaction object from it (the passphrase must match the one used when
 * the transaction was built and signed) and hand it to Horizon.
 *
 * @param signedTxXdr - base64 XDR of the signed transaction
 * @returns the on-chain transaction hash (for explorer links)
 * @throws TransactionFailedError / NetworkError when Horizon rejects it
 */
export async function submitPaymentToTestnet(
  signedTxXdr: string,
): Promise<{ hash: string }> {
  const transaction = new Transaction(signedTxXdr, NETWORK.networkPassphrase)
  const response = await getHorizonServer().submitTransaction(transaction)
  return { hash: response.hash }
}
