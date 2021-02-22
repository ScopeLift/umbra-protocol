const { web3 } = require('@openzeppelin/test-environment');
const ethers = require('ethers');

const { BN } = web3.utils;
const { keccak256, defaultAbiCoder, arrayify, splitSignature } = ethers.utils;

/**
 * Sum token amounts sent as strings and return a string
 * @param {object} Array of amounts as strings
 * @return {string} Sum of amounts as string
 */
const sumTokenAmounts = (amounts) => {
  const sum = amounts.map((amount) => new BN(amount)).reduce((acc, val) => acc.add(val), new BN('0'));

  return sum.toString();
};

/**
 * Sign a transaction for a metawithdrawal
 * @param {object} signer Ethers Wallet or other Signer type
 * @param {string} sponsor Address of relayer
 * @param {string} acceptor Withdrawal destination
 * @param {number|string} fee Amount sent to sponsor
 */
const signMetaWithdrawal = async (signer, sponsor, acceptor, fee) => {
  const digest = keccak256(defaultAbiCoder.encode(['address', 'address', 'uint256'], [sponsor, acceptor, fee]));

  const rawSig = await signer.signMessage(arrayify(digest));
  return splitSignature(rawSig);
};

module.exports.sumTokenAmounts = sumTokenAmounts;
module.exports.signMetaWithdrawal = signMetaWithdrawal;
