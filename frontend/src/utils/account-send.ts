import { isAddress, keccak256, toUtf8Bytes, BigNumber, hexZeroPad } from 'src/utils/ethers';
import localforage from 'localforage';
import { LOCALFORAGE_ACOOUNT_SEND_KEY } from 'src/utils/constants';

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

const accountData = ({ address, advancedMode, checkbox }: AccountData) => {
  if (!isAddress(address)) {
    throw new Error('Invalid address');
  }
  const advancedModeBit = advancedMode ? '1' : '0';
  const checkboxBit = checkbox ? '1' : '0';
  const addressHex = BigNumber.from(address).toHexString() + advancedModeBit + checkboxBit;

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

  const advancedMode = hexData.slice(-1);
  const checkbox = hexData.slice(-2);
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
}: { chainId: number; viewingKey: string } & Omit<AccountSendData, 'dateSent'> & Omit<AccountData, 'address'>) => {
  // Send history is scoped by chain
  const key = `${LOCALFORAGE_ACOOUNT_SEND_KEY}-${userAddress}-${chainId}`;
  const count =
    ((await localforage.getItem(`${LOCALFORAGE_ACOOUNT_SEND_KEY}-count-${userAddress}-${chainId}`)) as number) || 0;
  const encryptedData = encryptAccountData({ address: recipientAddress, advancedMode, checkbox, count, viewingKey });
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
  await localforage.setItem(`${LOCALFORAGE_ACOOUNT_SEND_KEY}-count-${userAddress}-${chainId}`, count + 1);
};

export const fetchAccountSends = async ({
  address,
  viewingKey,
  chainId,
}: {
  chainId: number;
  address: string;
  viewingKey: string;
}) => {
  const key = `${LOCALFORAGE_ACOOUNT_SEND_KEY}-${address}-${chainId}`;
  const values = ((await localforage.getItem(key)) as (AccountSendData & EncryptedData)[]) || [];

  const accountData = [] as AccountSendData[];
  for (const [index, sendInfo] of values.entries()) {
    const decryptedData = decryptData({
      viewingKey,
      count: index,
      encryptedAddress: sendInfo.encryptedAddress,
    });
    accountData.push({
      recipientAddress: decryptedData.address,
      advancedMode: decryptedData.advancedMode === '1' ? true : false,
      checkbox: decryptedData.checkbox === '1' ? true : false,
      amount: sendInfo.amount,
      tokenAddress: sendInfo.tokenAddress,
      dateSent: sendInfo.dateSent,
      userAddress: sendInfo.userAddress,
      hash: sendInfo.hash,
    });
  }
  return accountData.reverse();
};
