import { Networks } from '@stellar/stellar-sdk'

/**
 * Central network configuration.
 *
 * This app is built for the Stellar **Testnet** only: the Horizon client,
 * the transaction builder and the wallet-signing calls all read from this
 * single object, so the network can never silently diverge between layers.
 *
 * Every value defaults to the SDF Testnet. You can override them through
 * Vite environment variables (see `.env.example`) — e.g. to point Horizon
 * at a local Core/Horizon testnet instance — but the SDK and Freighter will
 * still be pinned to the same passphrase below.
 */

const env = import.meta.env

/** Horizon HTTP endpoint used for all account/transaction queries. */
const horizonUrl =
  (env.VITE_HORIZON_URL as string | undefined) ??
  'https://horizon-testnet.stellar.org'

/**
 * Network passphrase — this is hashed into every transaction signature, so
 * it MUST match the network the Freighter wallet is connected to.
 * @see https://developers.stellar.org/docs/learn/encyclopedia/network-configuration/network-passphrase
 */
const networkPassphrase =
  (env.VITE_NETWORK_PASSPHRASE as string | undefined) ?? Networks.TESTNET

/** Freighter's identifier for the network (shown when verifying the wallet). */
const networkName = (env.VITE_NETWORK_NAME as string | undefined) ?? 'TESTNET'

/**
 * Friendbot hands out free testnet XLM to new accounts:
 * GET https://friendbot.stellar.org?addr=<public key>
 * @see https://developers.stellar.org/docs/learn/encyclopedia/testnet-and-pubnet#friendbot
 */
const friendbotUrl =
  (env.VITE_FRIENDBOT_URL as string | undefined) ?? 'https://friendbot.stellar.org'

export const NETWORK = {
  horizonUrl,
  networkPassphrase,
  networkName,
  friendbotUrl,
} as const

/** Testnet explorer links used for transaction/account deep-links. */
export const EXPLORER = {
  baseUrl: 'https://stellar.expert/explorer/testnet',
  tx: (hash: string) => `${EXPLORER.baseUrl}/tx/${hash}`,
  account: (address: string) => `${EXPLORER.baseUrl}/account/${address}`,
} as const

/** Convenience check used when verifying what network the wallet is on. */
export function isTestnet(passphrase: string): boolean {
  return passphrase === Networks.TESTNET
}
