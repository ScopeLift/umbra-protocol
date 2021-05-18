export const getEtherscanUrl = (txHash: string, chainId: number) => {
  let networkPrefix = ''; // assume mainnet by default
  if (chainId === 1) networkPrefix = '';
  if (chainId === 3) networkPrefix = 'ropsten.';
  if (chainId === 4) networkPrefix = 'rinkeby.';
  if (chainId === 5) networkPrefix = 'goerli.';
  if (chainId === 42) networkPrefix = 'kovan.';
  return `https://${networkPrefix}etherscan.io/tx/${txHash}`;
};
