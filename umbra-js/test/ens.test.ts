import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import { Web3Provider } from '@ethersproject/providers';
import * as ens from '../src/utils/ens';
import { ExternalProvider } from '../src/types';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);

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

  it('namehash throws when given a bad ENS suffix', async () => {
    const badName = 'myname.com';
    const errorMsg = `Name does not end with supported suffix: ${ens.supportedEnsDomains.join(', ')}`;
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

  it.skip('sets the public keys', async () => {
    // TODO currently would fail since provider account is not the msolomon.eth account, so
    // to implement this test we need to have the ganache account register an ENS domain
  });
});
