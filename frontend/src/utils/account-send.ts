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
  signedMsg: string;
};

type SendMetadataDecrypted = {
  amount: string;
  address: string;
  dateSent: Date;
  hash: string;
  tokenAddress: string;
};

const encryptAddress = async (recipientAddress: string, privateKey: string) => {
  console.log('Encrpty recipient address');
  const iv = getRandomBytesSync(16);
  console.log(iv);
  // console.log(privateKey);
  // const x = hexToBytes(privateKey);
  // console.log(x);
  const encrypted = await encrypt(utf8ToBytes(recipientAddress), hexToBytes(privateKey), iv, 'aes-256-cbc');
  return { encrypted, iv };
};

export const storeSend = async (
  privateKey: string,
  recipientAddress: string,
  amount: BigNumber,
  tokenAddress: string,
  hash: string,
  signature: string,
  userAddress: string,
  chainId: number
) => {
  // TODO: Get signature as well
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
  console.log('Storing');
  console.log(`${LOCALFORAGE_KEY}-${userAddress}`);
  await localforage.setItem(key, [
    ...value,
    {
      ...sendMetadata,
      signedMsg: signature,
    } as SendMetadataEncrypted,
  ]);
  console.log('Store send in localforage');
};

export const fetchAccountSend = async (
  userAddress: string,
  chainId: number,
  privateKey: string,
  progress: (arg0: number) => void
): Promise<SendMetadataDecrypted[]> => {
  console.log('Fetch the first page or all depending on existing functionality');
  console.log(`${LOCALFORAGE_KEY}-${userAddress}`);
  const value = (await localforage.getItem(`${LOCALFORAGE_KEY}-${userAddress}-${chainId}`)) as SendMetadataEncrypted[];
  const accountSendValue = [] as SendMetadataDecrypted[];
  console.log(value);
  if (!value || value.length === 0) {
    return accountSendValue;
  }
  for (const [index, sendInfo] of value.entries()) {
    // iterate until
    // Also verify all signatures are correct
    // TODO add concept of signature
    // TODO: make this more concurrent
    console.log('Build and decrypt list');
    // TODO make sure this logic is the same as
    // the encrypt
    console.log(sendInfo);
    console.log(privateKey);
    const decryptedAddress = await decrypt(
      sendInfo.encryptedAddress,
      hexToBytes(privateKey),
      sendInfo.iv,
      'aes-256-cbc'
    );
    // const msgAddress = verifyMessage(
    //   JSON.stringify({
    //     amount: sendInfo.amount,
    //     tokenAddress: sendInfo.tokenAddress,
    //     address: decryptedAddress,
    //   }),
    //   sendInfo.signedMsg
    // );
    // if (msgAddress !== address) {
    //   console.error(`Signed message has address ${msgAddress} but should have ${address}`);
    //   continue;
    // }
    console.log(value.length);
    console.log(bytesToUtf8(decryptedAddress));
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
