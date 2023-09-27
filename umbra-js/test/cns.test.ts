import '@nomiclabs/hardhat-ethers';
import { expect } from 'chai';
import { default as Resolution } from '@unstoppabledomains/resolution';
import * as cns from '../src/utils/cns';
import * as utils from '../src/utils/utils';
import { StaticJsonRpcProvider } from '../src/ethers';

// const ethersProvider = ethers.provider;
const resolution = new Resolution({
  sourceConfig: {
    uns: {
      locations: {
        Layer1: {
          url: `https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`,
          network: 'mainnet',
        },
        Layer2: {
          url: `https://polygon-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`,
          network: 'polygon-mainnet',
        },
      },
    },
  },
});

// Truth parameters to test against
const name = 'blockdudes.nft';
const nameSpendingPublicKey =
  '0x04044eb8172250ac55e7c32d42cbed2bc15798093c5a55fe2c5af1e019109de649a1df9d84219c3a74c21e7583ebc81e822827e9c8dce4e23dfe48fa7d1c87e2f1';
const nameViewingPublicKey =
  '0x04b1be486379952764a1cdd6af5e97aed6c266c5aa4ccf8e5c0d78d77234e2fe8983914a981cc46750dbc2b2238eb26684e091022c287107e21b5376ede8e8e768';

describe('СNS functions', () => {
  it('throws when namehash is not given a string', () => {
    // @ts-expect-error
    expect(() => cns.namehash(123, resolution)).to.throw('Name must be a string');
  });

  it('computes the namehash of a CNS domain', () => {
    const hash = cns.namehash(name, resolution);
    expect(hash).to.equal('0xe36da3a0bde173af5446ba3a17c97c0601d7d4c2356e3f3f84643aa3236814ee');
  });

  it('gets the public keys associated with a CNS address', async () => {
    const address = await resolution.addr(name, 'ETH');
    const ethersProvider = new StaticJsonRpcProvider(
      `https://polygon-mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`
    );
    const keys = await utils.lookupRecipient(address, ethersProvider);
    expect(keys.spendingPublicKey).to.equal(nameSpendingPublicKey);
    expect(keys.viewingPublicKey).to.equal(nameViewingPublicKey);
  });
});
