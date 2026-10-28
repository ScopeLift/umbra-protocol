import { isUserRejection, toError } from '../src/utils/errors';
import { Logger } from '../src/utils/ethers';

describe('toError', () => {
  it('returns Error instances unchanged', () => {
    const error = new TypeError('Bad type');
    expect(toError(error)).toBe(error);
  });

  it('uses a string as the message', () => {
    expect(toError('Something failed').message).toBe('Something failed');
  });

  it('keeps the message of a JSON-RPC error object', () => {
    expect(toError({ code: -32603, message: 'Internal JSON-RPC error.' }).message).toBe('Internal JSON-RPC error.');
  });

  it('returns an empty message for an object without a string message', () => {
    expect(toError({ code: 4001 }).message).toBe('');
    expect(toError({ message: 42 }).message).toBe('');
  });

  it('returns an empty message for null and undefined', () => {
    expect(toError(null).message).toBe('');
    expect(toError(undefined).message).toBe('');
  });
});

describe('isUserRejection', () => {
  const logger = new Logger('providers/5.8.0');

  it('recognizes an ethers ACTION_REJECTED error', () => {
    const error = logger.makeError('user rejected transaction', Logger.errors.ACTION_REJECTED, {
      action: 'sendTransaction',
    });
    expect(isUserRejection(error)).toBe(true);
  });

  it('recognizes an EIP-1193 rejection', () => {
    expect(isUserRejection({ code: 4001, message: 'User rejected the request.' })).toBe(true);
  });

  it('recognizes an EIP-1193 rejection nested in another error', () => {
    const error = Object.assign(new Error('Request failed'), { error: { code: 4001, message: 'User denied.' } });
    expect(isUserRejection(error)).toBe(true);
  });

  it('recognizes a rejection with another code by its message', () => {
    expect(isUserRejection({ code: 5000, message: 'User rejected.' })).toBe(true);
    expect(isUserRejection(new Error('MetaMask Tx Signature: User denied transaction signature.'))).toBe(true);
  });

  it('does not match other errors', () => {
    const error = logger.makeError(
      'insufficient funds for intrinsic transaction cost',
      Logger.errors.INSUFFICIENT_FUNDS
    );
    expect(isUserRejection(error)).toBe(false);
    expect(isUserRejection({ code: -32603, message: 'Internal JSON-RPC error.' })).toBe(false);
    expect(isUserRejection('User rejected the request.')).toBe(false);
    expect(isUserRejection(null)).toBe(false);
  });
});
