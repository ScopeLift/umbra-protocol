import { computed, ref } from '@vue/composition-api';
import { ethers } from 'ethers';
import { KeyPair, Umbra } from '@umbra/umbra-js';
import { Signer, Provider, Network } from 'components/models';

/**
 * State is handled in reusable components, where each component is its own self-contained
 * file consisting of one function defined used the composition API.
 *
 * Since we want the wallet state to be shared between all instances when this file is imported,
 * we defined state outside of the function definition.
 */

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

// ========================================== Main Store ===========================================
export default function useWalletStore() {
  // ------------------------------------------- Actions -------------------------------------------
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
    setProvider,
    getPrivateKeys,
  };
}
