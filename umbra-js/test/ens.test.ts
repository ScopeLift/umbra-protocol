import '@nomiclabs/hardhat-ethers';
import * as chai from 'chai';
import { ethers } from 'hardhat';
import * as ens from '../src/utils/ens';
import { expectRejection, registerEnsName } from './utils';

const { expect } = chai;
const ethersProvider = ethers.provider;

// Truth parameters to test against
const name = 'msolomon.eth';
const nameSpendingPublicKey =
  '0x0445e52d17b8c845d0dcb490ba6701e3f31d24828768aa77e613b7f1be712b383240c1bf8f278ebb160c77a3d1cc84b200459ded5095ee50551c339b158a3a00e1';
const nameViewingPublicKey =
  '0x041190b7e2b61b8872c9ea5fff14770e7d3e78900282371b09ee9f2b8c4016b9967b5e9ee9e1e0bef30052e806321f0685a3ad69e2233be6813b81a5d293feea76';

describe('ENS functions', () => {
  it('properly identifies ENS domains', async () => {
    ens.supportedEnsDomains.forEach((suffix) => {
      // example suffixes: .eth, .xyz, etc.
      expect(ens.isEnsDomain(`test${suffix}`)).to.be.true;
    });
  });

  it('isCnsDomain returns false for empty ENS domains', () => {
    expect(ens.isEnsDomain('')).to.be.false;
  });

  it('throws when namehash is not given a string', () => {
    // @ts-expect-error
    expect(() => ens.namehash(123)).to.throw('Name must be a string');
  });

  it('throws when namehash is given a bad ENS suffix', async () => {
    const badName = 'myname.com';
    const errorMsg = `Name ${badName} does not end with supported suffix: ${ens.supportedEnsDomains.join(', ')}`;
    expect(() => ens.namehash(badName)).to.throw(errorMsg);
  });

  it('computes the namehash of an ENS domain', () => {
    const hash = ens.namehash('msolomon.eth');
    expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
  });

  it('gets the public keys associated with an ENS address', async () => {
    const publicKeys = await ens.getPublicKeys(name, ethersProvider);
    expect(publicKeys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    expect(publicKeys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });

  it('throws when the user has not set their resolver', async () => {
    // Arbitrary name that is not registered on Rinkeby and therefore has no resolver set. If this test starts failing,
    // a likely culprit is that this name is now registered
    const unsetEnsName = 'superRandomQwertyHelloWhyWouldYouRegisterThis.eth';
    const errorMsg = `Name ${unsetEnsName} is not registered or user has not set their resolver`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });

  it('throws when the user has a resolver that does not support stealth keys', async () => {
    // Arbitrary name that is registered on Rinkeby and has set a resolver, but has a resolver that does not support
    // getting and setting stealth keys. If this test starts failing, a likely culprit is that this user has changed
    // to a supported resolver or the name registration has expired
    const unsetEnsName = 'abc.eth';
    const errorMsg = `The configured resolver for ${unsetEnsName} does not support stealth keys. Please ask them to setup their Umbra account`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });

  it('throws when the user has not set their stealth keys', async () => {
    // Arbitrary name that is registered on Rinkeby and has set a supported resolver, but has not set their stealth
    // keys. If this test starts failing, a likely culprit is that this user has set their stealth keys or the name
    // registration has expired
    const unsetEnsName = 'unsetStealthKeys.eth';
    const errorMsg = `Public keys not found for ${unsetEnsName}. Please ask them to setup their Umbra account`;
    await expectRejection(ens.getPublicKeys(unsetEnsName, ethersProvider), errorMsg);
  });

  it('sets the public keys when resolver supports stealth keys', async () => {
    // First we get public keys, which should fail
    const user = (await ethers.getSigners())[0];
    const ensLabel = 'umbrajs-test-name1';
    const ensName = `${ensLabel}.eth`;
    const errorMsg = `Name ${ensName} is not registered or user has not set their resolver`;
    await expectRejection(ens.getPublicKeys(ensName, ethersProvider), errorMsg);

    // Register name
    await registerEnsName(ensLabel, user);

    // Set the public keys
    await ens.setPublicKeys(ensName, nameSpendingPublicKey, nameViewingPublicKey, ethersProvider);

    // Retrieve them and verify they match expected values
    const publicKeys = await ens.getPublicKeys(ensName, ethersProvider);
    expect(publicKeys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    expect(publicKeys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });
});
