import { ethers } from 'ethers';

export async function setEthereumData({ commit }, provider) {
  // Get user's wallet info from provider
  const ethersProvider = new ethers.providers.Web3Provider(provider);
  const signer = ethersProvider.getSigner();
  const userAddress = await signer.getAddress();
  const userEnsDomain = await ethersProvider.lookupAddress(userAddress);
  commit('setWallet', {
    signer, provider, ethersProvider, userAddress, userEnsDomain,
  });
}
