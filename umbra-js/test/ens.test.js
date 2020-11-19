const { provider } = require('@openzeppelin/test-environment');
const chai = require('chai');
const ens = require('../src//utils/ens');

const { expect } = chai;

// Truth parameters to test against
const name = 'msolomon.eth';
const nameSignature =
  '0x833b3846cf69f8667db746624661f7b5d85c131be9b9844c8f52d3d056fb81137fff198ad9eac9f63fb7469ef5d844737dedf27e75653d1b133554777f7384bd1b';
const namePublicKey =
  '0x0483393469b6042c8ab2626258b95031edc4b4fa6ed637a81f23861e2e28901bbe20fcdae2dd56aa1998e8beb3a7537a5927f95c0456fad9694e042e9cce67d607';
const nameBytecode = ''; // currently not set

describe('ENS functions', () => {
  it('computes the namehash of an ENS domain', () => {
    // const norm = e
    const hash = ens.namehash('msolomon.eth');
    expect(hash).to.equal('0xbe0b801f52a20451e2845cf346b7c8de65f4beca0ebba17c14ce601de7bbc7fb');
  });

  it('gets the signature associated with an ENS address', async () => {
    const signature = await ens.getSignature(name, provider);
    expect(signature).to.equal(nameSignature);
  });

  it('gets the public key associated with an ENS address', async () => {
    const publicKey = await ens.getPublicKey(name, provider);
    expect(publicKey).to.equal(namePublicKey);
  });

  it('gets the bytecode associated with an ENS address', async () => {
    const bytecode = await ens.getBytecode(name, provider);
    expect(bytecode).to.equal(nameBytecode);
  });

  it.skip('sets the signature', async () => {
    // TODO currently fails since provider account is not the msolomon.eth account, so
    // to implement this test we need to have the ganache account register an ENS domain
    const dummySignature = '0x123';
    await ens.setSignature(name, provider, dummySignature);
    const signature = await ens.getSignature(name, provider);
    expect(signature).to.equal(dummySignature);
  });

  it.skip('sets the bytecode', async () => {
    // TODO same as above test
    const dummyBytecode = '0x456';
    await ens.setBytecode(name, provider, dummyBytecode);
    const bytecode = await ens.setBytecode(name, provider);
    expect(bytecode).to.equal(dummyBytecode);
  });
});
