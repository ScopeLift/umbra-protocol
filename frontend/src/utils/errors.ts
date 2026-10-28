/**
 * @notice Returns true if the value is a non-null object, so its properties can be read
 * @param value Value to check
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @notice Converts a thrown value or promise rejection reason to an Error
 * @dev Error instances are returned unchanged. Wallets and JSON-RPC providers often throw plain objects such as
 * `{ code, message }`, so their message is kept. Any other value becomes an Error with an empty message.
 * @param value Value that was thrown, or the reason a promise was rejected
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  if (isRecord(value) && typeof value.message === 'string') return new Error(value.message);
  return new Error();
}

/**
 * @notice Returns true if the value is the error from a user rejecting a request in their wallet, such as a
 * transaction or a signature request
 * @dev ethers v5 converts a rejection to an `ACTION_REJECTED` error only when the wallet's message contains "user
 * denied". Other wallets reject with the EIP-1193 code 4001, which ethers passes through unchanged, sometimes nested in
 * the error's `error` property. Some wallets use other codes, so the message is checked as a fallback.
 * @param value Value that was thrown, or the reason a promise was rejected
 */
export function isUserRejection(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.code === 'ACTION_REJECTED' || value.code === 4001) return true;
  if (isRecord(value.error) && value.error.code === 4001) return true;
  return typeof value.message === 'string' && /user (rejected|denied)/i.test(value.message);
}
