const { web3 } = require('hardhat');
const ethers = require('ethers');

const { BN } = web3.utils;
const { keccak256, defaultAbiCoder, arrayify, splitSignature } = ethers.utils;
const { AddressZero } = ethers.constants;

/**
 * Sum token amounts sent as strings and return a string
 * @param {object} Array of amounts as strings
 * @return {string} Sum of amounts as string
 */
const sumTokenAmounts = (amounts) => {
  /* eslint-disable */
  const sum = amounts.map((amount) => new BN(amount)).reduce((acc, val) => acc.add(val), new BN('0'));

  return sum.toString();
  /* eslint-enable */
};

/**
 * Sign a transaction for a metawithdrawal
 * @param {object} signer Ethers Wallet or other Signer type
 * @param {number|string} chainId Chain identifier where contract is deployed
 * @param {string} contract Umbra contract address
 * @param {string} acceptor Withdrawal destination
 * @param {string} token Address of token being withdrawn
 * @param {string} sponsor Address of relayer
 * @param {number|string} fee Amount sent to sponsor
 * @param {string} hook Address of post withdraw hook contract
 * @param {string|array} data Call data to be past to post withdraw hook
 */
const signMetaWithdrawal = async (
  signer,
  chainId,
  contract,
  acceptor,
  token,
  sponsor,
  fee,
  hook = AddressZero,
  data = '0x'
) => {
  const digest = keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'address', 'address', 'address', 'address', 'uint256', 'address', 'bytes'],
      [chainId, contract, acceptor, token, sponsor, fee, hook, data]
    )
  );

  const rawSig = await signer.signMessage(arrayify(digest));
  return splitSignature(rawSig);
};

module.exports.sumTokenAmounts = sumTokenAmounts;
module.exports.signMetaWithdrawal = signMetaWithdrawal;
