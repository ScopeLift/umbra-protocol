import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import { Web3Provider } from '@ethersproject/providers';
import { default as Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';

import * as cns from '../src/utils/cns';
import * as constants from '../src/constants.json';

import { ExternalProvider } from '../src/types';

const { CNS_REGISTRY } = constants;
const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);

const resolution = new Resolution({
  blockchain: {
    cns: {
      provider: Eip1993Factories.fromEthersProvider(ethersProvider),
      registry: CNS_REGISTRY,
    },
  },
});

// Truth parameters to test against
const name = 'mvlabat.crypto';
const nameSpendingPublicKey =
  '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e';
const nameViewingPublicKey =
  '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e';

describe('СNS functions', () => {
  it('computes the namehash of a CNS domain', () => {
    const hash = cns.namehash(name, resolution);
    expect(hash).to.equal('0x4d5647e26ad24fd1087ddd2dc2d980f6f231d4f5694f63b321ec119848a460ba');
  });

  it.skip('gets the public keys associated with a CNS address', async function () {
    this.timeout(10000);
    nameSpendingPublicKey; // silence errors
    nameViewingPublicKey; // silence errors
    throw new Error('Test not implemented');
    // const publicKeys = await cns.getPublicKeys(name, resolution);
    // expect(publicKeys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    // expect(publicKeys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });

  it.skip('sets the public keys', async () => {
    // TODO currently would fail since provider account is not the mvlabat.crypto account, so
    // to implement this test we need to have the ganache account register an CNS domain
  });
});
