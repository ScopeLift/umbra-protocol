/**
 * @jest-environment jsdom
 */
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber } from '../src/utils/ethers';

describe('buildAccountDataForEncryption Utils', () => {
  const address = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const partialPubKey = '0x049dad8ddb0bd43093435ce4';

  it('invalid address', () => {
    try {
      buildAccountDataForEncryption({
        address: 'adfaklsfjl',
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
        address,
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
        address,
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
      address,
      advancedMode: true,
      pubKey: partialPubKey,
      usePublicKeyChecked: true,
    });
    expect(data === BigNumber.from(`${address}11${partialPubKey.slice(4)}`));
  });
});

describe('buildAccountDataForEncryption Utils', () => {
  const partialPubKey = '0x049dad8ddb0bd43093435ce4';
  const address = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const viewingKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

  it('Data encrypted correctly all true', () => {
    const data = encryptAccountData({
      address,
      advancedMode: true,
      usePublicKeyChecked: true,
      encryptionCount: 0,
      viewingKey: viewingKey,
      pubKey: partialPubKey,
    });

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0xed72d6744be0208e4d1c6312a04d2d623b99b2487fb31c0954dca38779969cfa');
  });

  it('Data encrypted correctly all false', () => {
    const data = encryptAccountData({
      address,
      advancedMode: false,
      usePublicKeyChecked: false,
      encryptionCount: 1,
      viewingKey: viewingKey,
      pubKey: partialPubKey,
    });

    // 32 bytes + 0x
    expect(data.length).toBe(66);

    // This data was generated from this test when it was working and it's contents are verified in the below decrypt test
    expect(data).toBe('0x7fa429b09b448b9b5b513626b2088fdf317e49f19f8acb9d966e4d257173356b');
  });

  it('Data decrypted correctly all true', () => {
    const data = decryptData({
      encryptionCount: 0,
      viewingKey: viewingKey,
      encryptedAddress: '0xed72d6744be0208e4d1c6312a04d2d623b99b2487fb31c0954dca38779969cfa',
    });

    expect(data.advancedMode).toBe('1');
    expect(data.usePublicKeyChecked).toBe('1');
    expect(data.address).toBe(address.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });

  it('Data decrypted correctly all false', () => {
    const data = decryptData({
      encryptionCount: 1,
      viewingKey: viewingKey,
      encryptedAddress: '0x7fa429b09b448b9b5b513626b2088fdf317e49f19f8acb9d966e4d257173356b',
    });

    expect(data.advancedMode).toBe('0');
    expect(data.usePublicKeyChecked).toBe('0');
    expect(data.address).toBe(address.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });
});
