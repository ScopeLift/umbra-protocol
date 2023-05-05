import { computeAddress, isHexString, isAddress } from 'src/utils/ethers';

export const assertValidAddress = (address: string, errorMsg?: string) => {
  if (!address.startsWith('0x') || !isAddress(address)) {
    throw new Error(errorMsg || 'Invalid address');
  }
};

export const assertValidPublicKeyPrefix = (pubKey: string, errorMsg?: string) => {
  if (pubKey.slice(0, 4) !== '0x04') {
    throw new Error(errorMsg || 'Invalid public key prefix');
  }
};

export const assertValidPublicKey = (pubKey: string, errorMsg?: string) => {
  try {
    // This will error if an invalid public key is provided
    computeAddress(pubKey);
  } catch {
    throw new Error(errorMsg || 'Invalid public or private key');
  }
};

export const assertValidEncryptionCount = (count: number, errorMsg?: string) => {
  if (count < 0) {
    throw new Error(errorMsg || 'Invalid count provided for encryption');
  }
};

export const assertValidHexString = (hex: string, length: number, errorMsg?: string) => {
  if (!isHexString(hex, length)) {
    throw new Error(errorMsg || 'Invalid hex string was provided');
  }
};
