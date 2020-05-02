/**
 * @notice Class for managing random numbers
 */
const ethers = require('ethers');

const { utils } = ethers;

class RandomNumber {
  /**
   * @notice Generate a new random number
   * @param {Number} length Number of bytes random number should have
   */
  constructor(length = 32) {
    this.value = utils.shuffled(utils.randomBytes(length));
  }

  /**
   * @notice Get random number as a BigNumber
   */
  get asBigNumber() {
    return ethers.BigNumber.from(this.value);
  }

  /**
   * @notice Get random number as hex string
   */
  get asHex() {
    return ethers.BigNumber.from(this.value).toHexString();
  }

  /**
   * @notice Get random number as hex string without 0x prefix
   */
  get asHexWithoutPrefix() {
    return ethers.BigNumber.from(this.value).toHexString().slice(2);
  }
}

module.exports = RandomNumber;
