const ethers = require('ethers');

const { utils } = ethers;
const provider = ethers.getDefaultProvider();

/**
 * @notice Adds leading zeroes to ensure 32-byte hex strings are the expected length.
 * @dev We always expect a hex value to have the full number of characters for its size,
 * so we use this tool to ensure no errors occur due to wrong hex character lengths.
 * Specifically, we need to pad hex values during the following cases:
 *   1. It seems elliptic strips unnecessary leading zeros when pulling out x and y
 *      coordinates from public keys.
 *   2. When computing a new private key from a random number, the new number (i.e. the new
 *      private key) may not necessarily require all 32-bytes as ethers.js also seems to
 *      strip leading zeroes.
 * @param {String} hex String to pad, without leading 0x
 */
module.exports.pad32ByteHex = (hex) => {
  if (!utils.isHexString) throw new Error('Input is not a valid hex string');
  if (hex.slice(0, 2) === '0x') { throw new Error('Input must not contain 0x prefix'); }
  return hex.padStart(64, 0);
};

/**
 * @notice Convert hex string with 0x prefix into Buffer
 * @param {String} data Hex string to convert
 */
module.exports.hexStringToBuffer = (data) => Buffer.from(utils.arrayify(data));

/**
  * @notice Given a transaction hash, return the public key of the transaction's sender
  * @dev See https://github.com/ethers-io/ethers.js/issues/700 for an example of
  * recovering public key from a transaction with ethers
  * @param {String} txHash Transaction hash to recover public key from
  */
module.exports.recoverPublicKeyFromTransaction = async (txHash) => {
  // Get transaction data
  const tx = await provider.getTransaction(txHash);

  // Get original signature
  const splitSignature = {
    r: tx.r,
    s: tx.s,
    v: tx.v,
  };
  const signature = ethers.utils.joinSignature(splitSignature);

  // Reconstruct transaction data that was originally signed
  const txData = {
    chainId: tx.chainId,
    data: tx.data,
    gasLimit: tx.gasLimit,
    gasPrice: tx.gasPrice,
    nonce: tx.nonce,
    to: tx.to, // this works for both regular and contract transactions
    value: tx.value,
  };

  // Properly format it to get the correct message
  const resolvedTx = await ethers.utils.resolveProperties(txData);
  const rawTx = ethers.utils.serializeTransaction(resolvedTx);
  const msgHash = ethers.utils.keccak256(rawTx);
  const msgBytes = ethers.utils.arrayify(msgHash);

  // Recover sender's public key and address
  const publicKey = ethers.utils.recoverPublicKey(msgBytes, signature);
  return publicKey;
};
