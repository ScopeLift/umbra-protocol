const ethers = require('ethers');

/**
 * @notice Creates and returns a contract instance
 * @param {String} address contract address
 * @param {*} abi contract ABI
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 */
function createContract(address, abi, provider) {
  let ethersProvider = provider;
  // Convert regular provider to ethers provider
  if (!ethersProvider.getSigner) ethersProvider = new ethers.providers.Web3Provider(provider);
  // Use signer if available, otherwise use provider
  const signer = ethersProvider.getSigner();
  return new ethers.Contract(address, abi, signer || ethersProvider);
}

module.exports = {
  createContract,
};
