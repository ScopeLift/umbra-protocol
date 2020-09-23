/**
 * Umbra Proof of Concept
 *
 * References:
 *   - Example of signing message and recovering public key with ethers.js
 *     https://github.com/ethers-io/ethers.js/issues/447#issuecomment-519163178
 *   - Example of how to derive an Ethereum address from its private key
 *     https://hackernoon.com/utilizing-cryptography-libraries-to-derive-ethereum-addresses-from-private-keys-1bedd1a85bd
 */

/* eslint-disable no-console */
const ethers = require('ethers');
const RandomNumber = require('../classes/RandomNumber');
const KeyPair = require('../classes/KeyPair');

const { utils } = ethers;

/**
 * @notice Recover signers public key from signed message
 */
function recoverPublicKey(message, signature) {
  const messageHash = utils.hashMessage(message);
  const messageHashBytes = utils.arrayify(messageHash);
  return utils.recoverPublicKey(messageHashBytes, signature);
}

(async () => {
  // Step 0 ========================================================================================
  // Setup test accounts

  // Generate receiver's wallet
  const receiver = ethers.Wallet.createRandom();

  // Step 1 ========================================================================================
  // Recover recipient's public key from their private key

  // Have recipient sign message
  const message = 'I love Umbra!';
  const signature = await receiver.signMessage(message);

  // Recover their public key
  const recoveredPublicKey = recoverPublicKey(message, signature);
  if (recoveredPublicKey !== receiver.publicKey) {
    throw new Error("Recipient's public key was not properly recovered");
  }
  console.log('Step 1: Public key successfully recovered from recipient signature');

  // Step 2 ========================================================================================
  // Publish recipient's public key as ENS record

  // TODO: Not applicable for POC
  console.log('Step 2: N/A');

  // Step 3 ========================================================================================
  // Sender generates random number

  // Generate 32-byte random value with randomBytes
  const randomNumber = new RandomNumber();
  console.log('Step 3: 32-byte random number successfully generated');

  // Step 4 ========================================================================================
  // Sender securely sends random number to recipient

  // We do this before step 5 to ensure recipient receives random number before
  // sending funds to that address
  // TODO: Not applicable for POC
  console.log('Step 4: N/A');

  // Step 5 ========================================================================================
  // Sender computes receiving address and send funds

  const receiverPublicKey = new KeyPair(receiver.publicKey);
  const stealthPublicKey = receiverPublicKey.mulPublicKey(randomNumber);
  const stealthAddressFromPublic = stealthPublicKey.address;
  console.log('Step 5: Sender computed receiving address of ', stealthAddressFromPublic);

  // TODO Send funds

  // Step 6 ========================================================================================
  // Recipient computes required private key and retrieves funds

  // Get KeyPair instance from receiver's private key
  const receiverPrivateKey = new KeyPair(receiver.privateKey);

  // Ensure that the public key associated with receiverPrivateKey, which was generated from the
  // recipient's private key, has the same public key as the receiverPublicKey instance
  // generated from the public key published by the sender
  if (
    receiverPublicKey.publicKeyHexCoords.x !== receiverPrivateKey.publicKeyHexCoords.x ||
    receiverPublicKey.publicKeyHexCoords.y !== receiverPrivateKey.publicKeyHexCoords.y
  ) {
    console.log('X Components:');
    console.log(receiverPublicKey.publicKeyHexCoords.x);
    console.log(receiverPrivateKey.publicKeyHexCoords.x);
    console.log();
    console.log('Y Components:');
    console.log(receiverPublicKey.publicKeyHexCoords.y);
    console.log(receiverPrivateKey.publicKeyHexCoords.y);
    throw new Error('Public keys of the two elliptic instances do not match');
  }

  // Calculate stealth private key by multiplying private key with random value
  const stealthPrivateKey = receiverPrivateKey.mulPrivateKey(randomNumber);
  const stealthAddressFromPrivate = stealthPrivateKey.address;

  // Use private key to generate ethers wallet and check addresses
  console.log('Step 6: Checking that receiver computed same receiving address:');
  const stealthWallet = new ethers.Wallet(stealthPrivateKey.privateKeyHex);
  console.log('  Check 1: ', stealthWallet.address === stealthAddressFromPublic);
  console.log('  Check 2: ', stealthWallet.address === stealthAddressFromPrivate);

  if (stealthAddressFromPublic !== stealthAddressFromPrivate) {
    throw new Error('Stealth addresses do not match');
  }

  console.log();
  console.log('Complete! Outputs are below');
  console.log('  Stealth address:      ', stealthPrivateKey.address);
  console.log('  Stealth public key:   ', stealthPrivateKey.publicKeyHex);
  console.log('  Stealth private key:  ', stealthPrivateKey.privateKeyHex);
  console.log();

  // TODO Retrieve funds
})();
