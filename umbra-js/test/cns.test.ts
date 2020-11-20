import chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import { Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';
import * as cns from '../build/utils/cns';
import constants from '../build/constants.json';

import type { Web3Version0Provider } from '@unstoppabledomains/resolution/build/types';
import { ExternalProvider } from '../src/types';

const { CNS_REGISTRY } = constants;
const { expect } = chai;

const resolution = new Resolution({
  blockchain: {
    cns: {
      provider: Eip1993Factories.fromWeb3Version0Provider(
        (provider as unknown) as Web3Version0Provider
      ),
      registry: CNS_REGISTRY,
    },
  },
});

// Truth parameters to test against
const name = 'mvlabat.crypto';
const nameSignature =
  '0x053a0fc756e799d2301347e123a440c1cb2830ed5e4ba9a8408f7eb0750933b763d1958b722ecb10dd4f63002397bbf037f6eef5fe9814ddfffc3d704c6a1cd41b';
const namePublicKey =
  '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e';

describe('СNS functions', () => {
  it('computes the namehash of a CNS domain', () => {
    const hash = cns.namehash(name, resolution);
    expect(hash).to.equal('0x4d5647e26ad24fd1087ddd2dc2d980f6f231d4f5694f63b321ec119848a460ba');
  });

  it('gets the signature associated with a CNS address', async function () {
    this.timeout(10000);
    const signature = await cns.getSignature(name, resolution);
    expect(signature).to.equal(nameSignature);
  });

  it('gets the public key associated with a CNS address', async function () {
    this.timeout(10000);
    const publicKey = await cns.getPublicKey(name, resolution);
    expect(publicKey).to.equal(namePublicKey);
  });

  it.skip('sets the signature', async () => {
    // TODO currently fails since provider account is not the mvlabat.crypto account, so
    // to implement this test we need to have the ganache account register an CNS domain
    const dummySignature = '0x123';
    await cns.setSignature(
      name,
      (provider as unknown) as ExternalProvider,
      resolution,
      dummySignature
    );
    const signature = await cns.getSignature(name, resolution);
    expect(signature).to.equal(dummySignature);
  });
});
