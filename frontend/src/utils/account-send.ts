import localforage from 'localforage';
import { RandomNumber } from '@umbracash/umbra-js';

import { keccak256, BigNumber, getAddress, hexZeroPad } from 'src/utils/ethers';
import { toAddress, lookupOrReturnAddresses } from 'src/utils/address';
import { LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX, MAINNET_PROVIDER } from 'src/utils/constants';
import {
  assertValidAddress,
  assertValidPublicKey,
  assertValidEncryptionCount,
  assertValidHexString,
} from 'src/utils/validation';

// A partial public key is prefixed with 0x99 and does not contain the full public key.
// We created this type because when storing account send data we only have 11 bytes to store
// the senders public key. This type should have 11 bytes of the public key, but this is
// not enforced in typescript.
type PartialPublicKey = '0x99{string}';

// Account Send data that is encrypted and stored in local storage
type AccountDataToEncrypt = {
  recipientAddress: string;
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
  pubKey: string;
};

// Used to create an encryption key which encrypts account send data
type KeyData = {
  encryptionCount: BigNumber;
  viewingPrivateKey: string;
};

// Unencrypted values that are stored in local storage
type UnencryptedAccountSendData = {
  amount: string;
  tokenAddress: string;
  dateSent: Date;
  txHash: string;
  senderAddress: string;
};

// Encrypted value that is stored in local storage
type EncryptedAccountSendData = {
  accountSendCiphertext: string;
};

export type StoreSendArgs = {
  unencryptedAccountSendData: Omit<UnencryptedAccountSendData, 'dateSent'>;
  accountDataToEncrypt: AccountDataToEncrypt;
};

type FetchAccountSendArgs = {
  chainId: number;
  address: string;
  viewingPrivateKey: string;
};

// All values stored in local storage
type AccountSendDataWithEncryptedFields = UnencryptedAccountSendData & EncryptedAccountSendData;
// All values in local storage with encrypted values decrypted
type AccountSendData = UnencryptedAccountSendData & { recipientId: string } & AccountDataToEncrypt;

export const buildAccountDataForEncryption = ({
  recipientAddress,
  advancedMode,
  pubKey,
  usePublicKeyChecked,
}: AccountDataToEncrypt) => {
  assertValidAddress(recipientAddress, 'Invalid recipient address');
  assertValidPublicKey(pubKey);

  recipientAddress = getAddress(recipientAddress).slice(2); // slice off the `0x` prefix.
  const advancedModeHalfByte = advancedMode ? '1' : '0';
  const usePublicKeyCheckedHalfByte = usePublicKeyChecked ? '1' : '0';
  const remainingBytes = 11; // 20 bytes for the receiver's address, 1 byte total for advancedMode and usePublicKeyChecked.

  // Store as much of the public key as we can in the remaining bytes. The first 4 characters are `0x04` so we skip those.
  const pubKeyStart = pubKey.slice(4, remainingBytes * 2 + 4); // Each hex character is a half byte meaning remaining bytes must be multiplied by 2
  const dataToEncrypt = `${recipientAddress}${advancedModeHalfByte}${usePublicKeyCheckedHalfByte}${pubKeyStart}`;
  if (dataToEncrypt.length !== 64) {
    // This should never happen.
    throw new Error(`Data to encrypt is not the correct length: found ${dataToEncrypt.length}, expected 64`);
  }

  return BigNumber.from(`0x${dataToEncrypt.toLowerCase()}`);
};

export const encryptAccountData = (accountDataToEncrypt: AccountDataToEncrypt, keyData: KeyData) => {
  const { recipientAddress, advancedMode, usePublicKeyChecked, pubKey } = accountDataToEncrypt;
  const { encryptionCount, viewingPrivateKey } = keyData;

  assertValidAddress(recipientAddress, 'Invalid recipient address');
  assertValidEncryptionCount(encryptionCount);
  assertValidHexString(viewingPrivateKey, 32, 'Invalid viewing key');
  assertValidPublicKey(pubKey);

  const encryptionCountHex = hexZeroPad(BigNumber.from(keyData.encryptionCount).toHexString(), 32);
  const encryptionKey = keccak256(`${viewingPrivateKey}${encryptionCountHex.slice(2)}`);
  const data = buildAccountDataForEncryption({ recipientAddress, advancedMode, usePublicKeyChecked, pubKey });
  const encryptedData = data.xor(encryptionKey);
  return hexZeroPad(encryptedData.toHexString(), 32);
};

export const decryptData = (accountSendCiphertext: string, keyData: KeyData) => {
  const { viewingPrivateKey, encryptionCount } = keyData;

  assertValidHexString(viewingPrivateKey, 32, 'Invalid viewing key');
  assertValidHexString(accountSendCiphertext, 32, 'Invalid ciphertext');
  assertValidEncryptionCount(encryptionCount, 'Invalid count for decryption');

  const encryptionCountHex = hexZeroPad(keyData.encryptionCount.toHexString(), 32);
  const encryptionKey = keccak256(`${viewingPrivateKey}${encryptionCountHex.slice(2)}`);

  const decryptedData = BigNumber.from(accountSendCiphertext).xor(encryptionKey);
  const hexData = hexZeroPad(decryptedData.toHexString(), 32);

  const partialPubKey = hexData.slice(44);
  const advancedMode = hexData.slice(42, 43);
  const usePublicKeyChecked = hexData.slice(43, 44);
  return {
    advancedMode: advancedMode === '1' ? true : false,
    usePublicKeyChecked: usePublicKeyChecked === '1' ? true : false,
    address: getAddress(hexData.slice(0, 42)),
    pubKey: `0x99${partialPubKey}` as PartialPublicKey,
  };
};

export const storeSend = async (
  chainId: number,
  viewingPrivateKey: string,
  sendArgs: StoreSendArgs | StoreSendArgs[]
) => {
  const sendArgsArray = Array.isArray(sendArgs) ? sendArgs : [sendArgs];
  for (const sendArg of sendArgsArray) {
    const { amount, tokenAddress, txHash, senderAddress } = sendArg.unencryptedAccountSendData;
    const { recipientAddress, advancedMode, usePublicKeyChecked, pubKey } = sendArg.accountDataToEncrypt;

    assertValidAddress(senderAddress, 'Invalid sender address');
    assertValidAddress(tokenAddress, 'Invalid token address');
    assertValidHexString(viewingPrivateKey, 32, 'Invalid viewing key');
    assertValidHexString(txHash, 32, 'Transaction hash');
    assertValidPublicKey(pubKey);

    // Send history is scoped by chain
    const localStorageKey = `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-${senderAddress}-${chainId}`;
    let count = (await localforage.getItem(
      `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-count-${senderAddress}-${chainId}`
    )) as string;
    let values = ((await localforage.getItem(localStorageKey)) as AccountSendData[]) || [];

    // If there is no count or the length of values is 0
    // then someone cleared localstorage data,
    // and we need to reset the count.
    if (!count || values.length === 0) {
      count = new RandomNumber().value.toString();

      await localforage.setItem(
        `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-count-${senderAddress}-${chainId}`,
        count.toString()
      );
      // Clear values because they cannot be decrypted if the original count is missing.
      await localforage.setItem(localStorageKey, []);
      values = [];
    }

    const checksummedRecipientAddress = await toAddress(recipientAddress, MAINNET_PROVIDER);
    const bigNumberCount = BigNumber.from(count);

    assertValidAddress(checksummedRecipientAddress, 'Invalid recipient address');
    assertValidEncryptionCount(bigNumberCount);

    const keyData = {
      encryptionCount: bigNumberCount.add(values.length),
      viewingPrivateKey,
    };
    const accountDataToEncrypt = {
      recipientAddress: checksummedRecipientAddress,
      advancedMode,
      usePublicKeyChecked,
      pubKey,
    };
    const encryptedData = encryptAccountData(accountDataToEncrypt, keyData);
    await localforage.setItem(localStorageKey, [
      ...values,
      {
        accountSendCiphertext: encryptedData,
        amount,
        tokenAddress,
        dateSent: new Date(),
        txHash,
        senderAddress,
      },
    ]);
  }
};

export const fetchAccountSends = async ({ address, viewingPrivateKey, chainId }: FetchAccountSendArgs) => {
  const localStorageKey = `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-${address}-${chainId}`;
  const values = ((await localforage.getItem(localStorageKey)) as AccountSendDataWithEncryptedFields[]) || [];
  const localStorageCountKey = `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-count-${address}-${chainId}`;
  const initialEncryptionCount = (await localforage.getItem(localStorageCountKey)) as string;

  let accountData = [] as AccountSendData[];
  const addresses = [];
  if (initialEncryptionCount === undefined || initialEncryptionCount === null) {
    await localforage.removeItem(localStorageKey);
    window.logger.warn('Initial encryption count was not set. Clearing current values', values);
    return [];
  }

  for (const [index, sendInfo] of values.entries()) {
    const decryptedData = decryptData(sendInfo.accountSendCiphertext, {
      viewingPrivateKey,
      encryptionCount: BigNumber.from(initialEncryptionCount).add(index),
    });

    window.logger.debug(`Partial PubKey: ${decryptedData.pubKey} for send ${index}`);
    accountData.push({
      recipientId: decryptedData.address,
      recipientAddress: decryptedData.address,
      advancedMode: decryptedData.advancedMode,
      usePublicKeyChecked: decryptedData.usePublicKeyChecked,
      amount: sendInfo.amount,
      tokenAddress: sendInfo.tokenAddress,
      dateSent: sendInfo.dateSent,
      senderAddress: sendInfo.senderAddress,
      txHash: sendInfo.txHash,
      pubKey: decryptedData.pubKey,
    });
    addresses.push(decryptedData.address);
  }
  const recipientIds = await lookupOrReturnAddresses(addresses, MAINNET_PROVIDER);
  accountData = accountData.map((accountSend, i) => {
    return {
      ...accountSend,
      recipientId: recipientIds[i],
    };
  });
  return accountData.reverse();
};

export const clearAccountSend = async (address: string, chainId: number) => {
  const localStorageKey = `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-${address}-${chainId}`;
  const localStorageCountKey = `${LOCALFORAGE_ACCOUNT_SEND_KEY_PREFIX}-count-${address}-${chainId}`;
  await Promise.all([localforage.removeItem(localStorageKey), localforage.removeItem(localStorageCountKey)]);
};
