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
