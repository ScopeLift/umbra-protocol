const { provider } = require('@openzeppelin/test-environment');
const chai = require('chai');
const ens = require('../utils/ens');

const { expect } = chai;

// Truth parameters to test against
const name = 'msolomon.eth';
const nameSignature = '0xe1c9e3302fa20eae15f2416280520dd1a1cc812b98a49fb5e910cd97961cbeb17f54e4cec77bac4b194e1058085175b77c046e3b53c0fd0a87fe24c9dbcf3c691b';
const namePublicKey = '0x04df3d784d6d1e55fabf44b7021cf17c00a6cccc53fea00d241952ac2eebc46dc674c91e60ccd97576c1ba2a21beed21f7b02aee089f2eeec357ffd349488a7cee';
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

  it('recovers the public key from a signature', async () => {
    const publicKey = await ens.getPublicKeyFromSignature(nameSignature);
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
