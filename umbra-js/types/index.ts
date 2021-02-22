import { ethers } from 'ethers';

export { SignatureLike } from '@ethersproject/bytes';
export { TransactionResponse } from '@ethersproject/providers';

export type ExternalProvider = ethers.providers.ExternalProvider | ethers.providers.JsonRpcFetchFunc;
