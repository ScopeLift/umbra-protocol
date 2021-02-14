/**
 * @notice Umbra Deployment script
 * @dev At each contract deployment or transaction, we wait for the transaction to be mined before
 * continuing to the next step. This is done because it makes it simpler to continue from that spot
 * rather than restart the full deployment
 * @dev To initialize a deploy:
 *   `yarn deploy:umbra --network <network>`   (where network specifies a netwrk found in the hardhat.config.ts file)
 * If deploying to a local node (--network localhost), first start Hardhat using `yarn hardhat node`
 */
const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

const RINKEBY_PAYMASTER_PUBLIC_RELAYER_ADDRESS = '0x53C88539C65E0350408a2294C4A85eB3d8ce8789';

const deployParams = require('./deployParams.json');

// Initialize object that will hold all deploy info. We'll continually update this and save it to
// a file using the save() method below
const parameters = {
  // TODO consider changing layout so a contract's constructor parameters live with its address
  admin: null,
  contracts: {}, // will be populated with all contract addresses
  actions: {}, // will be populated with deployment actins
};

// Setup for saving off deploy info to JSON file
const now = new Date().toISOString();
const folderName = './deploy-history';
const fileName = `${folderName}/${now}.json`;
fs.mkdir(folderName, (err) => {
  if (err && err.code !== 'EEXIST') throw err;
});

// method to save the deploy info to a JSON file
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
    const [adminWallet] = await ethers.getSigners();
    save(adminWallet.address, 'admin');

    // deploy the Umbra contracts
    const Umbra = await ethers.getContractFactory('Umbra', adminWallet);
    const umbra = await Umbra.deploy(
      deployParams.toll,
      deployParams.tollCollector,
      deployParams.tollReceiver
    );
    await umbra.deployed();
    save(umbra.address, 'contracts', 'Umbra');
    console.log('Umbra contract deployed to address: ', umbra.address);

    const UmbraForwarder = await ethers.getContractFactory('UmbraForwarder', adminWallet);
    const umbraForwarder = await UmbraForwarder.deploy();
    await umbraForwarder.deployed();
    save(umbraForwarder.address, 'contracts', 'UmbraForwarder');
    console.log('UmbraForwarder contract deployed to address: ', umbraForwarder.address);

    const UmbraRelayRecipient = await ethers.getContractFactory('UmbraRelayRecipient', adminWallet);
    const umbraRelayRecipient = await UmbraRelayRecipient.deploy(
      umbra.address,
      umbraForwarder.address
    );
    await umbraRelayRecipient.deployed();
    save(umbraRelayRecipient.address, 'contracts', 'UmbraRelayRecipient');
    console.log('UmbraRelayRecipient contract deployed to address: ', umbraRelayRecipient.address);

    const UmbraPaymaster = await ethers.getContractFactory('UmbraPaymaster', adminWallet);
    const umbraPaymaster = await UmbraPaymaster.deploy(umbraRelayRecipient.address);
    await umbraPaymaster.deployed();
    save(umbraPaymaster.address, 'contracts', 'UmbraPaymaster');
    console.log('UmbraPaymaster contract deployed to address: ', umbraPaymaster.address);

    // set the relayer address on the Paymaster contract
    await umbraPaymaster.setRelayHub(RINKEBY_PAYMASTER_PUBLIC_RELAYER_ADDRESS);
    save(RINKEBY_PAYMASTER_PUBLIC_RELAYER_ADDRESS, 'actions', 'SetPaymasterRelayHub');
    console.log(
      'UmbraPaymaster relay hub set to address: ',
      RINKEBY_PAYMASTER_PUBLIC_RELAYER_ADDRESS
    );

    // Create transaction to send funds to Paymaster contract
    const tx = {
      to: umbraPaymaster.address,
      value: ethers.utils.parseEther('1'),
    };
    const receipt = await adminWallet.sendTransaction(tx);
    await receipt.wait();
    save(receipt.hash, 'actions', 'SendPaymasterFundsTx');
    console.log(`Transaction successful with hash: ${receipt.hash}`);

    // catch any error from operations above, log it and save it to deploy history file
  } catch (error) {
    save(error.toString(), 'actions', 'Error');
    console.log("Deployment Error: ", error.toString());
  }
})();
