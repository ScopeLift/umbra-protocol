import { encrypt, decrypt } from 'ethereum-cryptography/aes';
import { hexToBytes, utf8ToBytes, bytesToUtf8 } from 'ethereum-cryptography/utils';
import { getRandomBytesSync } from 'ethereum-cryptography/random';
import localforage from 'localforage';
import { BigNumber } from './ethers';

const LOCALFORAGE_KEY = 'acountSends';

type SendMetadataEncrypted = {
  encryptedAddress: Uint8Array;
  amount: string;
  tokenAddress: string;
  dateSent: Date;
  hash: string;
  iv: Uint8Array;
};

type SendMetadataDecrypted = {
  amount: string;
  address: string;
  dateSent: Date;
  hash: string;
  tokenAddress: string;
};

const encryptAddress = async (recipientAddress: string, privateKey: string) => {
  const iv = getRandomBytesSync(16);
  const encrypted = await encrypt(utf8ToBytes(recipientAddress), hexToBytes(privateKey), iv, 'aes-256-cbc');
  return { encrypted, iv };
};

export const storeSend = async (
  privateKey: string,
  recipientAddress: string,
  amount: BigNumber,
  tokenAddress: string,
  hash: string,
  userAddress: string,
  chainId: number
) => {
  const key = `${LOCALFORAGE_KEY}-${userAddress}-${chainId}`;

  const { encrypted, iv } = await encryptAddress(recipientAddress, privateKey);
  const value = ((await localforage.getItem(key)) as SendMetadataEncrypted[]) || [];
  const sendMetadata = {
    encryptedAddress: encrypted,
    amount: amount.toString(),
    dateSent: new Date(),
    tokenAddress,
    hash,
    iv,
  };
  await localforage.setItem(key, [
    ...value,
    {
      ...sendMetadata,
    } as SendMetadataEncrypted,
  ]);
};

export const fetchAccountSend = async (
  userAddress: string,
  chainId: number,
  privateKey: string,
  progress: (arg0: number) => void
): Promise<SendMetadataDecrypted[]> => {
  const value = (await localforage.getItem(`${LOCALFORAGE_KEY}-${userAddress}-${chainId}`)) as SendMetadataEncrypted[];
  const accountSendValue = [] as SendMetadataDecrypted[];
  if (!value || value.length === 0) {
    return accountSendValue;
  }
  for (const [index, sendInfo] of value.entries()) {
    const decryptedAddress = await decrypt(
      sendInfo.encryptedAddress,
      hexToBytes(privateKey),
      sendInfo.iv,
      'aes-256-cbc'
    );
    progress((100 * (index + 1)) / value.length);
    accountSendValue.push({
      amount: sendInfo.amount,
      dateSent: sendInfo.dateSent,
      hash: sendInfo.hash,
      address: bytesToUtf8(decryptedAddress),
      tokenAddress: sendInfo.tokenAddress,
    });
  }
  return accountSendValue;
};
