const chai = require('chai');
const utils = require('../utils/utils');

const { expect } = chai;

const nameSignature = '0x833b3846cf69f8667db746624661f7b5d85c131be9b9844c8f52d3d056fb81137fff198ad9eac9f63fb7469ef5d844737dedf27e75653d1b133554777f7384bd1b';
const namePublicKey = '0x0483393469b6042c8ab2626258b95031edc4b4fa6ed637a81f23861e2e28901bbe20fcdae2dd56aa1998e8beb3a7537a5927f95c0456fad9694e042e9cce67d607';

describe('utils functions', () => {
  it('recovers the public key from a signature', async () => {
    const publicKey = await utils.getPublicKeyFromSignature(nameSignature);
    expect(publicKey).to.equal(namePublicKey);
  });
});
