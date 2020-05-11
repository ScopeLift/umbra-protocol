const ethers = require('ethers');
const ensNamehash = require('eth-ens-namehash');
const addresses = require('../addresses.json');
const publicResolverAbi = require('../abi/PublicResolver.json');

const { ENS_PUBLIC_RESOLVER } = addresses;

const umbraKeySignature = 'vnd.umbra-v0-signature';
const umbraKeyBytecode = 'vnd.umbra-v0-bytecode';
const umbraMessage = 'This signature associates my public key with my ENS address for use with Umbra.';

/**
 * @notice Creates and returns a contract instance
 * @param {String} address contract address
 * @param {*} abi contract ABI
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 */
const createContract = (address, abi, provider) => {
  let ethersProvider = provider;
  // Convert regular provider to ethers provider
  if (!ethersProvider.getSigner) ethersProvider = new ethers.providers.Web3Provider(provider);
  // Use signer if available, otherwise use provider
  const signer = ethersProvider.getSigner();
  return new ethers.Contract(address, abi, signer || ethersProvider);
};

/**
 * @notice Computes ENS namehash of the input ENS domain, normalized to ENS compatibility
 * * @param {*} abi contract ABI
 * * @param {String} name ENS domain, e.g. myname.eth
 */
function namehash(name) {
  return ensNamehash.hash(ensNamehash.normalize(name));
}

/**
 * @notice For a given ENS domain, return the associated umbra signature or return
 * undefined if none exists
 * @param {String} name ENS domain, e.g. myname.eth
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 */
async function getSignature(name, provider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const signature = await publicResolver.text(namehash(name), umbraKeySignature);
  return signature;
}

/**
 * @notice For a given ENS domain, recovers and returns the public key from its signature
 * @param {String} name ENS domain, e.g. myname.eth
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 */
async function getPublicKey(name, provider) {
  // Get signature
  const signature = await getSignature(name, provider);
  if (!signature) return undefined;
  // Get digest
  const msgHash = ethers.utils.hashMessage(umbraMessage);
  const msgHashBytes = ethers.utils.arrayify(msgHash);
  // Perform recovery
  const publicKey = ethers.utils.recoverPublicKey(msgHashBytes, signature);
  return publicKey;
}

/**
 * @notice For a given ENS domain, recovers and returns the public key from its signature
 */
async function getPublicKeyFromSignature(signature) {
  const msgHash = ethers.utils.hashMessage(umbraMessage);
  const msgHashBytes = ethers.utils.arrayify(msgHash);
  const publicKey = await ethers.utils.recoverPublicKey(msgHashBytes, signature);
  return publicKey;
}

/**
 * @notice For a given ENS domain, return the associated umbra bytecode or return
 * undefined if none exists
 * @param {String} name ENS domain, e.g. myname.eth
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 */
async function getBytecode(name, provider) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const bytecode = await publicResolver.text(namehash(name), umbraKeyBytecode);
  return bytecode;
}

/**
 * @notice For a given ENS domain, sets the associated umbra signature
 * @param {String} name ENS domain, e.g. myname.eth
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 * @param {String} signature user's signature of the Umbra protocol message
 * @returns {String} Transaction hash
 */
async function setSignature(name, provider, signature) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const tx = await publicResolver.setText(namehash(name), umbraKeySignature, signature);
  await tx.wait();
  return tx.hash;
}

/**
 * @notice For a given ENS domain, sets the associated umbra bytecode
 * @param {String} name ENS domain, e.g. myname.eth
 * @param {*} provider raw web3 provider to use (not an ethers instance)
 * @param {String} bytecode contract bytecode to associate with ENS domain
 * @returns {String} Transaction hash
 */
async function setBytecode(name, provider, bytecode) {
  const publicResolver = createContract(ENS_PUBLIC_RESOLVER, publicResolverAbi, provider);
  const node = namehash(name);
  const tx = await publicResolver.setText(node, umbraKeyBytecode, bytecode);
  await tx.wait();
  return tx.hash;
}

module.exports = {
  // Functions
  namehash,
  getSignature,
  getPublicKey,
  getPublicKeyFromSignature,
  getBytecode,
  setSignature,
  setBytecode,
  // Constants
  umbraKeySignature,
  umbraKeyBytecode,
  umbraMessage,
};
