import { isAddress, keccak256, toUtf8Bytes, BigNumber, hexZeroPad, getAddress } from 'src/utils/ethers';
import localforage from 'localforage';
import { toAddress, lookupAddress } from 'src/utils/address';
import { LOCALFORAGE_ACCOUNT_SEND_KEY, MAINNET_PROVIDER } from 'src/utils/constants';
import { Web3Provider } from 'src/utils/ethers';

// Send data that is encrypted and stored in local storage
type AccountDataToEncrypt = {
  address: string;
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
  pubKey: string; // can be full or partial pubKey
};

// Used to create key which is used to encrypt account data
type KeyData = {
  encryptionCount: number;
  viewingKey: string;
};

// Encrypted values that are stored in local storage
type EncryptedAccountSendData = {
  encryptedAddress: string;
};

// Unencrypted values that are stored in local storage
type UnencryptedAcountSendData = {
  amount: string;
  tokenAddress: string;
  dateSent: Date;
  txHash: string;
  userAddress: string;
  recipientAddress: string;
};

type EncryptAccountDataArgs = KeyData & AccountDataToEncrypt;
type DecryptAccountDataArgs = KeyData & EncryptedAccountSendData;
type StoreSendArgs = { chainId: number; viewingKey: string; provider: Web3Provider } & Omit<
  AccountSendData,
  'dateSent' | 'recipientId'
> &
  Omit<AccountDataToEncrypt, 'address'>;
type FetchAccountSendArgs = {
  chainId: number;
  address: string;
  viewingKey: string;
};
// All values stored in local storage
type AccountSendDataWithEncryptedFields = UnencryptedAcountSendData & EncryptedAccountSendData;
// All values in local storage with encrypted values decrypted
type AccountSendData = UnencryptedAcountSendData & { recipientId: string } & Omit<AccountDataToEncrypt, 'address'>;

export const buildAccountDataForEncryption = ({
  address,
  advancedMode,
  pubKey,
  usePublicKeyChecked,
}: AccountDataToEncrypt) => {
  if (!isAddress(address)) {
    throw new Error('Invalid address');
  }
  if (pubKey.slice(0, 4) !== '0x04') {
    throw new Error('Invalid public key');
  }

  address = getAddress(address).slice(2); // slice off the `0x` prefix.
  const advancedModeHalfByte = advancedMode ? '1' : '0';
  const usePublicKeyCheckedHalfByte = usePublicKeyChecked ? '1' : '0';
  const remainingBytes = 11; // 20 bytes for address, 1 byte total for advancedMode and usePublicKeyChecked.

  // Store as much of the pubkey as we can in the remaining bytes. The first 4 characters are `0x04` so we skip those.
  const pubKeyStart = pubKey.slice(4, remainingBytes * 2 + 4); // Each slot is a half byte meaning remaining bytes must be multiplied by 2
  const dataToEncrypt = `${address}${advancedModeHalfByte}${usePublicKeyCheckedHalfByte}${pubKeyStart}`;
  if (dataToEncrypt.length !== 64) {
    // This should never happen.
    throw new Error(`Data to encrypt is not the correct length ${dataToEncrypt.length} instead of 64`);
  }

  return BigNumber.from(`0x${dataToEncrypt}`);
};

export const encryptAccountData = ({
  address,
  advancedMode,
  usePublicKeyChecked,
  encryptionCount,
  viewingKey,
  pubKey,
}: EncryptAccountDataArgs) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${encryptionCount}`));
  const data = buildAccountDataForEncryption({ address, advancedMode, usePublicKeyChecked, pubKey });
  const encryptedData = data.xor(key);
  return hexZeroPad(encryptedData.toHexString(), 32);
};

export const decryptData = ({ viewingKey, encryptionCount, encryptedAddress }: DecryptAccountDataArgs) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${encryptionCount}`));

  const decryptedData = BigNumber.from(encryptedAddress).xor(key);
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
  amount,
  tokenAddress,
  txHash,
  userAddress,
  provider,
  pubKey,
}: StoreSendArgs) => {
  // Send history is scoped by chain
  const key = `${LOCALFORAGE_ACCOUNT_SEND_KEY}-${userAddress}-${chainId}`;
  const count =
    ((await localforage.getItem(`${LOCALFORAGE_ACCOUNT_SEND_KEY}-count-${userAddress}-${chainId}`)) as number) || 0;
  const checksummedRecipientAddress = await toAddress(recipientAddress, provider);
  const encryptedData = encryptAccountData({
    address: checksummedRecipientAddress,
    advancedMode,
    usePublicKeyChecked,
    encryptionCount: count,
    viewingKey,
    pubKey,
  });
  const values = ((await localforage.getItem(key)) as AccountSendData[]) || [];
  await localforage.setItem(key, [
    ...values,
    {
      encryptedAddress: encryptedData,
      amount,
      tokenAddress,
      dateSent: new Date(),
      txHash,
    },
  ]);
  await localforage.setItem(`${LOCALFORAGE_ACCOUNT_SEND_KEY}-count-${userAddress}-${chainId}`, count + 1);
};

export const fetchAccountSends = async ({ address, viewingKey, chainId }: FetchAccountSendArgs) => {
  const key = `${LOCALFORAGE_ACCOUNT_SEND_KEY}-${address}-${chainId}`;
  const values = ((await localforage.getItem(key)) as AccountSendDataWithEncryptedFields[]) || [];

  const accountData = [] as AccountSendData[];
  for (const [index, sendInfo] of values.entries()) {
    const decryptedData = decryptData({
      viewingKey,
      encryptionCount: index,
      encryptedAddress: sendInfo.encryptedAddress,
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
      userAddress: sendInfo.userAddress,
      txHash: sendInfo.txHash,
      pubKey: decryptedData.pubKey,
    });
  }
  return accountData.reverse();
};
