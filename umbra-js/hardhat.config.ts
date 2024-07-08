import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(__dirname, './.env') });

import { HardhatUserConfig } from 'hardhat/config';
import { NetworkUserConfig } from 'hardhat/types';

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';

const chainIds = {
  ganache: 1337,
  sepolia: 11155111,
  hardhat: 1337,
  mainnet: 1,
  gnosis_chain: 100,
};

// Ensure that we have all the environment variables we need.
const mnemonic = 'test test test test test test test test test test test junk';

function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const rpcUrlString = `${network.toUpperCase()}_RPC_URL`;
  const url = process.env[rpcUrlString];
  if (!url) throw new Error(`Please set the ${url} in a .env file`);
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

const rpcUrlString = process.env.SEPOLIA_RPC_URL;
if (!rpcUrlString) throw new Error('Please set the SEPOLIA_RPC_URL in a .env file');
const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: rpcUrlString,
      },
      chainId: chainIds.hardhat,
      accounts: {
        count: 100,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/1'/0",
      },
    },
    sepolia: createTestnetConfig('sepolia'),
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
  mocha: {
    timeout: 120000,
  },
};

export default config;
