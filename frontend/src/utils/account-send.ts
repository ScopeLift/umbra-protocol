import { isAddress, keccak256, toUtf8Bytes, BigNumber, hexZeroPad } from 'src/utils/ethers';
import localforage from 'localforage';
import { toAddress, lookupAddress } from 'src/utils/address';
import { LOCALFORAGE_ACOUNT_SEND_KEY, MAINNET_PROVIDER } from 'src/utils/constants';
import { Web3Provider } from 'src/utils/ethers';

// Send data that is encrypted and stored in local storage
type AccountDataToEncrypt = {
  address: string;
  advancedMode: boolean;
  usePublicKeyChecked: boolean;
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
type FetchAcountSendArgs = {
  chainId: number;
  address: string;
  viewingKey: string;
};
// All values stored in local storage
type AccountSendDataWithEncryptedFields = UnencryptedAcountSendData & EncryptedAccountSendData;
// All values in local storage with encrypted values decrypted
type AccountSendData = UnencryptedAcountSendData & { recipientId: string } & Omit<AccountDataToEncrypt, 'address'>;

const buildAccountDataForEncryption = ({ address, advancedMode, usePublicKeyChecked }: AccountDataToEncrypt) => {
  if (!isAddress(address)) {
    throw new Error('Invalid address');
  }
  const advancedModeByte = advancedMode ? '01' : '00';
  const usePublicKeyCheckedByte = usePublicKeyChecked ? '01' : '00';
  const addressHex = BigNumber.from(address).toHexString() + advancedModeByte + usePublicKeyCheckedByte;

  return BigNumber.from(hexZeroPad(addressHex, 32));
};

const encryptAccountData = ({
  address,
  advancedMode,
  usePublicKeyChecked,
  encryptionCount,
  viewingKey,
}: EncryptAccountDataArgs) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${encryptionCount}`));
  const data = buildAccountDataForEncryption({ address, advancedMode, usePublicKeyChecked });
  const encryptedData = data.xor(key);
  return hexZeroPad(encryptedData.toHexString(), 32);
};

export const decryptData = ({ viewingKey, encryptionCount, encryptedAddress }: DecryptAccountDataArgs) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${encryptionCount}`));

  const decryptedData = BigNumber.from(encryptedAddress).xor(key);
  const hexData = decryptedData.toHexString();

  const advancedMode = hexData.slice(-1, -2);
  const usePublicKeyChecked = hexData.slice(-2, -3);
  return {
    advancedMode,
    usePublicKeyChecked,
    address: hexData.slice(0, -4),
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
}: StoreSendArgs) => {
  // Send history is scoped by chain
  const key = `${LOCALFORAGE_ACOUNT_SEND_KEY}-${userAddress}-${chainId}`;
  const count =
    ((await localforage.getItem(`${LOCALFORAGE_ACOUNT_SEND_KEY}-count-${userAddress}-${chainId}`)) as number) || 0;
  const checksummedRecipientAddress = await toAddress(recipientAddress, provider);
  const encryptedData = encryptAccountData({
    address: checksummedRecipientAddress,
    advancedMode,
    usePublicKeyChecked,
    encryptionCount: count,
    viewingKey,
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
  await localforage.setItem(`${LOCALFORAGE_ACOUNT_SEND_KEY}-count-${userAddress}-${chainId}`, count + 1);
};

export const fetchAccountSends = async ({ address, viewingKey, chainId }: FetchAcountSendArgs) => {
  const key = `${LOCALFORAGE_ACOUNT_SEND_KEY}-${address}-${chainId}`;
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
      advancedMode: decryptedData.advancedMode === '01' ? true : false,
      usePublicKeyChecked: decryptedData.usePublicKeyChecked === '01' ? true : false,
      amount: sendInfo.amount,
      tokenAddress: sendInfo.tokenAddress,
      dateSent: sendInfo.dateSent,
      userAddress: sendInfo.userAddress,
      txHash: sendInfo.txHash,
    });
  }
  return accountData.reverse();
};
