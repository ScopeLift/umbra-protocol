import * as chai from 'chai';
import * as utils from '../src/utils/utils';

const { expect } = chai;

utils; // silence warning
expect; // silence warning

describe('Utilities', () => {
  describe('Helpers', () => {
    it.skip('properly pads hex values', async () => {});
    it.skip('returns transaction hash of first transaction sent by an address', async () => {});
    it.skip('recovers public keys from transactions', async () => {});
  });

  describe('Recipient identifier lookups', () => {
    it.skip('looks up recipients by public key', async () => {});
    it.skip('looks up recipients by transaction hash', async () => {});
    it.skip('looks up recipients by address', async () => {});
    it.skip('looks up recipients by ENS', async () => {});
    it.skip('looks up recipients by CNS', async () => {});
  });
});
