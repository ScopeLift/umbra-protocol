import { ethers } from 'ethers';

export type ExternalProvider =
  | ethers.providers.ExternalProvider
  | ethers.providers.JsonRpcFetchFunc;

export type SignatureLike =
  | {
      r: string;
      s?: string;
      _vs?: string;
      recoveryParam?: number;
      v?: number;
    }
  | ethers.BytesLike;
