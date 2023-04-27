import { isAddress, keccak256, toUtf8Bytes, BigNumber, hexZeroPad } from 'src/utils/ethers';
import localforage from 'localforage';
import { toAddress, lookupAddress } from 'src/utils/address';
import { LOCALFORAGE_ACOUNT_SEND_KEY } from 'src/utils/constants';
import { Web3Provider } from 'src/utils/ethers';

type AccountData = {
  address: string;
  advancedMode: boolean;
  checkbox: boolean;
};

type KeyData = {
  count: number;
  viewingKey: string;
};

type EncryptedData = {
  encryptedAddress: string;
};

type AccountSendData = {
  amount: string;
  tokenAddress: string;
  dateSent: Date;
  hash: string;
  userAddress: string;
  recipientAddress: string;
  checkbox?: boolean;
  advancedMode?: boolean;
};

type DecryptedSendData = {
  recipientId: string;
};

const accountData = ({ address, advancedMode, checkbox }: AccountData) => {
  if (!isAddress(address)) {
    throw new Error('Invalid address');
  }
  const advancedModeByte = advancedMode ? '01' : '00';
  const checkboxByte = checkbox ? '01' : '00';
  const addressHex = BigNumber.from(address).toHexString() + advancedModeByte + checkboxByte;

  return BigNumber.from(hexZeroPad(addressHex, 32));
};

const encryptAccountData = ({ address, advancedMode, checkbox, count, viewingKey }: AccountData & KeyData) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${count}`));
  const data = accountData({ address, advancedMode, checkbox });
  const encryptedData = data.xor(key);
  return hexZeroPad(encryptedData.toHexString(), 32);
};

export const decryptData = ({ viewingKey, count, encryptedAddress }: KeyData & EncryptedData) => {
  const key = keccak256(toUtf8Bytes(`${viewingKey}${count}`));

  const decryptedData = BigNumber.from(encryptedAddress).xor(key);
  const hexData = decryptedData.toHexString();

  const advancedMode = hexData.slice(-1, -2);
  const checkbox = hexData.slice(-2, -3);
  return {
    advancedMode,
    checkbox,
    address: hexData.slice(0, -2),
  };
};

export const storeSend = async ({
  recipientAddress,
  chainId,
  advancedMode,
  checkbox,
  viewingKey,
  amount,
  tokenAddress,
  hash,
  userAddress,
  provider,
}: { chainId: number; viewingKey: string; provider: Web3Provider } & Omit<AccountSendData, 'dateSent'> &
  Omit<AccountData, 'address'>) => {
  // Send history is scoped by chain
  const key = `${LOCALFORAGE_ACOUNT_SEND_KEY}-${userAddress}-${chainId}`;
  const count =
    ((await localforage.getItem(`${LOCALFORAGE_ACOUNT_SEND_KEY}-count-${userAddress}-${chainId}`)) as number) || 0;
  const checksummedRecipientAddress = await toAddress(recipientAddress, provider);
  const encryptedData = encryptAccountData({
    address: checksummedRecipientAddress,
    advancedMode,
    checkbox,
    count,
    viewingKey,
  });
  const values = ((await localforage.getItem(key)) as AccountSendData & EncryptedData[]) || [];
  await localforage.setItem(key, [
    ...values,
    {
      encryptedAddress: encryptedData,
      amount,
      tokenAddress,
      dateSent: new Date(),
      hash,
    },
  ]);
  await localforage.setItem(`${LOCALFORAGE_ACOUNT_SEND_KEY}-count-${userAddress}-${chainId}`, count + 1);
};

export const fetchAccountSends = async ({
  address,
  viewingKey,
  chainId,
  provider,
}: {
  chainId: number;
  address: string;
  viewingKey: string;
  provider: Web3Provider;
}) => {
  const key = `${LOCALFORAGE_ACOUNT_SEND_KEY}-${address}-${chainId}`;
  const values = ((await localforage.getItem(key)) as (AccountSendData & EncryptedData)[]) || [];

  const accountData = [] as (AccountSendData & DecryptedSendData)[];
  for (const [index, sendInfo] of values.entries()) {
    const decryptedData = decryptData({
      viewingKey,
      count: index,
      encryptedAddress: sendInfo.encryptedAddress,
    });
    const recipientId = await lookupAddress(decryptedData.address, provider);
    accountData.push({
      recipientId: recipientId,
      recipientAddress: decryptedData.address,
      advancedMode: decryptedData.advancedMode === '01' ? true : false,
      checkbox: decryptedData.checkbox === '01' ? true : false,
      amount: sendInfo.amount,
      tokenAddress: sendInfo.tokenAddress,
      dateSent: sendInfo.dateSent,
      userAddress: sendInfo.userAddress,
      hash: sendInfo.hash,
    });
  }
  return accountData.reverse();
};
