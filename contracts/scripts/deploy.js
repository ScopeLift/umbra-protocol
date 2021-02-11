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

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const { BigNumber } = ethers;
const { parseEther } = ethers.utils;
const { AddressZero } = ethers.constants;

// Initialize object that will hold all deploy info. We'll continually update this and save it to
// a file using the save() method below
// const parameters = {
//   // TODO consider changing layout so a contract's constructor parameters live with its address
//   network,
//   admin: adminWallet.address,
//   contracts: { ETH: ETH_ADDRESS }, // will be populated with all contract addresses
// };

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

  const [adminWallet] = await ethers.getSigners();
  console.log("got to before deploy attempt");
  
  const Umbra = await ethers.getContractFactory('Umbra', adminWallet);
  console.log("got past contract factory");
  const umbra = await Umbra.deploy(1, adminWallet.address, adminWallet.address); // I'm sure the toll value & addresses should be different
  console.log("got past deploy");
  await umbra.deployed();

  console.log("Umbra contract deployed to address: ", umbra.address);
})();
