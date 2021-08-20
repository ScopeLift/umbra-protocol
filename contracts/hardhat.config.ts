import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(__dirname, './.env') });

import { HardhatUserConfig } from 'hardhat/config';
import { NetworkUserConfig } from 'hardhat/types';
import './tasks/accounts';
import './tasks/clean';

import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

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
// Note: So that the monorepo can be imported to other projects, we make these env variables
// optional so that typechain can still build its types without hard failing on this.
let mnemonic = '';
if (!process.env.MNEMONIC) {
  console.warn('Please set your MNEMONIC in a .env file');
} else {
  mnemonic = process.env.MNEMONIC;
}

let infuraApiKey = '';
if (!process.env.INFURA_ID) {
  console.warn('Please set your INFURA_ID in a .env file');
} else {
  infuraApiKey = process.env.INFURA_ID;
}

let etherscanApiKey = '';
if (!process.env.ETHERSCAN_API_KEY) {
  console.warn('Please set your ETHERSCAN_API_KEY in a .env file');
} else {
  etherscanApiKey = process.env.ETHERSCAN_API_KEY;
}

const shouldReportGas = process.env.REPORT_GAS === 'true';

function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url = `https://${network}.infura.io/v3/${infuraApiKey}`;
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
        path: "m/44'/60'/0'/0",
      },
    },
    goerli: createTestnetConfig('goerli'),
    kovan: createTestnetConfig('kovan'),
    rinkeby: createTestnetConfig('rinkeby'),
    ropsten: createTestnetConfig('ropsten'),
    mainnet: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['mainnet'],
      url: `https://mainnet.infura.io/v3/${infuraApiKey}`,
      gasPrice: 60000000000, // 60 gwei
    },
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.7',
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  gasReporter: {
    enabled: shouldReportGas,
    currency: 'USD',
    gasPrice: 200,
    excludeContracts: ['TestToken.sol', 'MockHook.sol', 'ERC20.sol', 'open_gsn/'],
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
};

export default config;
