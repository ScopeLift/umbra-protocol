/**
 * @notice Umbra Deployment script
 * Deploys the core Umbra contract, along with the Umbra Stealth Key Registry, checkilng for the correct
 * nonces at each step to ensure we get the same contract addresses across networks.
 * @dev To initialize a deploy:
 *   `yarn deploy --network <network>`   (where network specifies a network found in the hardhat.config.ts file)
 * If deploying to a local node (--network localhost), first start Hardhat using `yarn hardhat node`
 */

const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

const network = process.env.HARDHAT_NETWORK || '';

// Initialize object that will hold all deploy info. We'll continually update this and save it to
// a file using the save() method below
const parameters = {
  deployer: null,
  contracts: {}, // will be populated with all contract addresses
  actions: {}, // will be populated with deployment actions
};

// Setup for saving off deploy info to JSON files
const now = new Date().toISOString();
const folderName = './deploy-history';
const fileName = `${folderName}/${network}-${now}.json`;
const latestFileName = `${folderName}/${network}-latest.json`;
fs.mkdir(folderName, (err) => {
  if (err && err.code !== 'EEXIST') throw err;
});

//  save the deploy info to 2 JSON files:
//  first one named with network and timestamp, contains all relevant deployment info
//  second one name with network and "latest", contains only contract addresses deployed
const save = (value, field, subfield = undefined) => {
  if (subfield) {
    parameters[field][subfield] = value;
  } else {
    parameters[field] = value;
  }
  fs.writeFileSync(fileName, JSON.stringify(parameters));
};

// Send 0.01 ETH to oneself and wait for it to be mined, bumping the wallet's nonce
const doBumpNonceTx = async (wallet) => {
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther('0.01'),
  });

  console.log(`Executing nonce bump tx ${tx.hash}`);

  await tx.wait();
};

// IIFE async function so "await"s can be performed for each operation
(async function () {
  try {
    const deployParams = require('./deployParams.json');
    const deployParamsForNetwork = deployParams[network];

    // When testing deployment locally, the expected deployer is 0xBC425Bde78FD15fC6E35723887db8bC289E765dB, which
    // corresponds to address[0] of the mnemonic "test test test test test test test test test silent silent junk".
    // We could not use the default hardhat mnemonic because the nonce for that address on a forked Sepolia would
    // be unpredictable (since lots of people execute txs with that account).
    const { expectedDeployer, toll, tollCollector, tollReceiver, expectedRegistryNonce } = deployParamsForNetwork;

    console.log('Deploying to: ', network);
    save(network, 'actions', 'DeployingContractsToNetwork');

    const [deployerWallet] = await ethers.getSigners();
    save(deployerWallet.address, 'deployer');

    if (deployerWallet.address !== ethers.utils.getAddress(expectedDeployer)) {
      throw new Error(`Unexpected deployer address. Found ${deployerWallet.address}, expected ${expectedDeployer}.`);
    }

    let deployerNonce = await deployerWallet.getTransactionCount();

    if (deployerNonce !== 0) {
      throw new Error('Unexpected non-zero nonce before deploying Umbra');
    }

    // deploy the Umbra contract
    const Umbra = await ethers.getContractFactory('Umbra', deployerWallet);
    const umbra = await Umbra.deploy(toll, tollCollector, tollReceiver);
    await umbra.deployed();
    save(umbra.address, 'contracts', 'Umbra');
    console.log('Umbra contract deployed to address: ', umbra.address);

    // bump the nonce until the level needed for the registry
    deployerNonce = await deployerWallet.getTransactionCount();

    while (deployerNonce < expectedRegistryNonce) {
      console.log(`Deployer nonce is ${deployerNonce}`);
      await doBumpNonceTx(deployerWallet);
      deployerNonce = await deployerWallet.getTransactionCount();
    }

    // deploy the Registry contract
    const StealthKeyRegistry = await ethers.getContractFactory('StealthKeyRegistry', deployerWallet);
    const registry = await StealthKeyRegistry.deploy();
    await registry.deployed();
    save(registry.address, 'contracts', 'StealthKeyRegistry');
    console.log('StealthKeyRegistry contract deployed to address: ', registry.address);

    // everything went well, save the deployment info in the 'latest' JSON file
    fs.writeFileSync(latestFileName, JSON.stringify(parameters));

    // catch any error from operations above, log it and save it to deploy history file
  } catch (error) {
    save(error.toString(), 'actions', 'Error');
    console.log('Deployment Error: ', error.toString());
  }
})();
