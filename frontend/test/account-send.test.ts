/**
 * @jest-environment jsdom
 */
import { buildAccountDataForEncryption, encryptAccountData, decryptData } from '../src/utils/account-send';
import { BigNumber } from '../src/utils/ethers';

describe('buildAccountDataForEncryption Utils', () => {
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const pubKey =
    '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';

  it('invalid address', () => {
    const x = () =>
      buildAccountDataForEncryption({
        recipientAddress: 'adfaklsfjl',
        advancedMode: true,
        pubKey: pubKey,
        usePublicKeyChecked: true,
      });
    expect(x).toThrow('Invalid recipient address');
  });

  it('invalid pubkey prefix', () => {
    const x = () =>
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: '0x039dad8ddb0bd43093435ce4',
        usePublicKeyChecked: true,
      });
    expect(x).toThrow('Invalid public key prefix');
  });

  it('invalid pubkey', () => {
    const x = () =>
      buildAccountDataForEncryption({
        recipientAddress,
        advancedMode: true,
        pubKey: '0x049dad8ddb0bd43093435ce4',
        usePublicKeyChecked: true,
      });
    expect(x).toThrow('Invalid public or private key');
  });

  it('Data is correct', () => {
    const data = buildAccountDataForEncryption({
      recipientAddress,
      advancedMode: true,
      pubKey: pubKey,
      usePublicKeyChecked: true,
    });
    expect(data === BigNumber.from(`${recipientAddress}11${pubKey.slice(4)}`));
  });
});

describe('Encryption/Decryption utils', () => {
  const partialPubKey = '0x9976698beebe8ee5c74d8cc5';
  const pubKey =
    '0x0476698beebe8ee5c74d8cc50ab84ac301ee8f10af6f28d0ffd6adf4d6d3b9b762d46ca56d3dad2ce13213a6f42278dabbb53259f2d92681ea6a0b98197a719be3';
  const recipientAddress = '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5';
  const viewingKey = '0x290a15e2b46811c84a0c26624fd7fdc12e38143ae75518fc48375d41035ec5c1'; // this viewing key is taken from the testkeys in the umbra-js tests

  it('Encryption invalid recipientAddress', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress: '0xhi',
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: 1,
          viewingKey: viewingKey,
        }
      );

    expect(x).toThrow('Invalid recipient address');
  });

  it('Encryption invalid encryption count', () => {
    const x = () =>
      encryptAccountData(
        {
          recipientAddress,
          advancedMode: false,
          usePublicKeyChecked: false,
          pubKey: pubKey,
        },
        {
          encryptionCount: -1,
          viewingKey: viewingKey,
        }
      );

    expect(x).toThrow('Invalid count provided for encryption');
  });

  it('Encryption invalid viewing key', () => {
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
