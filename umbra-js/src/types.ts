import { ethers } from 'ethers';

export { SignatureLike } from '@ethersproject/bytes';

export type ExternalProvider =
  | ethers.providers.ExternalProvider
  | ethers.providers.JsonRpcFetchFunc;

export type EnsNamehash = {
  hash: (name: string) => string;
  normalize: (name: string) => string;
};
