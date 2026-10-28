import { toError } from '../src/utils/errors';

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
