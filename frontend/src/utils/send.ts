import { JsonRpcSigner } from './ethers';

type SendSchema = {
  recipientId: string;
  advancedMode: boolean;
  randomNumber: number;
};

// Sign send data
export const signSend = (signer: JsonRpcSigner, data: SendSchema) => {
  return signer.signMessage(JSON.stringify(data));
};

// encrypt derives a public key
// and get shared secret gets the secret from that
// public and private key

// Encrypt send data
// ...
// export const encrypt;

// Decrypt send data
