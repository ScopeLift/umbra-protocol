import { BigNumber, computeAddress, isHexString, isAddress } from 'src/utils/ethers';
import { ens_normalize } from '@adraffy/ens-normalize';

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

export const assertValidEncryptionCount = (count: BigNumber, errorMsg?: string) => {
  if (count.lt(0)) {
    throw new Error(errorMsg || 'Invalid count provided for encryption');
  }
};

export const assertValidHexString = (hex: string, length: number, errorMsg?: string) => {
  if (!isHexString(hex, length)) {
    throw new Error(errorMsg || 'Invalid hex string was provided');
  }
};

export const assertValidEnsName = (name: string) => {
  try {
    ens_normalize(name);
  } catch (err) {
    // A couple example error messages from ens-normalize:
    // ‌hi.eth - Invalid label "{200C}hi"‎: disallowed character: {200C}
    // aα.eth - Invalid label "aα"‎: illegal mixture: Latin + Greek "α"‎ {3B1}
    console.log((err as Error)?.message);
    throw new Error(
      `The given ENS name is invalid due to: ${(err as Error)?.message
        .split(':')
        .slice(1)
        .join('')} in the ENS name. Check the ENS name in order to avoid a potential scam.`
    );
  }
};
