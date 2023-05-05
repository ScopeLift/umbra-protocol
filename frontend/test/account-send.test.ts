/**
 * @jest-environment jsdom
 */
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber } from '../src/utils/ethers';
import { ethers } from 'ethers';

const invalidAddresses = [
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13', // Missing last character.
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13dd', // Has extra character.
  '0x869b1913aed711246a4cd22b4cfe9dd13996b13dd', // All lowercase.
  '0x869b1913aeD711246A4cD22B4cFE9DD13996B13D', // Wrong checksum.
  '869b1913aeD711246A4cD22B4cFE9DD13996B13d', // No 0x prefix.
  '0x',
  'adfaklsfjl', // Random string.
];

// Used to generate random data in tests.
function randomData() {
  return {
    recipientAddress: ethers.Wallet.createRandom().address,
    pubKey: ethers.Wallet.createRandom().publicKey,
    advancedMode: Math.random() > 0.5,
    usePublicKeyChecked: Math.random() > 0.5,
    viewingKey: ethers.Wallet.createRandom().privateKey,
    // Make sure 0 is more likely to show up for encryption count.
    encryptionCount: Math.random() < 0.1 ? 0 : BigNumber.from(Math.floor(Math.random() * 1000)).toNumber(),
  };
}

describe('buildAccountDataForEncryption Utils', () => {
  invalidAddresses.forEach((recipientAddress) => {
    it('Throws when given an invalid recipient address', () => {
      const { pubKey, advancedMode, usePublicKeyChecked } = randomData();
      const x = () => buildAccountDataForEncryption({ recipientAddress, pubKey, advancedMode, usePublicKeyChecked });
      expect(x).toThrow('Invalid recipient address');
    });
  });

  [
    '0x0290d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a75', // Wrong prefix, this is a compressed pubkey.
    '0x031cfa0212cf73dde948b32da3715d4a17cd9188263729ccddccffc30581b1efce', // Wrong prefix, this is a compressed pubkey.
    '0x041cfa0212cf73dde948b32da3715d4a17cd9188263729ccddccffc30581b1efce', // Right prefix, but not a valid public key format.
    '0x0290d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
    '0x0390d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
    '0x9990d47bf25f057e085aaff2881f2a59799d6b2553dda3aac0cd340ffdf0c71a7565eb3b9ba06f42e7450625ea0ec4f7cb65b1c5f0854c5e7bbed9c3bd3c8c5660', // Would be valid if prefix was 0x04.
  ].forEach((pubKey) => {
    it('Throws when given an invalid public key', () => {
      const { recipientAddress, advancedMode, usePublicKeyChecked } = randomData();
      const x = () => buildAccountDataForEncryption({ recipientAddress, pubKey, advancedMode, usePublicKeyChecked });
      expect(x).toThrow('Invalid public key');
    });
  });

  it('Correctly formats the data to be encrypted', () => {
    // Generate random data and do multiple runs.
    for (let i = 0; i < 10; i++) {
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

describe('Encryption/Decryption utils', () => {
  const partialPubKey = '0x9976698beebe8ee5c74d8cc5';
  const pubKey =
    '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const viewingKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

  invalidAddresses.forEach((recipientAddress) => {
    it('Throws when given an invalid recipient address', () => {
      const { pubKey, advancedMode, usePublicKeyChecked, viewingKey, encryptionCount } = randomData();
      const x = () =>
        encryptAccountData(
          { recipientAddress, advancedMode, usePublicKeyChecked, pubKey },
          { encryptionCount, viewingKey }
        );
      expect(x).toThrow('Invalid recipient address');
    });
  });

  [-1, -2, -99999, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER - 1000].forEach((encryptionCount) => {
    it('Throws when given an invalid encryption count', () => {
      // Generate random data for everything except the encryption count.
      const recipientAddress = ethers.Wallet.createRandom().address;
      const pubKey = ethers.Wallet.createRandom().publicKey;
      const advancedMode = Math.random() > 0.5;
      const usePublicKeyChecked = Math.random() > 0.5;
      const viewingKey = ethers.Wallet.createRandom().privateKey;
      const x = () =>
        encryptAccountData(
          { recipientAddress, advancedMode, usePublicKeyChecked, pubKey },
          { encryptionCount, viewingKey }
        );
      expect(x).toThrow('Invalid count provided for encryption');
    });
  });

  it('Throws when given an invalid viewing key', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 0,
          viewingKey: '',
        }
      );

    expect(x).toThrow('Invalid viewing key');
  });

  it('Encryption invalid viewing key missing 0x', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 0,
          viewingKey: '290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1',
        }
      );

    expect(x).toThrow('Invalid viewing key');
  });

  it('Encryption invalid viewing key too short', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 0,
          viewingKey: pubKey.slice(0, -1),
        }
      );

    expect(x).toThrow('Invalid viewing key');
  });

  it('Encryption invalid public key prefix', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 0,
          viewingKey: '0x03',
        }
      );

    expect(x).toThrow('Invalid viewing key');
    // Add tests for all of the assertions
  });

  it('Encryption invalid public key', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 0,
          viewingKey: '0x04randomcharacters',
        }
      );

    expect(x).toThrow('Invalid viewing key');
  });

  it('Decryption invalid count', () => {
    const x = () =>
      decryptData('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
        encryptionCount: -1,
        viewingKey: viewingKey,
      });
    expect(x).toThrow('Invalid count for decryption');
  });

  it('Decryption invalid viewing key', () => {
    const x = () =>
      decryptData('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
        encryptionCount: 0,
        viewingKey: '',
      });
    expect(x).toThrow('Invalid viewing key');
  });

  it('Decryption invalid viewing key missing 0x', () => {
    const x = () =>
      decryptData('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
        encryptionCount: 0,
        viewingKey: viewingKey.slice(2),
      });
    expect(x).toThrow('Invalid viewing key');
  });

  it('Decryption invalid viewing key too short', () => {
    const x = () =>
      decryptData('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
        encryptionCount: 0,
        viewingKey: viewingKey.slice(0, -1),
      });
    expect(x).toThrow('Invalid viewing key');
  });

  it('Decryption invalid ciphertext', () => {
    const x = () =>
      decryptData('0xed72d644be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
        encryptionCount: 0,
        viewingKey: viewingKey,
      });
    expect(x).toThrow('Invalid ciphertext');
  });

  it('Data encrypted correctly all true', () => {
    const data = encryptAccountData(
      {
        recipientAddress,
        advancedMode: true,
        usePublicKeyChecked: true,
        pubKey: pubKey,
      },
      {
        encryptionCount: 0,
        viewingKey: viewingKey,
      }
    );

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0x9f3873e440b439d4e7561e70b5db28af7abb67257f6353e8d6e057bd2ed16621');
  });

  it('Data encrypted correctly all false', () => {
    const data = encryptAccountData(
      {
        recipientAddress,
        advancedMode: false,
        usePublicKeyChecked: false,
        pubKey: pubKey,
      },
      {
        encryptionCount: 1,
        viewingKey: viewingKey,
      }
    );

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0xac7a4c827e636bb25fbf1ae604c48f0c035c34f526456dc6264b5ee43e3119f2');
  });

  it('Data decrypted correctly all true', () => {
    const data = decryptData('0x9f3873e440b439d4e7561e70b5db28af7abb67257f6353e8d6e057bd2ed16621', {
      encryptionCount: 0,
      viewingKey: viewingKey,
    });
    expect(data.advancedMode).toBe(true);
    expect(data.usePublicKeyChecked).toBe(true);
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`${data.pubKey}`).toBe(partialPubKey);
  });

  it('Data decrypted correctly all false', () => {
    const data = decryptData('0xac7a4c827e636bb25fbf1ae604c48f0c035c34f526456dc6264b5ee43e3119f2', {
      encryptionCount: 1,
      viewingKey: viewingKey,
    });
    expect(data.advancedMode).toBe(false);
    expect(data.usePublicKeyChecked).toBe(false);
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`${data.pubKey}`).toBe(partialPubKey);
  });
});
