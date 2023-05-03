import { isAddress, keccak256, toUtf8Bytes, BigNumber, getAddress } from 'src/utils/ethers';
import localforage from 'localforage';
import { toAddress, lookupAddress } from 'src/utils/address';
import { LOCALFORAGE_ACCOUNT_SEND_KEY, MAINNET_PROVIDER } from 'src/utils/constants';
import { Web3Provider } from 'src/utils/ethers';

// Send data that is encrypted and stored in local storage
type AccountDataToEncrypt = {
  recipientAddress: string;
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
  pubKey: string;
};

// Used to create key which is used to encrypt account data
type KeyData = {
  encryptionCount: number;
  viewingKey: string;
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

type StoreSendArgs = {
  chainId: number;
  viewingKey: string;
  provider: Web3Provider;
  unencryptedAccountSendData: {
    amount: string;
    tokenAddress: string;
    txHash: string;
    senderAddress: string;
  };
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
  pubKey: string;
  recipientAddress: string;
};

type FetchAccountSendArgs = {
  chainId: number;
  address: string;
  viewingKey: string;
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
  if (!isAddress(recipientAddress)) {
    throw new Error('Invalid recipientAddress');
  }
  if (pubKey.slice(0, 4) !== '0x04') {
    throw new Error('Invalid public key');
  }

  recipientAddress = getAddress(recipientAddress).slice(2); // slice off the `0x` prefix.
  const advancedModeHalfByte = advancedMode ? '1' : '0';
  const usePublicKeyCheckedHalfByte = usePublicKeyChecked ? '1' : '0';
  const remainingBytes = 11; // 20 bytes for the receiver's address, 1 byte total for advancedMode and usePublicKeyChecked.

  // Store as much of the pubkey as we can in the remaining bytes. The first 4 characters are `0x04` so we skip those.
  const pubKeyStart = pubKey.slice(4, remainingBytes * 2 + 4); // Each hex character is a half byte meaning remaining bytes must be multiplied by 2
  const dataToEncrypt = `${recipientAddress}${advancedModeHalfByte}${usePublicKeyCheckedHalfByte}${pubKeyStart}`;
  if (dataToEncrypt.length !== 64) {
    // This should never happen.
    throw new Error(`Data to encrypt is not the correct length: found ${dataToEncrypt.length}, expected 64`);
  }

  return BigNumber.from(`0x${dataToEncrypt}`);
};

export const encryptAccountData = (accountDataToEncrypt: AccountDataToEncrypt, keyData: KeyData) => {
  const { recipientAddress, advancedMode, usePublicKeyChecked, pubKey } = accountDataToEncrypt;
  const key = keccak256(toUtf8Bytes(`${keyData.viewingKey}${keyData.encryptionCount}`));
  const data = buildAccountDataForEncryption({ recipientAddress, advancedMode, usePublicKeyChecked, pubKey });
  const encryptedData = data.xor(key);
  return encryptedData.toHexString();
};

export const decryptData = (accountSendCiphertext: string, keyData: KeyData) => {
  const key = keccak256(toUtf8Bytes(`${keyData.viewingKey}${keyData.encryptionCount}`));

  const decryptedData = BigNumber.from(accountSendCiphertext).xor(key);
  const hexData = decryptedData.toHexString();

  const paritalPubKey = hexData.slice(44);
  const advancedMode = hexData.slice(42, 43);
  const usePublicKeyChecked = hexData.slice(43, 44);
  return {
    advancedMode,
    usePublicKeyChecked,
    address: hexData.slice(0, 42),
    pubKey: paritalPubKey,
  };
};

export const storeSend = async ({
  recipientAddress,
  chainId,
  advancedMode,
  usePublicKeyChecked,
  viewingKey,
  unencryptedAccountSendData,
  provider,
  pubKey,
}: StoreSendArgs) => {
  const { amount, tokenAddress, txHash, senderAddress } = unencryptedAccountSendData;
  // Send history is scoped by chain
  const key = `${LOCALFORAGE_ACCOUNT_SEND_KEY}-${senderAddress}-${chainId}`;
  const count =
    ((await localforage.getItem(`${LOCALFORAGE_ACCOUNT_SEND_KEY}-count-${senderAddress}-${chainId}`)) as number) || 0;
  const checksummedRecipientAddress = await toAddress(recipientAddress, provider);
  const keyData = {
    encryptionCount: count,
    viewingKey,
  };
  const accountDataToEncrypt = {
    recipientAddress: checksummedRecipientAddress,
    advancedMode,
    usePublicKeyChecked,
    pubKey,
  };
  const encryptedData = encryptAccountData(accountDataToEncrypt, keyData);
  const values = ((await localforage.getItem(key)) as AccountSendData[]) || [];
  await localforage.setItem(key, [
    ...values,
    {
      accountSendCiphertext: encryptedData,
      amount,
      tokenAddress,
      dateSent: new Date(),
      txHash,
    },
  ]);
  await localforage.setItem(`${LOCALFORAGE_ACCOUNT_SEND_KEY}-count-${senderAddress}-${chainId}`, count + 1);
};

export const fetchAccountSends = async ({ address, viewingKey, chainId }: FetchAccountSendArgs) => {
  const key = `${LOCALFORAGE_ACCOUNT_SEND_KEY}-${address}-${chainId}`;
  const values = ((await localforage.getItem(key)) as AccountSendDataWithEncryptedFields[]) || [];

  const accountData = [] as AccountSendData[];
  for (const [index, sendInfo] of values.entries()) {
    const decryptedData = decryptData(sendInfo.accountSendCiphertext, {
      viewingKey,
      encryptionCount: index,
    });
    const recipientId = await lookupAddress(decryptedData.address, MAINNET_PROVIDER);
    accountData.push({
      recipientId: recipientId,
      recipientAddress: decryptedData.address,
      advancedMode: decryptedData.advancedMode === '1' ? true : false,
      usePublicKeyChecked: decryptedData.usePublicKeyChecked === '1' ? true : false,
      amount: sendInfo.amount,
      tokenAddress: sendInfo.tokenAddress,
      dateSent: sendInfo.dateSent,
      senderAddress: sendInfo.senderAddress,
      txHash: sendInfo.txHash,
      pubKey: decryptedData.pubKey,
    });
  }
  return accountData.reverse();
};
