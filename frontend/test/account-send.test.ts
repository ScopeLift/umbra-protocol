/**
 * @jest-environment jsdom
 */
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber } from '../src/utils/ethers';

describe('buildAccountDataForEncryption Utils', () => {
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const partialPubKey = '0x049dad8ddb0bd43093435ce4';

  it('invalid address', () => {
    try {
      buildAccountDataForEncryption({
        recipientAddress: 'adfaklsfjl',
        advancedMode: true,
        pubKey: partialPubKey,
        usePublicKeyChecked: true,
      });
    } catch (e) {
      expect((e as Error).message).toBe('Invalid address');
    }
  });

  it('invalid pubkey', () => {
    try {
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: partialPubKey,
        usePublicKeyChecked: true,
      });
    } catch (e) {
      expect((e as Error).message).toBe('Invalid public key');
    }
  });

  it('Data not correct length', () => {
    try {
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: '0x049dad8ddb0b',
        usePublicKeyChecked: true,
      });
    } catch (e) {
      expect((e as Error).message).toBe('Data to encrypt is not the correct length 52 instead of 64');
    }
  });

  it('Data is correct', () => {
    const data = buildAccountDataForEncryption({
      recipientAddress,
      advancedMode: true,
      pubKey: partialPubKey,
      usePublicKeyChecked: true,
    });
    expect(data === BigNumber.from(`${recipientAddress}11${partialPubKey.slice(4)}`));
  });
});

describe('buildAccountDataForEncryption Utils', () => {
  const partialPubKey = '0x049dad8ddb0bd43093435ce4';
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const viewingKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

  it('Data encrypted correctly all true', () => {
    const data = encryptAccountData(
      {
        recipientAddress,
        advancedMode: true,
        usePublicKeyChecked: true,
        pubKey: partialPubKey,
      },
      {
        encryptionCount: 0,
        viewingKey: viewingKey,
      }
    );

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0xed72d6744be0208e4d1c6312a04d2d623b99b2487fb31c0954dca38779969cfa');
  });

  it('Data encrypted correctly all false', () => {
    const data = encryptAccountData(
      {
        recipientAddress,
        advancedMode: false,
        usePublicKeyChecked: false,
        pubKey: partialPubKey,
      },
      {
        encryptionCount: 1,
        viewingKey: viewingKey,
      }
    );

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0x7fa429b09b448b9b5b513626b2088fdf317e49f19f8acb9d966e4d257173356b');
  });

  it('Data decrypted correctly all true', () => {
    const data = decryptData(
      {
        encryptedAddress: '0xed72d6744be0208e4d1c6312a04d2d623b99b2487fb31c0954dca38779969cfa',
      },
      {
        encryptionCount: 0,
        viewingKey: viewingKey,
      }
    );

    expect(data.advancedMode).toBe('1');
    expect(data.usePublicKeyChecked).toBe('1');
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });

  it('Data decrypted correctly all false', () => {
    const data = decryptData(
      {
        encryptedAddress: '0x7fa429b09b448b9b5b513626b2088fdf317e49f19f8acb9d966e4d257173356b',
      },
      {
        encryptionCount: 1,
        viewingKey: viewingKey,
      }
    );

    expect(data.advancedMode).toBe('0');
    expect(data.usePublicKeyChecked).toBe('0');
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });
});
