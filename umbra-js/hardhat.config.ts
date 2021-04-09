import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(__dirname, './.env') });

import { HardhatUserConfig } from 'hardhat/config';
import { NetworkUserConfig } from 'hardhat/types';

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 1337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
};

// Ensure that we have all the environment variables we need.
const mnemonic = 'test test test test test test test test test test test junk';

const infuraApiKey = process.env.INFURA_ID;
if (!infuraApiKey) throw new Error('Please set your INFURA_ID in a .env file');

function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url = `https://${network}.infura.io/v3/${infuraApiKey as string}`;
  return {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: `https://rinkeby.infura.io/v3/${infuraApiKey}`,
      },
      chainId: chainIds.hardhat,
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/1'/0",
      },
    },
    goerli: createTestnetConfig('goerli'),
    kovan: createTestnetConfig('kovan'),
    rinkeby: createTestnetConfig('rinkeby'),
    ropsten: createTestnetConfig('ropsten'),
  },
  paths: {
    cache: './cache',
    tests: './test',
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.6.12',
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
};

export default config;
