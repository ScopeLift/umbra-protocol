/**
 * @jest-environment jsdom
 */
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber } from '../src/utils/ethers';

describe('buildAccountDataForEncryption Utils', () => {
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const partialPubKey =
    '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';

  it('invalid address', () => {
    let err;
    try {
      buildAccountDataForEncryption({
        recipientAddress: 'adfaklsfjl',
        advancedMode: true,
        pubKey: partialPubKey,
        usePublicKeyChecked: true,
      });
    } catch (e) {
      err = e;
    }
    expect((err as Error)?.message).toBe('Invalid recipientAddress');
  });

  it('invalid pubkey prefix', () => {
    let err;
    try {
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: '0x039dad8ddb0bd43093435ce4',
        usePublicKeyChecked: true,
      });
    } catch (e) {
      err = e;
    }
    expect((err as Error)?.message).toBe('Invalid public key prefix');
  });

  it('invalid pubkey', () => {
    let err;
    try {
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: '0x049dad8ddb0bd43093435ce4',
        usePublicKeyChecked: true,
      });
    } catch (e) {
      err = e;
    }
    expect((err as Error)?.message).toBe('Invalid public or private key');
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
  const partialPubKey = '0x0476698beebe8ee5c74d8cc5';
  const pubKey =
    '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const viewingKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

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
    expect(data).toBe('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb');
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
    expect(data).toBe('0x7fa429b09b448b9b5b513626b2088fdf317e49f19f610f9ba3db17f0257de54a');
  });

  it('Data decrypted correctly all true', () => {
    const data = decryptData('0xed72d6744be0208e4d1c6312a04d2d623b99b2487f58d80f6169f9522d984cdb', {
      encryptionCount: 0,
      viewingKey: viewingKey,
    });

    expect(data.advancedMode).toBe('1');
    expect(data.usePublicKeyChecked).toBe('1');
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });

  it('Data decrypted correctly all false', () => {
    const data = decryptData('0x7fa429b09b448b9b5b513626b2088fdf317e49f19f610f9ba3db17f0257de54a', {
      encryptionCount: 1,
      viewingKey: viewingKey,
    });

    expect(data.advancedMode).toBe('0');
    expect(data.usePublicKeyChecked).toBe('0');
    expect(data.address).toBe(recipientAddress.toLowerCase());
    expect(`0x04${data.pubKey}`).toBe(partialPubKey);
  });
});
