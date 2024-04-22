import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(__dirname, './.env') });

import { HardhatUserConfig } from 'hardhat/config';
import './tasks/accounts';
import './tasks/clean';

import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-truffle5';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

const chainIds = {
  ganache: 1337,
  hardhat: 1337,
  mainnet: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  sepolia: 11155111,
  gnosis_chain: 100,
  base: 8453,
};

// Ensure that we have all the environment variables we need.
// Note: So that the monorepo can be imported to other projects, we make these env variables
// optional so that typechain can still build its types without hard failing on this.
let mnemonic = '';
if (!process.env.MNEMONIC) {
  console.warn('MNEMONIC not found in .env file, using default mnemonic');
  mnemonic = 'test test test test test test test test test test test junk';
} else {
  mnemonic = process.env.MNEMONIC;
}

let etherscanApiKey = '';
if (!process.env.ETHERSCAN_VERIFICATION_API_KEY) {
  console.warn('Please set your ETHERSCAN_API_KEY in a .env file');
} else {
  etherscanApiKey = process.env.ETHERSCAN_VERIFICATION_API_KEY;
}

const shouldReportGas = process.env.REPORT_GAS === 'true';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: String(process.env.SEPOLIA_RPC_URL),
      },
      chainId: chainIds.hardhat,
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
    },
    // For testing deployments locally with forked anvil environments. For example, to test
    // deployment to sepolia with a local fork first run:
    // anvil --fork-url <YOUR-RPC> --mnemonic "test test test test test test test test test silent silent junk"
    anvil: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['sepolia'],
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['sepolia'],
      url: String(process.env.SEPOLIA_RPC_URL),
    },
    mainnet: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['mainnet'],
      url: String(process.env.MAINNET_RPC_URL),
      gasPrice: 60000000000, // 60 gwei
    },
    polygon: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['polygon'],
      url: 'https://polygon-rpc.com/',
      gasPrice: 33000000000, // 33 gwei
    },
    arbitrum: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['arbitrum'],
      url: 'https://arb1.arbitrum.io/rpc',
    },
    optimism: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['optimism'],
      url: 'https://mainnet.optimism.io',
    },
    gnosis_chain: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['gnosis_chain'],
      url: 'https://rpc.ankr.com/gnosis',
    },
    base: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds['base'],
      url: process.env.BASE_RPC_URL,
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
    excludeContracts: ['TestToken.sol', 'MockHook.sol', 'ERC20.sol'],
  },
  etherscan: {
    apiKey: etherscanApiKey,
    customChains: [
      {
        network: 'base',
        chainId: chainIds['base'],
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org/',
        },
      },
    ],
  },
};

export default config;
