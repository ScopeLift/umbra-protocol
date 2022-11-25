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
  signature: string
) => {
  // TODO: Get signature as well

  const { encrypted, iv } = await encryptAddress(recipientAddress, privateKey);
  const value = ((await localforage.getItem(LOCALFORAGE_KEY)) as SendMetadataEncrypted[]) || [];
  const sendMetadata = {
    encryptedAddress: encrypted,
    amount: amount.toString(),
    dateSent: new Date(),
    tokenAddress,
    hash,
    iv,
  };
  await localforage.setItem(LOCALFORAGE_KEY, [
    ...value,
    {
      ...sendMetadata,
      signedMsg: signature,
    } as SendMetadataEncrypted,
  ]);
  console.log('Store send in localforage');
};

export const fetchAccountSend = async (
  privateKey: string,
  progress: (arg0: number) => void
): Promise<{ amount: string; address: string; dateSent: Date; hash: string; tokenAddress: string }[]> => {
  console.log('Fetch the first page or all depending on existing functionality');
  const value = (await localforage.getItem(LOCALFORAGE_KEY)) as SendMetadataEncrypted[];
  const accountSendValue = [];
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
