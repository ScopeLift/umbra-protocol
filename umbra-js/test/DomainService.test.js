const { provider } = require('@openzeppelin/test-environment');
const { Resolution, Eip1993Factories } = require('@unstoppabledomains/resolution');
const chai = require('chai');
const DomainService = require('../build/classes/DomainService');
const constants = require('../build/constants.json');

const { CNS_REGISTRY } = constants;
const { expect } = chai;

const resolution = new Resolution({
  blockchain: {
    cns: {
      provider: Eip1993Factories.fromWeb3Version0Provider(provider),
      registry: CNS_REGISTRY,
    },
  },
});
const domainService = new DomainService(provider, resolution);

// Truth parameters to test against
const ensName = 'msolomon.eth';
const ensNameSignature =
  '0x833b3846cf69f8667db746624661f7b5d85c131be9b9844c8f52d3d056fb81137fff198ad9eac9f63fb7469ef5d844737dedf27e75653d1b133554777f7384bd1b';
const ensNamePublicKey =
  '0x0483393469b6042c8ab2626258b95031edc4b4fa6ed637a81f23861e2e28901bbe20fcdae2dd56aa1998e8beb3a7537a5927f95c0456fad9694e042e9cce67d607';
const cnsName = 'mvlabat.crypto';
const cnsNameSignature =
  '0x053a0fc756e799d2301347e123a440c1cb2830ed5e4ba9a8408f7eb0750933b763d1958b722ecb10dd4f63002397bbf037f6eef5fe9814ddfffc3d704c6a1cd41b';
const cnsNamePublicKey =
  '0x0462049e7062b5105bc8cafe3bff97a3929cf9563a125f5fdf9f9b55ebf9e09219199aa2427fc96801d1f472323188b19002bc0521cdc4236fe33554d17c850f0e';

describe('DomainService class', () => {
  it('computes the namehash of an ENS domain', () => {
    const hash = domainService.namehash(ensName);
    expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
  });

  it('computes the namehash of a CNS domain', () => {
    const hash = domainService.namehash(cnsName);
    expect(hash).to.equal('0x4d5647e26ad24fd1087ddd2dc2d980f6f231d4f5694f63b321ec119848a460ba');
  });

  it('gets the signature associated with a ENS address', async function () {
    const signature = await domainService.getSignature(ensName);
    expect(signature).to.equal(ensNameSignature);
  });

  it('gets the signature associated with a CNS address', async function () {
    this.timeout(10000);
    const signature = await domainService.getSignature(cnsName);
    expect(signature).to.equal(cnsNameSignature);
  });

  it('gets the public key associated with a ENS address', async function () {
    this.timeout(10000);
    const publicKey = await domainService.getPublicKey(ensName);
    expect(publicKey).to.equal(ensNamePublicKey);
  });

  it('gets the public key associated with a CNS address', async function () {
    this.timeout(10000);
    const publicKey = await domainService.getPublicKey(cnsName);
    expect(publicKey).to.equal(cnsNamePublicKey);
  });
  0;
});
