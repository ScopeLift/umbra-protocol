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
const EC = require('elliptic').ec;
const { Buffer } = require('buffer/');
const { keccak256 } = require('js-sha3');
const ethers = require('ethers');
const RandomNumber = require('./RandomNumber');
const PublicKey = require('./Keys');

const ec = new EC('secp256k1');
const { utils } = ethers;

/**
 * @notice If value is not 64 characters long, leading zeros were stripped and we should add
 * them back. It seems elliptic sometimes strips leading zeros when pulling out x and y
 * coordinates from public keys which can cause errors when checking that keys match
 * @param {String} hex String to pad, without leading 0x
 */
function pad32ByteHex(hex) {
  if (!utils.isHexString) throw new Error('Input is not a valid hex string');
  if (hex.slice(0, 2) === '0x') { throw new Error('Input must not contain 0x prefix'); }
  return hex.padStart(64, 0);
}

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

  const receiverPublicKey = new PublicKey(receiver.publicKey);
  const stealthPublicKey = receiverPublicKey.mul(randomNumber.asHexWithoutPrefix);
  const stealthAddress = stealthPublicKey.address;
  console.log('Step 5: Sender computed receiving address of ', stealthAddress);

  // TODO Send funds

  // Step 6 ========================================================================================
  // Recipient computes required private key and retrieves funds

  // Generate elliptic instance from receiver's private key. We remove the 0x prefix
  // as required by elliptic
  const receiverPrivateKeyEC = ec.keyFromPrivate(receiver.privateKey.slice(2));

  // Check that this public key associated with receiverPrivateKeyEC, which was generated from the
  // recipient's private key, has the same public key as the elliptic instance
  // generated from the public key published by the sender
  if (
    receiverPublicKey.coordinatesAsHexString.x !== pad32ByteHex(receiverPrivateKeyEC.getPublic().getX().toString('hex'))
    || receiverPublicKey.coordinatesAsHexString.y !== pad32ByteHex(receiverPrivateKeyEC.getPublic().getY().toString('hex'))
  ) {
    console.log('X Components:');
    console.log(receiverPublicKey.coordinatesAsHexString.x);
    console.log(pad32ByteHex(receiverPrivateKeyEC.getPublic().getX().toString('hex')));
    console.log();
    console.log('Y Components:');
    console.log(receiverPublicKey.coordinatesAsHexString.y);
    console.log(pad32ByteHex(receiverPrivateKeyEC.getPublic().getY().toString('hex')));
    throw new Error('Public keys of the two elliptic instances do not match');
  }

  // Calculate stealth private key by multiplying private key with random value. This
  // gives us an arbitrarily large number that is not necessarily in the domain of
  // the secp256k1 elliptic curve
  const receiverPrivateKeyBN = ethers.BigNumber.from(
    `0x${receiverPrivateKeyEC.getPrivate().toString('hex')}`,
  );
  const stealthPrivateKeyFull = receiverPrivateKeyBN.mul(randomNumber.asBigNumber).toHexString().slice(2);

  // Modulo operation to get private key to be in correct range, where ec.n gives the
  // order of our curve
  const stealthPrivateKeyBN = ethers.BigNumber.from(`0x${stealthPrivateKeyFull}`);
  const stealthPrivateKey = stealthPrivateKeyBN.mod(`0x${ec.n.toString('hex')}`);

  // Get stealth public key by multiplying private key (with the 0x prefix removed) by
  // the curve's generator point, given by ec.g
  const stealthPublicKeyXY2 = ec.g.mul(stealthPrivateKey.toHexString().slice(2));
  const stealthPublicKeyX2 = stealthPublicKeyXY2.getX().toString('hex');
  const stealthPublicKeyY2 = stealthPublicKeyXY2.getY().toString('hex');

  // Public Key = X and Y concatenated
  const stealthPublicKey2 = stealthPublicKeyX2 + stealthPublicKeyY2;

  // Take the hash of that public key
  const stealthPublicKeyHash2 = keccak256(Buffer.from(stealthPublicKey2, 'hex'));

  // Convert hash to buffer, where last 20 bytes are the Ethereum address
  const stealthAddressBuffer2 = Buffer.from(stealthPublicKeyHash2, 'hex');
  const stealthAddress2 = `0x${stealthAddressBuffer2.slice(-20).toString('hex')}`;

  // Use private key to generate ethers wallet and check addresses
  console.log('Step 6: Checking that receiver computed same receiving address:');
  const stealthWallet = new ethers.Wallet(stealthPrivateKey);
  console.log('  Check 1: ', stealthWallet.address === utils.getAddress(stealthAddress));
  console.log('  Check 2: ', stealthWallet.address === utils.getAddress(stealthAddress2));

  if (stealthAddress !== stealthAddress2) {
    throw new Error('Stealth addresses do not match');
  }

  console.log();
  console.log('Complete! Outputs are below');
  console.log('  Stealth address:      ', stealthAddress);
  console.log('  Stealth public key:   ', stealthPublicKey.publicKey);
  console.log('  Stealth private key:  ', stealthPrivateKey.toHexString());
  console.log();

  // TODO Retrieve funds
})();
