import {
  NetworkError,
  NotFoundError,
  TransactionFailedError,
} from '@stellar/stellar-sdk'

/**
 * Central error handling.
 *
 * Every async wallet/network call in the app goes through try/catch and
 * converts whatever it caught into a `UserFacingError` (or uses
 * `toUserMessage`) so components only ever render friendly, specific text —
 * never raw exception dumps.
 */

/** An error whose `message` is already safe to show to the user verbatim. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

/** Raised when the account does not exist on this network (not funded yet). */
export class AccountNotFoundError extends UserFacingError {
  constructor() {
    super(
      'This account does not exist on the Stellar Testnet yet. Fund it with testnet XLM using the Friendbot faucet below, then refresh.',
    )
    this.name = 'AccountNotFoundError'
  }
}

/** Friendly copy for common Horizon operation-level result codes. */
const OPERATION_RESULT_MESSAGES: Record<string, string> = {
  op_underfunded:
    'The sending account does not have enough XLM to cover the payment plus the transaction fee.',
  op_no_destination:
    'The recipient account does not exist yet. New Stellar accounts need a 1 XLM minimum balance, so fund the address with Friendbot first.',
  op_low_reserve:
    'The sending account cannot spend below its minimum balance reserve. Send a smaller amount.',
  op_under_destination_min:
    'The recipient would fall below its minimum balance reserve. Send a larger amount.',
  op_src_not_authorized:
    'The sending account is not authorized to make this payment.',
  op_bad_auth: 'The transaction authorization failed. Try again.',
}

/** Friendly copy for common transaction-level Horizon result codes. */
const TRANSACTION_RESULT_MESSAGES: Record<string, string> = {
  tx_bad_seq:
    'The account sequence number is out of date. Refresh the page and try again.',
  tx_insufficient_fee:
    'The network rejected the transaction fee. Refresh and try again.',
  tx_failed: 'The transaction was rejected by the network.',
  tx_too_late: 'The transaction expired before it was submitted. Try again.',
  tx_too_early:
    'The transaction was submitted too early relative to the network time. Try again.',
}

/**
 * Convert any thrown value into a human-friendly message.
 *
 * Order matters: check the most specific SDK error classes first, then fall
 * back to generic buckets so raw error text never leaks into the UI.
 */
export function toUserMessage(err: unknown): string {
  if (err instanceof UserFacingError) {
    return err.message
  }

  // Horizon rejected a submitted transaction — map the reported result
  // codes to plain language (e.g. op_underfunded => insufficient balance).
  if (err instanceof TransactionFailedError) {
    const { transaction, operations } = err.getResultCodes()
    const operationCode = operations?.[0]
    if (operationCode && OPERATION_RESULT_MESSAGES[operationCode]) {
      return OPERATION_RESULT_MESSAGES[operationCode]!
    }
    if (transaction && TRANSACTION_RESULT_MESSAGES[transaction]) {
      return TRANSACTION_RESULT_MESSAGES[transaction]!
    }
    return 'The network rejected the transaction. Check the recipient and amount, then try again.'
  }

  // A resource (account, transaction...) could not be found on Horizon.
  if (err instanceof NotFoundError) {
    return 'That account or transaction could not be found on the Stellar Testnet.'
  }

  // Any other Horizon communication failure (timeouts, 5xx, rate limits...).
  if (err instanceof NetworkError) {
    return 'Could not reach the Stellar Testnet. Check your internet connection and try again.'
  }

  // fetch() rejects with TypeError on network-level failures.
  if (err instanceof TypeError) {
    return 'Network request failed. Check your internet connection and try again.'
  }

  return 'Something went wrong. Please try again.'
}
