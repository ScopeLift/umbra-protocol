import { BigNumber, computeAddress, isHexString, isAddress } from 'src/utils/ethers';

export const assertValidAddress = (address: string, errorMsg?: string) => {
  if (!address.startsWith('0x') || !isAddress(address)) {
    throw new Error(errorMsg || 'Invalid address');
  }
};

export const assertValidPublicKey = (pubKey: string, errorMsg?: string) => {
  // Only uncompressed public keys are supported.
  if (!pubKey.startsWith('0x04') || pubKey.length !== 132 || !isHexString(pubKey)) {
    throw new Error(errorMsg || 'Invalid public key');
  }

  // This will error if an invalid public key is provided
  try {
    computeAddress(pubKey);
  } catch {
    throw new Error(errorMsg || 'Invalid public key');
  }
};

export const assertValidEncryptionCount = (count: string, errorMsg?: string) => {
  const error = new Error(errorMsg || 'Invalid count provided for encryption');
  let bigNumberCount = BigNumber.from(-1);
  try {
    bigNumberCount = BigNumber.from(count);
  } catch {
    throw error;
  }
  if (bigNumberCount.lt(0)) {
    throw error;
  }
};

export const assertValidHexString = (hex: string, length: number, errorMsg?: string) => {
  if (!isHexString(hex, length)) {
    throw new Error(errorMsg || 'Invalid hex string was provided');
  }
};
