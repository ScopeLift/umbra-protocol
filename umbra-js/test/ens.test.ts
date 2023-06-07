import '@nomiclabs/hardhat-ethers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as ens from '../src/utils/ens';
import { expectRejection } from './utils';
const ethersProvider = ethers.provider;

// Truth parameters to test against
const name = 'msolomon.eth';
const nameSpendingPublicKey =
  '0x04f04b29a6ef7e7da9a2f2767c574c587b1d048c3cb0a7b29955175a35d8a2b345ebb852237b955d81e32a8c94ebd71704ccb4c8ab5b3ad5866543ca91ede825ef';
const nameViewingPublicKey =
  '0x04cc7d4c34d8f78e7bd65a04bea64bc21589073c139658040b4a20cc58991da385f0706d354b3aace6d1184e1e49ce2201dc884a3eb2b7f03a2d3a2bfbab10bd7d';

describe('ENS functions', () => {
  it('throws when namehash is not given a string', () => {
    // @ts-expect-error
    expect(() => ens.namehash(123)).to.throw('Name must be a string');
  });

  it('computes the namehash of an ENS domain', () => {
    const hash = ens.namehash('msolomon.eth');
    expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
  });

  // The below tests are outdated and from when we set stealth keys directly on the ENS resolver.
  // We still have logic for this legacy logic in the frontend, so these are skipped instead of
  // deleted in case they are useful as a reference.
  it.skip('gets the public keys associated with an ENS address', async () => {
    const publicKeys = await ens.getPublicKeys(name, ethersProvider);
    expect(publicKeys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    expect(publicKeys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });

  it.skip('throws when the user has not set their resolver', async () => {
    // Arbitrary name that is not registered on Sepolia and therefore has no resolver set. If this test starts failing,
    // a likely culprit is that this name is now registered
    const unsetEnsName = 'superRandomQwertyHelloWhyWouldYouRegisterThis.eth';
    const errorMsg = `Name ${unsetEnsName} is not registered or user has not set their resolver`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });

  it.skip('throws when the user has a resolver that does not support stealth keys', async () => {
    // Arbitrary name that is registered on Sepolia and has set a resolver, but has a resolver that does not support
    // getting and setting stealth keys. If this test starts failing, a likely culprit is that this user has changed
    // to a supported resolver or the name registration has expired
    const unsetEnsName = 'abc.eth';
    const errorMsg = `The configured resolver for ${unsetEnsName} does not support stealth keys. Please ask them to setup their Umbra account`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });

  it.skip('throws when the user has not set their stealth keys', async () => {
    // Arbitrary name that is registered on Sepolia and has set a supported resolver, but has not set their stealth
    // keys. If this test starts failing, a likely culprit is that this user has set their stealth keys or the name
    // registration has expired
    const unsetEnsName = 'unsetStealthKeys.eth';
    const errorMsg = `Public keys not found for ${unsetEnsName}. Please ask them to setup their Umbra account`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });
});
