import { ethers } from 'hardhat';
import { getDefaultProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import * as utils from '../src/utils/utils';
import type { EthersProvider } from '../src/types';
import { expectRejection } from './utils';

const ethersProvider = ethers.provider;

// Public key that derives to the address msolomon.eth resolves to
const publicKey = '0x04df3d784d6d1e55fabf44b7021cf17c00a6cccc53fea00d241952ac2eebc46dc674c91e60ccd97576c1ba2a21beed21f7b02aee089f2eeec357ffd349488a7cee'; // prettier-ignore

// Public keys generated from a signature by the address msolomon.eth resolves to
const pubKeysWallet = { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
const pubKeysUmbra = {
  spendingPublicKey: '0x04f04b29a6ef7e7da9a2f2767c574c587b1d048c3cb0a7b29955175a35d8a2b345ebb852237b955d81e32a8c94ebd71704ccb4c8ab5b3ad5866543ca91ede825ef', // prettier-ignore
  viewingPublicKey: '0x04cc7d4c34d8f78e7bd65a04bea64bc21589073c139658040b4a20cc58991da385f0706d354b3aace6d1184e1e49ce2201dc884a3eb2b7f03a2d3a2bfbab10bd7d', // prettier-ignore
};

// Define public key that is not on the curve. This point was generated from a valid public key ending in
// `83b3` and we took this off the curve by changing the final digits to `83b4`
const badPublicKey = '0x04059f2fa86c55b95a8db142a6a5490c43e242d03ed8c0bd58437a98709dc9e18b3bddafce903ea49a44b78d57626448c83f8649d3ec4e7c72d8777823f49583b4'; // prettier-ignore

describe('Utilities', () => {
  describe('Helpers', () => {
    it('recovers public keys from transactions', async () => {
      const hash = '0x45fa716ee2d484ac67ef787625908072d851bfa369db40567e16ee08a7fdefd2';
      expect(await utils.recoverPublicKeyFromTransaction(hash, ethersProvider)).to.equal(publicKey);
    });
  });

  describe('Recipient identifier lookups', () => {
    before(async () => {
      await ethersProvider.getNetwork();
      ethersProvider.network.name = 'rinkeby'; // don't do this in prod, just for testing purposes so we use Rinkeby registry, not localhost
    });

    // --- Public key or transaction hash ---
    it('looks up recipients by public key', async () => {
      const keys = await utils.lookupRecipient(publicKey, ethersProvider, { supportPubKey: true });
      expect(keys.spendingPublicKey).to.equal(pubKeysWallet.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysWallet.viewingPublicKey);
    });

    it('throws when looking up recipients by public key without explicitly allowing it', async () => {
      const errorMsg = `invalid address (argument="address", value="${publicKey}", code=INVALID_ARGUMENT, version=address/5.1.0)`; // prettier-ignore
      await expectRejection(utils.lookupRecipient(publicKey, ethersProvider), errorMsg);
    });

    it('throws when given a public key not on the curve', async () => {
      const errorMsg = 'Point is not on elliptic curve';
      await expectRejection(utils.lookupRecipient(badPublicKey, ethersProvider, { supportPubKey: true }), errorMsg);
    });

    it('looks up recipients by transaction hash', async () => {
      const hash = '0x45fa716ee2d484ac67ef787625908072d851bfa369db40567e16ee08a7fdefd2';
      const keys = await utils.lookupRecipient(hash, ethersProvider, { supportTxHash: true });
      expect(keys.spendingPublicKey).to.equal(pubKeysWallet.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysWallet.viewingPublicKey);
    });

    it('throws when looking up recipients by transaction hash without explicitly allowing it', async () => {
      const hash = '0x45fa716ee2d484ac67ef787625908072d851bfa369db40567e16ee08a7fdefd2';
      const errorMsg = `invalid address (argument="address", value="${hash}", code=INVALID_ARGUMENT, version=address/5.1.0)`; // prettier-ignore
      await expectRejection(utils.lookupRecipient(hash, ethersProvider), errorMsg);
    });

    // --- Address, advanced mode on (i.e. don't use the StealthKeyRegistry) ---
    it('looks up recipients by address, advanced mode on', async () => {
      const address = '0x60A5dcB2fC804874883b797f37CbF1b0582ac2dD';
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider;
      const keys = await utils.lookupRecipient(address, ethersProvider, { advanced: true });
      expect(keys.spendingPublicKey).to.equal(pubKeysWallet.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysWallet.viewingPublicKey);
    });

    it('looks up recipients by ENS, advanced mode on', async () => {
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider;
      const keys = await utils.lookupRecipient('msolomon.eth', ethersProvider, { advanced: true });
      expect(keys.spendingPublicKey).to.equal(pubKeysWallet.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysWallet.viewingPublicKey);
    });

    it('looks up recipients by CNS, advanced mode on', async () => {
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider;
      const keys = await utils.lookupRecipient('udtestdev-msolomon.crypto', ethersProvider, { advanced: true });
      expect(keys.spendingPublicKey).to.equal(pubKeysWallet.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysWallet.viewingPublicKey);
    });

    // --- Address, advanced mode off (i.e. use the StealthKeyRegistry) ---
    it('looks up recipients by address, advanced mode off', async () => {
      const address = '0x60A5dcB2fC804874883b797f37CbF1b0582ac2dD';
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider; // otherwise throws with unsupported network since we're on localhost
      const keys = await utils.lookupRecipient(address, ethersProvider);
      expect(keys.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);

      // Same test, but with advanced mode off explicitly specified
      const keys2 = await utils.lookupRecipient(address, ethersProvider, { advanced: false });
      expect(keys2.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys2.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);
    });

    it('looks up recipients by ENS, advanced mode off', async () => {
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider;
      const keys = await utils.lookupRecipient('msolomon.eth', ethersProvider);
      // These values are set on the Rinkeby resolver
      expect(keys.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);

      // Same test, but with advanced mode off explicitly specified
      const keys2 = await utils.lookupRecipient('msolomon.eth', ethersProvider, { advanced: false });
      expect(keys2.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys2.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);
    });

    it('looks up recipients by CNS, advanced mode off', async () => {
      const keys = await utils.lookupRecipient('udtestdev-msolomon.crypto', ethersProvider);
      // These values are set on the Rinkeby resolver
      expect(keys.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);

      // Same test, but with advanced mode off explicitly specified
      const keys2 = await utils.lookupRecipient('udtestdev-msolomon.crypto', ethersProvider, { advanced: false });
      expect(keys2.spendingPublicKey).to.equal(pubKeysUmbra.spendingPublicKey);
      expect(keys2.viewingPublicKey).to.equal(pubKeysUmbra.viewingPublicKey);
    });
  });

  describe('Input validation', () => {
    // ts-expect-error statements needed throughout this section to bypass TypeScript checks that would stop this file
    // from being compiled/ran

    it('throws when recoverPublicKeyFromTransaction is given a bad transaction hash', async () => {
      const errorMsg = 'Invalid transaction hash provided';
      await expectRejection(utils.recoverPublicKeyFromTransaction('q', ethersProvider), errorMsg);
      // @ts-expect-error
      await expectRejection(utils.recoverPublicKeyFromTransaction(1, ethersProvider), errorMsg);
    });

    it('throws when recoverPublicKeyFromTransaction is given a transaction that does not exist', async () => {
      const mainnetTxHash = '0xce4209b4cf80e249502d770dd7f2b19ceb22bbb2cfb49500fe0a32d95b127e81';
      await expectRejection(
        utils.recoverPublicKeyFromTransaction(mainnetTxHash, ethersProvider),
        'Transaction not found. Are the provider and transaction hash on the same network?'
      );
    });

    it('throws when looking up an address that has not sent a transaction', async () => {
      const address = '0x0000000000000000000000000000000000000002';
      const ethersProvider = getDefaultProvider('rinkeby') as EthersProvider; // otherwise throws with unsupported network since we're on localhost
      const errorMsg = `Address ${address} has not registered stealth keys. Please ask them to setup their Umbra account`;
      await expectRejection(utils.lookupRecipient(address, ethersProvider), errorMsg);
    });

    it('throws when provided an invalid identifier', async () => {
      const id = '123';
      const errMsg = 'invalid address (argument="address", value="123", code=INVALID_ARGUMENT, version=address/5.1.0)';
      await expectRejection(utils.lookupRecipient(id, ethersProvider), errMsg);
    });
  });
});
