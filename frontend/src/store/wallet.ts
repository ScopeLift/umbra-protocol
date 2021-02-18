import { computed, onMounted, ref } from '@vue/composition-api';
import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { DomainService, KeyPair, Umbra } from '@umbra/umbra-js';
import {
  Signer,
  Provider,
  Network,
  TokenInfo,
  TokenList,
  MulticallResponse,
} from 'components/models';
import multicallInfo from 'src/contracts/multicall.json';
import erc20 from 'src/contracts/erc20.json';

/**
 * State is handled in reusable components, where each component is its own self-contained
 * file consisting of one function defined used the composition API.
 *
 * Since we want the wallet state to be shared between all instances when this file is imported,
 * we defined state outside of the function definition.
 */

const jsonFetch = (url: string) => fetch(url).then((res) => res.json());
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const ETH_TOKEN = {
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  logoURI: '/tokens/eth.svg',
};

// Keep this type in sync with keys under multicall.json 'addresses' key
type SupportedChainIds = '1' | '3' | '4';

// ============================================= State =============================================
// We do not publicly expose the state to provide control over when and how it's changed. It
// can only be changed through actions and mutations, and it can only be accessed with getters.
// As a result, only actions, mutations, and getters are returned from this function.
const provider = ref<Provider>();
const signer = ref<Signer>();
const userAddress = ref<string>();
const userEns = ref<string>();
const network = ref<Network>();
const umbra = ref<Umbra>();
const domainService = ref<DomainService>();
const spendingKeyPair = ref<KeyPair>();
const viewingKeyPair = ref<KeyPair>();
const tokens = ref<TokenInfo[]>([]); // list of network tokens
const balances = ref<Record<string, ethers.BigNumber>>({}); // mapping from token address to user's balance

// ========================================== Main Store ===========================================
export default function useWalletStore() {
  onMounted(() => void getTokenList()); // dispatch in the background to get token details

  // ------------------------------------------- Actions -------------------------------------------
  async function getTokenList() {
    if (tokens.value.length > 0) return;
    if (provider.value?.network.chainId === 1) {
      // Mainnet
      const url = 'https://tokens.coingecko.com/uniswap/all.json';
      const response = (await jsonFetch(url)) as TokenList;
      tokens.value = response.tokens;
      tokens.value.push({ chainId: 1, ...ETH_TOKEN });
    } else {
      // Rinkeby
      tokens.value = [
        { chainId: 4, ...ETH_TOKEN },
        // prettier-ignore
        { chainId: 4, address: '0x2e055eee18284513b993db7568a592679ab13188', name: 'Dai', symbol: 'DAI', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774', },
        // prettier-ignore
        { chainId: 4, address: '0xeb8f08a975ab53e34d8a0330e0d34de942c95926', name: 'USD Coin', symbol: 'USDC', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389', },
      ];
    }
  }

  async function getTokenBalances() {
    // Setup
    if (!provider.value) throw new Error('Provider not connected');
    await getTokenList(); // does nothing if we already have the list
    const chainId = String(provider.value.network.chainId) as SupportedChainIds;
    const multicallAddress = multicallInfo.addresses[chainId];
    const multicall = new ethers.Contract(multicallAddress, multicallInfo.abi, provider.value);

    // Generate balance calls using Multicall contract
    const calls = tokens.value.map((token) => {
      const { address: tokenAddress } = token;
      if (tokenAddress === ETH_ADDRESS) {
        return {
          target: multicallAddress,
          callData: multicall.interface.encodeFunctionData('getEthBalance', [userAddress.value]),
        };
      } else {
        const tokenContract = new ethers.Contract(tokenAddress, erc20.abi, signer.value);
        return {
          target: tokenAddress,
          callData: tokenContract.interface.encodeFunctionData('balanceOf', [userAddress.value]),
        };
      }
    });

    // Send the call
    const response = await multicall.callStatic.aggregate(calls);
    const multicallResponse = (response as MulticallResponse).returnData;

    // Set balances mapping
    tokens.value.forEach((token, index) => {
      balances.value[token.address] = BigNumber.from(multicallResponse[index]);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function setProvider(p: any) {
    // Set network/wallet properties
    provider.value = new ethers.providers.Web3Provider(p);
    signer.value = provider.value.getSigner();
    userAddress.value = await signer.value.getAddress();
    userEns.value = await provider.value.lookupAddress(userAddress.value);
    network.value = await provider.value.getNetwork();

    // Set Umbra and DomainService classes
    const chainId = provider.value.network.chainId;
    umbra.value = new Umbra(provider.value, chainId);
    domainService.value = new DomainService(provider.value);

    // Get token balances in the background. User may not be sending funds so we don't await this
    void getTokenBalances();
  }

  /**
   * @notice Prompts user for a signature to generate Umbra-specific private keys
   */
  async function getPrivateKeys() {
    if (!signer.value) {
      throw new Error('No signer connected');
    }
    if (!umbra.value) {
      throw new Error('No Umbra instance available');
    }
    if (spendingKeyPair.value && viewingKeyPair.value) {
      return 'success';
    }

    try {
      const keyPairs = await umbra.value.generatePrivateKeys(signer.value);
      spendingKeyPair.value = keyPairs.spendingKeyPair;
      viewingKeyPair.value = keyPairs.viewingKeyPair;
      return 'success';
    } catch (err) {
      return 'denied'; // most likely user rejected the signature
    }
  }

  // ------------------------------------- Exposed parameters --------------------------------------
  // Define parts of store that should be exposed
  return {
    provider: computed(() => provider.value),
    signer: computed(() => signer.value),
    userAddress: computed(() => userEns.value || userAddress.value),
    userEns: computed(() => userEns.value),
    network: computed(() => network.value),
    tokens: computed(() => tokens.value),
    balances: computed(() => balances.value),
    umbra: computed(() => umbra.value),
    domainService: computed(() => domainService.value),
    spendingKeyPair: computed(() => spendingKeyPair.value),
    viewingKeyPair: computed(() => viewingKeyPair.value),
    getTokenList,
    getTokenBalances,
    setProvider,
    getPrivateKeys,
  };
}
