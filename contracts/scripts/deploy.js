/**
 * @notice Umbra Deployment script
 * @dev At each contract deployment or transaction, we wait for the transaction to be mined before
 * continuing to the next step. This is done because it makes it simpler to continue from that spot
 * rather than restart the full deployment
 * @dev To initialize a deploy:
 *   `yarn deploy:umbra <network>`
 * If deploying to a local node, first start Hardhat using `yarn hardhat node`
 */
//require('dotenv').config();
const fs = require('fs');
const ethers = require('ethers'); // installed with yarn add -D ethers5@npm:ethers

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { BigNumber } = ethers;
const { parseEther } = ethers.utils;
const { AddressZero } = ethers.constants;

// ========================================= CONFIGURATION =========================================
// Define network configurations
//   rpcUrl is the node to connect to
//   adminPrivateKey is the private key for the address that will execute deploy txs and be system admin
const networkConfig = {
  localhost: {
    rpcUrl: 'http://127.0.0.1:8545/',
    adminPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // hardhat's default account 0
    overrides: {},
  },
  // rinkeby: {
  //   rpcUrl: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
  //   adminPrivateKey: process.env.PRIVATE_KEY,
  //   overrides: { gasPrice: BigNumber.from('1000000000') }, // 1 gwei gas price
  // },
};

// ============================================= SETUP =============================================
// Verify network is valid
const supportedNetworks = Object.keys(networkConfig);
const network = process.argv[2];
if (!supportedNetworks.includes(network)) {
  throw new Error('Invalid network');
}

// Configure signer and provider
const { adminPrivateKey, rpcUrl, overrides } = networkConfig[network];
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const adminWallet = new ethers.Wallet(adminPrivateKey).connect(provider);

// Initialize object that will hold all deploy info. We'll continually update this and save it to
// a file using the save() method below
const parameters = {
  // TODO consider changing layout so a contract's constructor parameters live with its address
  network,
  admin: adminWallet.address,
  contracts: { ETH: ETH_ADDRESS }, // will be populated with all contract addresses
};

// Setup for saving off deploy info to JSON file
const now = new Date().toISOString();
const folderName = './deploy-history';
const fileName = `${folderName}/${network}-${now}.json`;
fs.mkdir(folderName, (err) => {
  if (err && err.code !== 'EEXIST') throw err;
});

const save = (value, field, subfield = undefined) => {
  if (subfield) {
    parameters[field][subfield] = value;
  } else {
    parameters[field] = value;
  }
  fs.writeFileSync(fileName, JSON.stringify(parameters));
};

// IIFE async function so "await"s can be performed for each operation
(async function () {

  console.log("got to before deploy attempt");
  
  //const UmbraJson = require('../artifacts/contracts/Umbra.sol/Umbra.json');
  const UmbraJson = require('../build/contracts/Umbra.json');

  const Umbra = await ethers.ContractFactory(UmbraJson.abi, UmbraJson.bytecode, adminWallet);
  console.log("got past contract factory");
  const umbra = await Umbra.deploy(1, adminWallet.address, adminWallet.address); // I'm sure the toll value & addresses should be different
  console.log("got past deploy");
  await umbra.deployed();

  console.log("Umbra contract deployed to address: ", umbra.address);
})();
