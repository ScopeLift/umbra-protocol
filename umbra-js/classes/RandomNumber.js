/**
 * @notice Class for managing random numbers
 */
const ethers = require('ethers');
const { padHex } = require('../utils/utils');

const { utils } = ethers;

class RandomNumber {
  /**
   * @notice Generate a new random number
   * @param {Number} length Number of bytes random number should have
   */
  constructor(length = 32) {
    this.length = length;
    this.value = utils.shuffled(utils.randomBytes(length));
  }

  /**
   * @notice Get random number as a BigNumber
   */
  get asBN() {
    return ethers.BigNumber.from(this.value);
  }

  /**
   * @notice Get random number as hex string
   */
  get asHex() {
    return `0x${padHex(this.asBN.toHexString().slice(2), this.length)}`;
  }

  /**
   * @notice Get random number as hex string without 0x prefix
   */
  get asHexSlim() {
    return padHex(this.asHex.slice(2), this.length);
  }
}

module.exports = RandomNumber;
