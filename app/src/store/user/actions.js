import { ethers } from 'ethers';

export async function setEthereumData({ commit }, provider) {
  // Get user's wallet info from provider
  const ethersProvider = new ethers.providers.Web3Provider(provider);
  const signer = ethersProvider.getSigner();
  const userAddress = await signer.getAddress();
  const userEnsDomain = await ethersProvider.lookupAddress(userAddress);

  // Set network
  let networkName = 'other';
  if (provider.isPortis) networkName = 'ropsten'; // Portis
  else if (provider.chainId === '0x3') networkName = 'ropsten'; // MetaMask

  commit('setWallet', {
    signer, provider, ethersProvider, userAddress, userEnsDomain, networkName,
  });
}
