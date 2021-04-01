import { RandomNumber } from '../src/classes/RandomNumber';
import * as chai from 'chai';
import { BigNumber } from '@ethersproject/bignumber';
import { isHexString, hexZeroPad } from '@ethersproject/bytes';
import { randomBytes } from '@ethersproject/random';

const { expect } = chai;
const numberOfRuns = 1000; // number of runs for tests that execute in a loop
const zeroPrefix = '00000000000000000000000000000000'; // 16 bytes of zeros

describe('RandomNumber class', () => {
  let random: RandomNumber;

  beforeEach(() => {
    random = new RandomNumber();
  });

  it('initializes an instance with a random BigNumber', () => {
    const { value } = random;
    expect(value.constructor).to.equal(BigNumber);
  });

  it('returns random value as a 32 byte hex string with 16 bytes of leading zeros', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      random = new RandomNumber();
      const hex = random.asHex;
      const first16Bytes = hex.slice(2, 34);
      const last16Bytes = hex.slice(34);

      expect(isHexString(hex)).to.be.true;
      expect(hex.length).to.equal(66); // 32 bytes plus leading 0x prefix
      expect(first16Bytes).to.equal(zeroPrefix);
      expect(last16Bytes).to.not.equal(zeroPrefix);
      expect(`0x${first16Bytes}${last16Bytes}`).to.equal(hex);
    }
  });

  it('returns random value as a hex string without the 0x prefix', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      random = new RandomNumber();
      const hex = random.asHexSlim;
      const first16Bytes = hex.slice(0, 32);
      const last16Bytes = hex.slice(32);

      expect(isHexString(hex)).to.be.false;
      expect(hex.length).to.equal(64); // 32 bytes without 0x prefix
      expect(first16Bytes).to.equal(zeroPrefix);
      expect(last16Bytes).to.not.equal(zeroPrefix);
      expect(`${first16Bytes}${last16Bytes}`).to.equal(hex);
    }
  });

  it('asHex and asHexSlim are equivalent', () => {
    const hex = random.asHex;
    const first16Bytes = hex.slice(2, 34);
    const last16Bytes = hex.slice(34);

    const hexSlim = random.asHexSlim;
    const first16BytesSlim = hexSlim.slice(0, 32);
    const last16BytesSlim = hexSlim.slice(32);

    expect(first16Bytes).to.equal(first16BytesSlim);
    expect(last16Bytes).to.equal(last16BytesSlim);
  });

  it('throws if the payload extension is not a valid hex string', () => {
    let badFunction;
    const errorMessage1 = 'Payload extension is not a valid hex string';
    const errorMessage2 = 'Payload extension must be a 16 byte hex string with the 0x prefix';

    // Not a hex string
    badFunction = () => new RandomNumber('thisShouldThrow');
    expect(badFunction).to.throw(errorMessage1);

    // Hex string of correct size, but missing 0x prefix
    badFunction = () => new RandomNumber('ff2e6c8b7a2532a03cc70417e25084b6');
    expect(badFunction).to.throw(errorMessage1);

    // Properly formatted hex string, but wrong size
    badFunction = () => new RandomNumber('0x123');
    expect(badFunction).to.throw(errorMessage2);
    badFunction = () => new RandomNumber('0xff2e6c8b7a2532a03cc70417e25084b6ff');
    expect(badFunction).to.throw(errorMessage2);
  });

  it('lets the user set a payload extension when generating a random number', () => {
    for (let i = 0; i < numberOfRuns; i += 1) {
      // Generate random hex string with the correct format
      const randomHexString = hexZeroPad(BigNumber.from(randomBytes(16)).toHexString(), 16);

      random = new RandomNumber(randomHexString);
      const hex = random.asHex;
      const hexSlim = random.asHexSlim;
      const first16Bytes = hexSlim.slice(0, 32);
      const last16Bytes = hexSlim.slice(32);

      expect(isHexString(hex)).to.be.true;
      expect(hex.length).to.equal(66); // 32 bytes plus leading
      expect(first16Bytes).to.equal(randomHexString.slice(2));
      expect(first16Bytes).to.not.equal(zeroPrefix);
      expect(last16Bytes).to.not.equal(randomHexString.slice(2));
      expect(last16Bytes).to.not.equal(zeroPrefix);
    }
  });
});
