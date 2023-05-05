/**
 * @jest-environment jsdom
 */
import { randomBytes } from 'crypto';
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber, getAddress } from '../src/utils/ethers';
import { ethers } from 'ethers';

const NUM_RUNS = 100;

const invalidAddresses = [
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13', // Missing last character.
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13dd', // Has extra character.
  '0x869b1913aed711246a4cd22b4cfe9dd13996b13dd', // All lowercase.
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13D', // Wrong checksum.
  '869b1913aeD711246A4cD22B4cFE9DD13996B13d', // No 0x prefix.
  '0x',
  'adfaklsfjl', // Random string.
];

const invalidPubKeys = [
  '0x0290d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a75', // Wrong prefix, this is a compressed pubkey.
  '0x031cfa0212cf73dde948b32da3715d4a17cd9188263729ccddccffc30581b1efce', // Wrong prefix, this is a compressed pubkey.
  '0x041cfa0212cf73dde948b32da3715d4a17cd9188263729ccddccffc30581b1efce', // Right prefix, but not a valid public key format.
  '0x0290d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
  '0x0390d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
  '0x9990d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
];

const invalidPrivateKeys = [
  '',
  '0xea40eda38ee75464fd68074e35c1e52c03ac041e2ffba23efaa93d425487f88', // Too short.
  '0xea40eda38ee75464fd68074e35c1e52c03ac041e2ffba23efaa93d425487f8877', // Too long.
  'ea40eda38ee75464fd68074e35c1e52c03ac041e2ffba23efaa93d425487f88a', // Missing 0x prefix.
  '0x03ea40eda38ee75464fd68074e35c1e52c03ac041e2ffba23efaa93d425487f887', // Has a pubkey prefix.
  '0x04randomcharacters',
];

const invalidEncryptionCounts = [-1, -2, -99999, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER - 1000];

function randomHexString(numBytes: number): string {
  return `0x${randomBytes(numBytes).toString('hex')}`;
}

// Used to generate random data in tests.
function randomData() {
  return {
    recipientAddress: getAddress(randomHexString(20)),
    pubKey: ethers.Wallet.createRandom().publicKey, // Need this one to be real so validation passes.
    advancedMode: Math.random() > 0.5,
    usePublicKeyChecked: Math.random() > 0.5,
    viewingPrivateKey: randomHexString(32),
    // Make sure 0 is more likely to show up for encryption count.
    encryptionCount: Math.random() < 0.1 ? 0 : BigNumber.from(Math.floor(Math.random() * 1000)).toNumber(),
    // Ciphertext has the same length as a private key.
    ciphertext: randomHexString(32),
  };
}

describe('buildAccountDataForEncryption', () => {
  invalidAddresses.forEach((recipientAddress) => {
    it('Throws when given an invalid recipient address', () => {
      const { pubKey, advancedMode, usePublicKeyChecked } = randomData();
      const x = () => buildAccountDataForEncryption({ recipientAddress, pubKey, advancedMode, usePublicKeyChecked });
      expect(x).toThrow('Invalid recipient address');
    });
  });

  invalidPubKeys.forEach((pubKey) => {
    it('Throws when given an invalid public key', () => {
      const { recipientAddress, advancedMode, usePublicKeyChecked } = randomData();
      const x = () => buildAccountDataForEncryption({ recipientAddress, pubKey, advancedMode, usePublicKeyChecked });
      expect(x).toThrow('Invalid public key');
    });
  });

  it('Correctly formats the data to be encrypted', () => {
    // Generate random data and do multiple runs.
    for (let i = 0; i < NUM_RUNS; i++) {
      const { recipientAddress, pubKey, advancedMode, usePublicKeyChecked } = randomData();
      const actualData = buildAccountDataForEncryption({ recipientAddress, pubKey, advancedMode, usePublicKeyChecked });

      const advancedModeString = advancedMode ? '1' : '0';
      const usePublicKeyCheckedString = usePublicKeyChecked ? '1' : '0';
      const expectedData = BigNumber.from(
        `${recipientAddress.toLowerCase()}${advancedModeString}${usePublicKeyCheckedString}${pubKey.slice(4, 4 + 22)}`
      );
      expect(actualData.toHexString()).toEqual(expectedData.toHexString());
    }
  });
});

const partialPubKey = '0x9976698beebe8ee5c74d8cc5';
const pubKey =
  '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';
const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
const viewingPrivateKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

describe('encryptAccountData', () => {
  invalidAddresses.forEach((recipientAddress) => {
    it('Throws when given an invalid recipient address', () => {
      const { pubKey, advancedMode, usePublicKeyChecked, viewingPrivateKey, encryptionCount } = randomData();
      const x = () =>
        encryptAccountData(
          { recipientAddress, advancedMode, usePublicKeyChecked, pubKey },
          { encryptionCount, viewingPrivateKey }
        );
      expect(x).toThrow('Invalid recipient address');
    });
  });

  invalidEncryptionCounts.forEach((encryptionCount) => {
    it('Throws when given an invalid encryption count', () => {
      // Generate random data for everything except the encryption count.
      const recipientAddress = ethers.Wallet.createRandom().address;
      const pubKey = ethers.Wallet.createRandom().publicKey;
      const advancedMode = Math.random() > 0.5;
      const usePublicKeyChecked = Math.random() > 0.5;
      const viewingPrivateKey = ethers.Wallet.createRandom().privateKey;
      const x = () =>
        encryptAccountData(
          { recipientAddress, advancedMode, usePublicKeyChecked, pubKey },
          { encryptionCount, viewingPrivateKey }
        );
      expect(x).toThrow('Invalid count provided for encryption');
    });
  });

  invalidPrivateKeys.forEach((viewingPrivateKey) => {
    const { recipientAddress, pubKey, advancedMode, usePublicKeyChecked, encryptionCount } = randomData();
    it('Throws when given an invalid viewing key', () => {
      const x = () =>
        encryptAccountData(
          { recipientAddress, advancedMode, pubKey, usePublicKeyChecked },
          { encryptionCount, viewingPrivateKey }
        );
      expect(x).toThrow('Invalid viewing key');
    });
  });
});

describe('decryptData', () => {
  invalidEncryptionCounts.forEach((encryptionCount) => {
    it('Decryption invalid count', () => {
      const { viewingPrivateKey, ciphertext } = randomData();
      const x = () => decryptData(ciphertext, { encryptionCount, viewingPrivateKey });
      expect(x).toThrow('Invalid count for decryption');
    });
  });

  invalidPrivateKeys.forEach((viewingPrivateKey) => {
    it('Decryption invalid viewing key', () => {
      const { ciphertext, encryptionCount } = randomData();
      const x = () => decryptData(ciphertext, { encryptionCount, viewingPrivateKey });
      expect(x).toThrow('Invalid viewing key');
    });
  });

  [
    '',
    '0xed72d644be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', // Too short.
    '0xed72d644be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdbbb', // Too long.
    'ffed72d644be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdbb', // Right length, wrong format.
  ].forEach((ciphertext) => {
    it('Decryption invalid ciphertext', () => {
      const { viewingPrivateKey, encryptionCount } = randomData();
      const x = () => decryptData(ciphertext, { encryptionCount, viewingPrivateKey });
      expect(x).toThrow('Invalid ciphertext');
    });
  });

  // This data was generated from this test when it was working and it's contents are verified in the below decrypt tests.
  [
    {
      advancedMode: true,
      usePublicKeyChecked: true,
      encryptionCount: 0,
      expectedCiphertext: '0x9f3873e440b439d4e7561e70b5db28af7abb67257f6353e8d6e057bd2ed16621',
    },
    {
      advancedMode: false,
      usePublicKeyChecked: false,
      encryptionCount: 1,
      expectedCiphertext: '0xac7a4c827e636bb25fbf1ae604c48f0c035c34f526456dc6264b5ee43e3119f2',
    },
    {
      advancedMode: true,
      usePublicKeyChecked: false,
      encryptionCount: 2,
      expectedCiphertext: '0xb609426a8909759990b22756b7f2ce4f8d5ac4685d6e2c40daa830d059950504',
    },
    {
      advancedMode: false,
      usePublicKeyChecked: true,
      encryptionCount: 3,
      expectedCiphertext: '0xd45ffb2b6d4b4ad3bc0682b111cdbceecac938df0c72a0b0a79f7b6be6cfeb3e',
    },
  ].forEach(({ advancedMode, usePublicKeyChecked, encryptionCount, expectedCiphertext }) => {
    it('Correctly encrypts data', () => {
      const data = encryptAccountData(
        { recipientAddress, advancedMode, usePublicKeyChecked, pubKey: pubKey },
        { encryptionCount, viewingPrivateKey: viewingPrivateKey }
      );
      expect(data.length).toBe(66); // 32 bytes + 0x
      expect(data).toBe(expectedCiphertext);
    });
  });

  [
    {
      ciphertext: '0x9f3873e440b439d4e7561e70b5db28af7abb67257f6353e8d6e057bd2ed16621',
      encryptionCount: 0,
      expectedDecryptedData: {
        advancedMode: true,
        usePublicKeyChecked: true,
        address: recipientAddress,
        pubKey: partialPubKey,
      },
    },
    {
      ciphertext: '0xac7a4c827e636bb25fbf1ae604c48f0c035c34f526456dc6264b5ee43e3119f2',
      encryptionCount: 1,
      expectedDecryptedData: {
        advancedMode: false,
        usePublicKeyChecked: false,
        address: recipientAddress,
        pubKey: partialPubKey,
      },
    },
    {
      ciphertext: '0xb609426a8909759990b22756b7f2ce4f8d5ac4685d6e2c40daa830d059950504',
      encryptionCount: 2,
      expectedDecryptedData: {
        advancedMode: true,
        usePublicKeyChecked: false,
        address: recipientAddress,
        pubKey: partialPubKey,
      },
    },
    {
      ciphertext: '0xd45ffb2b6d4b4ad3bc0682b111cdbceecac938df0c72a0b0a79f7b6be6cfeb3e',
      encryptionCount: 3,
      expectedDecryptedData: {
        advancedMode: false,
        usePublicKeyChecked: true,
        address: recipientAddress,
        pubKey: partialPubKey,
      },
    },
  ].forEach(({ ciphertext, encryptionCount, expectedDecryptedData }) => {
    it('Data decrypted correctly all true', () => {
      const data = decryptData(ciphertext, { encryptionCount, viewingPrivateKey: viewingPrivateKey });
      expect(data).toEqual(expectedDecryptedData); // Recursively checks all properties.
    });
  });
});

describe('encrypt/decrypt relationship', () => {
  it('Encrypt and decrypt are inverses', () => {
    // Generate random data and do multiple runs.
    for (let i = 0; i < 100; i++) {
      const { recipientAddress, pubKey, viewingPrivateKey, advancedMode, usePublicKeyChecked, encryptionCount } =
        randomData();
      const ciphertext = encryptAccountData(
        { recipientAddress, advancedMode, pubKey, usePublicKeyChecked },
        { encryptionCount, viewingPrivateKey }
      );
      const decryptedData = decryptData(ciphertext, { encryptionCount, viewingPrivateKey });
      expect(decryptedData).toEqual({
        advancedMode,
        usePublicKeyChecked,
        address: recipientAddress,
        pubKey: `0x99${pubKey.slice(4, 4 + 22)}`,
      });
    }
  });
});
