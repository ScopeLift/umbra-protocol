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
 * @param {number|string} chainId Chain identifier where contract is deployed
 * @param {string} version Umbra contract version
 * @param {string} acceptor Withdrawal destination
 * @param {string} token Address of token being withdrawn
 * @param {string} sponsor Address of relayer
 * @param {number|string} fee Amount sent to sponsor
 */
const signMetaWithdrawal = async (signer, chainId, version, acceptor, token, sponsor, fee) => {
  const digest = keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'string', 'address', 'address', 'address', 'uint256'],
      [chainId, version, acceptor, token, sponsor, fee],
    ),
  );

  const rawSig = await signer.signMessage(arrayify(digest));
  return splitSignature(rawSig);
};

module.exports.sumTokenAmounts = sumTokenAmounts;
module.exports.signMetaWithdrawal = signMetaWithdrawal;
