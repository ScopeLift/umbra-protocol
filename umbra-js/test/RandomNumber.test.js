const chai = require('chai');
const ethers = require('ethers');
const RandomNumber = require('../classes/RandomNumber');

const { expect } = chai;
const { utils } = ethers;

describe('RandomNumber class', () => {
  let random;

  beforeEach(() => {
    random = new RandomNumber();
  });

  it('initializes an instance with a 32 byte Uint8Array', () => {
    const { value } = random;
    expect(value.constructor).to.equal(Uint8Array);
    expect(value.length).to.equal(32);
  });

  it('allows random number instances to be initialized with different sizes', () => {
    const random16 = new RandomNumber(16);
    expect(random16.value.length).to.equal(16);
  });

  it('returns random value as an ethers BigNumber', () => {
    expect(random.asBN.constructor).to.equal(ethers.BigNumber);
  });

  it('returns random value as a hex string', () => {
    const hex = random.asHex;
    expect(utils.isHexString(hex)).to.be.true;
    expect(hex.length).to.equal(66); // 32-bytes plus leading 0x prefix
  });

  it('returns random value as a hex string without the 0x prefix', () => {
    const hex = random.asHexSlim;
    expect(hex.length).to.equal(64); // 32-bytes plus without 0x prefix
  });
});
