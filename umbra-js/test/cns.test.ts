import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import { Web3Provider } from '@ethersproject/providers';
import { default as Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';
import { ExternalProvider } from '../src/types';
import * as cns from '../src/utils/cns';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);

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
  it('properly identifies CNS domains', async () => {
    cns.supportedCnsDomains.forEach((suffix) => {
      // example suffixes: .crypto, .zil, etc.
      expect(cns.isCnsDomain(`test${suffix}`)).to.be.true;
    });
  });

  it('namehash throws when given a bad CNS suffix', async () => {
    const badName = 'myname.com';
    const errorMsg = `Name does not end with supported suffix: ${cns.supportedCnsDomains.join(', ')}`;
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

  it.skip('sets the public keys', async () => {
    // TODO currently would fail since provider account is not the udtestdev-msolomon.crypto account, so
    // to implement this test we need to have the ganache account register a CNS domain
  });
});
