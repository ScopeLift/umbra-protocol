import * as chai from 'chai';
import { ethers } from 'hardhat';
import { default as Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';
import * as cns from '../src/utils/cns';
import { expectRejection } from './utils';

const { expect } = chai;
const ethersProvider = ethers.provider;

const resolution = new Resolution({
  blockchain: {
    cns: {
      provider: Eip1993Factories.fromEthersProvider(ethersProvider),
      network: 'rinkeby',
    },
  },
});

// Truth parameters to test against
const name = 'udtestdev-msolomon.crypto';
const nameSpendingPublicKey =
  '0x0445e52d17b8c845d0dcb490ba6701e3f31d24828768aa77e613b7f1be712b383240c1bf8f278ebb160c77a3d1cc84b200459ded5095ee50551c339b158a3a00e1';
const nameViewingPublicKey =
  '0x041190b7e2b61b8872c9ea5fff14770e7d3e78900282371b09ee9f2b8c4016b9967b5e9ee9e1e0bef30052e806321f0685a3ad69e2233be6813b81a5d293feea76';

describe('СNS functions', () => {
  it('properly identifies CNS domains', () => {
    cns.supportedCnsDomains.forEach((suffix) => {
      // example suffixes: .crypto, .zil, etc.
      expect(cns.isCnsDomain(`test${suffix}`)).to.be.true;
    });
  });

  it('isCnsDomain returns false for empty CNS domains', () => {
    expect(cns.isCnsDomain('')).to.be.false;
  });

  it('throws when namehash is not given a string', () => {
    // @ts-expect-error
    expect(() => cns.namehash(123, resolution)).to.throw('Name must be a string');
  });

  it('throws when namehash is given a bad CNS suffix', () => {
    const badName = 'myname.com';
    const errorMsg = `Name ${badName} does not end with supported suffix: ${cns.supportedCnsDomains.join(', ')}`;
    expect(() => cns.namehash(badName, resolution)).to.throw(errorMsg);
  });

  it('computes the namehash of a CNS domain', () => {
    const hash = cns.namehash(name, resolution);
    expect(hash).to.equal('0xb523f834041c2aa484ca5f422d13e91a72ac459f925e26de7d63381bc26795f6');
  });

  it('gets the public keys associated with a CNS address', async () => {
    const publicKeys = await cns.getPublicKeys(name, ethersProvider, resolution);
    expect(publicKeys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    expect(publicKeys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });

  it('throws when the user has not set their stealth keys', async () => {
    // Arbitrary name that is registered but does not have keys on Rinkeby. If this test starts failing, a likely
    // culprit is that this name now has set stealth keys
    const unsetCnsName = 'udtestdev--c38898.crypto';
    const errorMsg = `Public keys not found for ${unsetCnsName}. User must setup their Umbra account`;
    await expectRejection(cns.getPublicKeys(unsetCnsName, ethersProvider, resolution), errorMsg);
  });

  it.skip('sets the public keys', () => {
    // TODO currently would fail since provider account is not the udtestdev-msolomon.crypto account, so
    // to implement this test we need to have the ganache account register a CNS domain
  });
});
