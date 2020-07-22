import { ethers } from 'ethers';
import { DomainService } from 'umbra-js';
import { Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';

const addresses = require('../../../../addresses.json');

const { ENS_REGISTRY, CNS_REGISTRY } = addresses;

export async function setEthereumData({ commit }, provider) {
  // Get user's wallet info from provider
  const ethersProvider = new ethers.providers.Web3Provider(provider);
  const udWrappedProvider = Eip1993Factories.fromWeb3Version0Provider(provider);
  const udResolution = new Resolution({
    blockchain: {
      ens: {
        provider: udWrappedProvider,
        registry: ENS_REGISTRY,
      },
      cns: {
        provider: udWrappedProvider,
        registry: CNS_REGISTRY,
      },
    },
  });
  const domainService = new DomainService(provider, udResolution);
  const signer = ethersProvider.getSigner();
  const userAddress = await signer.getAddress();
  const userEnsDomain = await ethersProvider.lookupAddress(userAddress);

  // Set network
  let networkName = 'other';
  if (provider.isPortis) networkName = 'ropsten'; // Portis
  else if (provider.chainId === '0x3') networkName = 'ropsten'; // MetaMask

  commit('setWallet', {
    signer,
    provider,
    ethersProvider,
    udResolution,
    domainService,
    userAddress,
    userEnsDomain,
    networkName,
  });
}

export async function checkDomain({ commit, state }, domainName) {
  const { ethersProvider } = state;
  const signer = ethersProvider.getSigner();
  const userAddress = await signer.getAddress();

  const { udResolution } = state;
  const ownerAddress = await udResolution.owner(domainName);
  if (userAddress === ownerAddress) {
    commit('setUserDomain', domainName);
    return true;
  }

  return false;
}
