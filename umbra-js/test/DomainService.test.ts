import * as chai from 'chai';
import { ethers } from 'ethers';
import { provider } from '@openzeppelin/test-environment';

import { DomainService } from '../src/classes/DomainService';
import type { ExternalProvider } from '../src/types';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
const domainService = new DomainService(ethersProvider);

// Truth parameters to test against (on Rinkeby)
const params = {
  ens: {
    name: 'msolomon.eth',
    nameSpendingPublicKey:
      '0x0445e52d17b8c845d0dcb490ba6701e3f31d24828768aa77e613b7f1be712b383240c1bf8f278ebb160c77a3d1cc84b200459ded5095ee50551c339b158a3a00e1',
    nameViewingPublicKey:
      '0x041190b7e2b61b8872c9ea5fff14770e7d3e78900282371b09ee9f2b8c4016b9967b5e9ee9e1e0bef30052e806321f0685a3ad69e2233be6813b81a5d293feea76',
  },
  cns: {
    name: 'mvlabat.crypto',
    nameSpendingPublicKey:
      '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e',
    nameViewingPublicKey:
      '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e',
  },
};

describe('DomainService class', () => {
  describe('ENS', () => {
    it('computes the namehash of an ENS domain', () => {
      const hash = domainService.namehash(params.ens.name);
      expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
    });

    it.skip('sets the public keys for an ENS address', async function () {
      this.timeout(10000);
      // TODO
    });

    it('gets the public keys associated with an ENS address', async function () {
      this.timeout(10000);
      const publicKeys = await domainService.getPublicKeys(params.ens.name);
      expect(publicKeys.spendingPublicKey).to.equal(params.ens.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.ens.nameViewingPublicKey);
    });
  });

  describe('CNS', () => {
    it('computes the namehash of a CNS domain', () => {
      const hash = domainService.namehash(params.cns.name);
      expect(hash).to.equal('0x4d5647e26ad24fd1087ddd2dc2d980f6f231d4f5694f63b321ec119848a460ba');
    });

    it.skip('sets the public keys for a CNS address', async function () {
      this.timeout(10000);
      // TODO
    });

    it('gets the public keys associated with a CNS address', async function () {
      this.timeout(10000);
      const publicKeys = await domainService.getPublicKeys(params.cns.name);
      expect(publicKeys.spendingPublicKey).to.equal(params.cns.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.cns.nameViewingPublicKey);
    });
  });
});
