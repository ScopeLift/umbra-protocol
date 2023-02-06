/**
 * @dev Class for managing random numbers
 * @dev In the Umbra Protocol, all random numbers should be 32 bytes to ensure sufficient security
 */

import { BigNumber, hexZeroPad } from '../ethers';
import { utils } from '@noble/secp256k1';

export class RandomNumber {
  readonly sizeInBytes = 32; // generated random number will always be 32 bytes
  readonly value: BigNumber; // random number value

  /**
   * @notice Generate a new 32 byte random number
   */
  constructor() {
    // Randomly generate 32 bytes and save them as a BigNumber
    const randomNumberAsBytes = utils.randomPrivateKey();
    this.value = BigNumber.from(randomNumberAsBytes);
  }

  /**
   * @notice Get random number as hex string
   */
  get asHex() {
    return hexZeroPad(this.value.toHexString(), this.sizeInBytes);
  }

  /**
   * @notice Get random number as hex string without 0x prefix
   */
  get asHexSlim() {
    return hexZeroPad(this.asHex, this.sizeInBytes).slice(2);
  }
}
