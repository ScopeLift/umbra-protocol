import '@nomiclabs/hardhat-ethers';
import * as chai from 'chai';
import { ethers } from 'hardhat';
import { DomainService } from '../src/classes/DomainService';
import { expectRejection, registerCnsName, registerEnsName } from './utils';

const { expect } = chai;
const ethersProvider = ethers.provider;

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
    name: 'udtestdev-msolomon.crypto',
    nameSpendingPublicKey:
      '0x0445e52d17b8c845d0dcb490ba6701e3f31d24828768aa77e613b7f1be712b383240c1bf8f278ebb160c77a3d1cc84b200459ded5095ee50551c339b158a3a00e1',
    nameViewingPublicKey:
      '0x041190b7e2b61b8872c9ea5fff14770e7d3e78900282371b09ee9f2b8c4016b9967b5e9ee9e1e0bef30052e806321f0685a3ad69e2233be6813b81a5d293feea76',
  },
};

describe('DomainService class', () => {
  let domainService: DomainService;
  before(async () => {
    await ethersProvider.getNetwork();
    ethersProvider.network.name = 'rinkeby'; // don't do this in prod, just for testing purposes so we use Rinkeby registry, not localhost
    domainService = new DomainService(ethersProvider);
  });

  describe('ENS', () => {
    it('computes the namehash of an ENS domain', () => {
      const hash = domainService.namehash(params.ens.name);
      expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
    });

    it('sets the public keys for an ENS address', async () => {
      // First we get public keys, which should fail
      const user = (await ethers.getSigners())[0];
      const ensLabel = 'umbrajs-test-name2';
      const ensName = `${ensLabel}.eth`;
      const errorMsg = `Name ${ensName} is not registered or user has not set their resolver`;
      await expectRejection(domainService.getPublicKeys(ensName), errorMsg);

      // Register name
      await registerEnsName(ensLabel, user);

      // Set the public keys
      await domainService.setPublicKeys(ensName, params.ens.nameSpendingPublicKey, params.ens.nameViewingPublicKey);

      // Retrieve them and verify they match expected values
      const publicKeys = await domainService.getPublicKeys(ensName);
      expect(publicKeys.spendingPublicKey).to.equal(params.ens.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.ens.nameViewingPublicKey);
    });

    it('gets the public keys associated with an ENS address', async () => {
      const publicKeys = await domainService.getPublicKeys(params.ens.name);
      expect(publicKeys.spendingPublicKey).to.equal(params.ens.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.ens.nameViewingPublicKey);
    });
  });

  describe('CNS', () => {
    it('computes the namehash of a CNS domain', () => {
      const hash = domainService.namehash(params.cns.name);
      expect(hash).to.equal('0xb523f834041c2aa484ca5f422d13e91a72ac459f925e26de7d63381bc26795f6');
    });

    it('sets the public keys for a CNS address', async () => {
      // First we get public keys, which should fail
      const user = (await ethers.getSigners())[0];
      const cnsLabel = 'umbrajs-test-name2';
      const cnsName = `udtestdev-${cnsLabel}.crypto`;
      const errorMsg = `Domain ${cnsName} is not registered`;
      await expectRejection(domainService.getPublicKeys(cnsName), errorMsg);

      // Register name
      await registerCnsName(cnsLabel, user);

      // Set the public keys
      await domainService.setPublicKeys(cnsName, params.cns.nameSpendingPublicKey, params.cns.nameViewingPublicKey);

      // Retrieve them and verify they match expected values
      const publicKeys = await domainService.getPublicKeys(cnsName);
      expect(publicKeys.spendingPublicKey).to.equal(params.cns.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.cns.nameViewingPublicKey);
    });

    it('gets the public keys associated with a CNS address', async () => {
      const publicKeys = await domainService.getPublicKeys(params.cns.name);
      expect(publicKeys.spendingPublicKey).to.equal(params.cns.nameSpendingPublicKey);
      expect(publicKeys.viewingPublicKey).to.equal(params.cns.nameViewingPublicKey);
    });
  });
});
