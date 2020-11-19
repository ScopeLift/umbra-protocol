/**
 * @dev Class for managing random numbers. In Umbra, a random number is 32 bytes, where
 * the first 16 bytes are zeros (optionally used by developers as payload extensions), and the
 * last 16 bytes are the random number
 */

import { ethers } from 'ethers';

const { BigNumber, utils } = ethers;
const { hexZeroPad } = utils;
const zeroPrefix = '0x00000000000000000000000000000000'; // 16 bytes of zeros

export class RandomNumber {
  readonly randomLength = 16; // 16 bytes of randomness
  readonly fullLength = 32; // pad to number to 32 bytes
  readonly value: ethers.BigNumber; // random number value

  /**
   * @notice Generate a new random number
   * @param payloadExtension 16 byte payload extension, with 0x prefix. Specify as a 34 character
   * hex string where the first two characters are 0x
   */
  constructor(readonly payloadExtension: string = zeroPrefix) {
    // Generate default random number without payload extension
    const randomNumberAsBytes = utils.randomBytes(this.randomLength);
    this.value = BigNumber.from(randomNumberAsBytes);

    // If a payload extension was provided, validate it
    if (payloadExtension !== zeroPrefix) {
      if (!utils.isHexString(payloadExtension)) {
        throw new Error('Payload extension is not a valid hex string');
      }
      if (payloadExtension.length !== 34) {
        throw new Error('Payload extension must be a 16 byte hex string with the 0x prefix');
      }
    }

    // Payload extension is valid, so update the random number. If no payload extension is provided
    // the below is equivalent doing nothing, as it replaces the zero prefix with the zero prefix
    const randomNumberAsHexWithPayloadExt = this.asHex.replace(zeroPrefix, payloadExtension);
    this.value = BigNumber.from(randomNumberAsHexWithPayloadExt);
  }

  /**
   * @notice Get random number as hex string
   */
  get asHex() {
    return hexZeroPad(this.value.toHexString(), this.fullLength);
  }

  /**
   * @notice Get random number as hex string without 0x prefix
   */
  get asHexSlim() {
    return hexZeroPad(this.asHex, this.fullLength).slice(2);
  }
}
