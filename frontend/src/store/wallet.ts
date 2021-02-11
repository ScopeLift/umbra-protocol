import { computed, onMounted, ref } from '@vue/composition-api';
import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { KeyPair, Umbra } from '@umbra/umbra-js';
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

// ============================================= State =============================================
// We do not publicly expose the state to provide control over when and how it's changed. It
// can only be changed through actions and mutations, and it can only be accessed with getters.
// As a result, only actions, mutations, and getters are returned from this function.
const provider = ref<Provider>();
const signer = ref<Signer>();
const userAddress = ref<string>();
const network = ref<Network>();
const umbra = ref<Umbra>();
const generationKeyPair = ref<KeyPair>();
const encryptionKeyPair = ref<KeyPair>();
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
    } else {
      // Rinkeby
      tokens.value = [
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
    const chainId = provider.value.network.chainId;
    const multicallAddress = multicallInfo.addresses[chainId];
    const multicall = new ethers.Contract(multicallAddress, multicallInfo.abi, provider.value);

    // Generate balance calls using Multicall contract
    const calls = tokens.value.map((token) => {
      const { address: tokenAddress } = token;
      const tokenContract = new ethers.Contract(tokenAddress, erc20.abi, signer.value);
      return {
        target: tokenAddress,
        callData: tokenContract.interface.encodeFunctionData('balanceOf', [userAddress.value]),
      };
    });

    // Add call for ETH balance
    calls.push({
      target: multicallAddress,
      callData: multicall.interface.encodeFunctionData('getEthBalance', [userAddress.value]),
    });

    // Send the call
    const response = await multicall.callStatic.aggregate(calls);
    const multicallResponse = (response as MulticallResponse).returnData;

    // Set balances mapping
    tokens.value.forEach((token, index) => {
      balances.value[token.address] = BigNumber.from(multicallResponse[index]);
    });
    balances.value[ETH_ADDRESS] = BigNumber.from(multicallResponse[multicallResponse.length - 1]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function setProvider(p: any) {
    // Set network/wallet properties
    provider.value = new ethers.providers.Web3Provider(p);
    signer.value = provider.value.getSigner();
    userAddress.value = await signer.value.getAddress();
    network.value = await provider.value.getNetwork();

    // Set Umbra class
    const chainId = provider.value.network.chainId;
    umbra.value = new Umbra(provider.value, chainId);

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
    if (generationKeyPair.value && encryptionKeyPair.value) {
      return 'success';
    }

    try {
      const keyPairs = await umbra.value.generatePrivateKeys(signer.value);
      generationKeyPair.value = keyPairs.generationKeyPair;
      encryptionKeyPair.value = keyPairs.encryptionKeyPair;
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
    userAddress: computed(() => userAddress.value),
    network: computed(() => network.value),
    getTokenList,
    setProvider,
    getPrivateKeys,
  };
}
