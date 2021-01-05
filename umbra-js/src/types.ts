import { ethers } from 'ethers';
import { Overrides } from '@ethersproject/contracts';

export { SignatureLike } from '@ethersproject/bytes';

export interface UmbraOverrides extends Overrides {
  payloadExtension?: string;
}

export type ExternalProvider =
  | ethers.providers.ExternalProvider
  | ethers.providers.JsonRpcFetchFunc;

export type EnsNamehash = {
  hash: (name: string) => string;
  normalize: (name: string) => string;
};
