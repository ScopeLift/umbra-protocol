/**
 * @notice Umbra Deployment script
 * @dev At each contract deployment or transaction, we wait for the transaction to be mined before
 * continuing to the next step. This is done because it makes it simpler to continue from that spot
 * rather than restart the full deployment
 * @dev To initialize a deploy:
 *   `yarn deploy --network <network>`   (where network specifies a netwrk found in the hardhat.config.ts file)
 * If deploying to a local node (--network localhost), first start Hardhat using `yarn hardhat node`
 */
const fs = require('fs');
const hre = require('hardhat');
const { exit } = require('process');
const { ethers } = hre;

const network = process.env.HARDHAT_NETWORK;
const shouldDeployGSN = process.env.DEPLOY_GSN === 'true';

// Initialize object that will hold all deploy info. We'll continually update this and save it to
// a file using the save() method below
const parameters = {
  admin: null,
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

// method to save the deploy info to 2 JSON files
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

// IIFE async function so "await"s can be performed for each operation
(async function () {
  try {
    const deployParams = require('./deployParams.json');
    const deployParamsForNetwork = deployParams[network];

    if (!deployParamsForNetwork) {
      console.log('Invalid network requested', network);
      save(network, 'actions', 'InvalidNetworkRequested');
      exit();
    }

    console.log('Deploying to: ', network);
    save(network, 'actions', 'DeployingContractsToNetwork');

    const [adminWallet] = await ethers.getSigners();
    save(adminWallet.address, 'admin');

    // deploy the Umbra contracts
    const Umbra = await ethers.getContractFactory('Umbra', adminWallet);
    const umbra = await Umbra.deploy(
      deployParamsForNetwork.toll,
      deployParamsForNetwork.tollCollector,
      deployParamsForNetwork.tollReceiver
    );
    await umbra.deployed();
    save(umbra.address, 'contracts', 'Umbra');
    console.log('Umbra contract deployed to address: ', umbra.address);

    if (shouldDeployGSN) {
      const UmbraForwarder = await ethers.getContractFactory('UmbraForwarder', adminWallet);
      const umbraForwarder = await UmbraForwarder.deploy();
      await umbraForwarder.deployed();
      save(umbraForwarder.address, 'contracts', 'UmbraForwarder');
      console.log('UmbraForwarder contract deployed to address: ', umbraForwarder.address);

      const UmbraRelayRecipient = await ethers.getContractFactory('UmbraRelayRecipient', adminWallet);
      const umbraRelayRecipient = await UmbraRelayRecipient.deploy(umbra.address, umbraForwarder.address);
      await umbraRelayRecipient.deployed();
      save(umbraRelayRecipient.address, 'contracts', 'UmbraRelayRecipient');
      console.log('UmbraRelayRecipient contract deployed to address: ', umbraRelayRecipient.address);

      const UmbraPaymaster = await ethers.getContractFactory('UmbraPaymaster', adminWallet);
      const umbraPaymaster = await UmbraPaymaster.deploy(umbraRelayRecipient.address);
      await umbraPaymaster.deployed();
      save(umbraPaymaster.address, 'contracts', 'UmbraPaymaster');
      console.log('UmbraPaymaster contract deployed to address: ', umbraPaymaster.address);

      // set the relayer address on the Paymaster contract
      const setRelayHubTxReceipt = await umbraPaymaster.setRelayHub(deployParamsForNetwork.payMasterPublicRelayer);
      setRelayHubTxReceipt.wait();
      save(deployParamsForNetwork.payMasterPublicRelayer, 'actions', 'SetPaymasterRelayHub');
      save(setRelayHubTxReceipt.hash, 'actions', 'SetPaymasterRelayHubTxHash');
      console.log(
        'UmbraPaymaster relay hub set to address: ',
        deployParamsForNetwork.payMasterPublicRelayer,
        ' at transaction hash:',
        setRelayHubTxReceipt.hash
      );

      const setTrustedForwaderTxReceipt = await umbraPaymaster.setTrustedForwarder(umbraForwarder.address);
      setTrustedForwaderTxReceipt.wait();
      save(umbraForwarder.address, 'actions', 'SetTrustedForwarder');
      save(setTrustedForwaderTxReceipt.hash, 'actions', 'SetTrustedForwarderTxHash');
      console.log(
        'UmbraPaymaster trusted forwarder set to address: ',
        umbraForwarder.address,
        ' at transaction hash: ',
        setTrustedForwaderTxReceipt.hash
      );

      // Create transaction to send funds to Paymaster contract
      const tx = {
        to: umbraPaymaster.address,
        value: ethers.utils.parseEther('1'),
        gasLimit: 1000000,
      };
      const receipt = await adminWallet.sendTransaction(tx);
      await receipt.wait();
      save(receipt.hash, 'actions', 'SendPaymasterFundsTx');
      console.log(`Paymaster funding transaction successful with hash: ${receipt.hash}`);
    }

    // everything went well, save the deployment info in the 'latest' JSON file
    fs.writeFileSync(latestFileName, JSON.stringify(parameters));

    // catch any error from operations above, log it and save it to deploy history file
  } catch (error) {
    save(error.toString(), 'actions', 'Error');
    console.log('Deployment Error: ', error.toString());
  }
})();
