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
      '0x04f04b29a6ef7e7da9a2f2767c574c587b1d048c3cb0a7b29955175a35d8a2b345ebb852237b955d81e32a8c94ebd71704ccb4c8ab5b3ad5866543ca91ede825ef',
    nameViewingPublicKey:
      '0x04cc7d4c34d8f78e7bd65a04bea64bc21589073c139658040b4a20cc58991da385f0706d354b3aace6d1184e1e49ce2201dc884a3eb2b7f03a2d3a2bfbab10bd7d',
  },
  cns: {
    name: 'udtestdev-msolomon.crypto',
    nameSpendingPublicKey:
      '0x04f04b29a6ef7e7da9a2f2767c574c587b1d048c3cb0a7b29955175a35d8a2b345ebb852237b955d81e32a8c94ebd71704ccb4c8ab5b3ad5866543ca91ede825ef',
    nameViewingPublicKey:
      '0x04cc7d4c34d8f78e7bd65a04bea64bc21589073c139658040b4a20cc58991da385f0706d354b3aace6d1184e1e49ce2201dc884a3eb2b7f03a2d3a2bfbab10bd7d',
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
