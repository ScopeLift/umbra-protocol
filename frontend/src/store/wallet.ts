import { computed, onMounted, markRaw, ref, watch } from 'vue';

import Onboard, { OnboardAPI } from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import coinbaseWalletModule from '@web3-onboard/coinbase';
import trezorModule from '@web3-onboard/trezor';
import { KeyPair, StealthKeyRegistry, utils, Umbra } from '@umbracash/umbra-js';
import {
  Chain,
  MulticallResponse,
  NATIVE_TOKEN_ADDRESS,
  Network,
  Provider,
  Signer,
  supportedChains,
  supportedChainIds,
  TokenInfoExtended,
} from 'components/models';
import { formatNameOrAddress, lookupEnsName, lookupCnsName } from 'src/utils/address';
import { ERC20_ABI, MAINNET_PROVIDER, MULTICALL_ABI, MULTICALL_ADDRESS } from 'src/utils/constants';
import { BigNumber, Contract, ExternalProvider, Web3Provider, parseUnits } from 'src/utils/ethers';
import { UmbraApi } from 'src/utils/umbra-api';
import { getChainById } from 'src/utils/utils';
import { notifyUser } from 'src/utils/alerts';
import useSettingsStore from 'src/store/settings';
import enLocal from 'src/i18n/locales/en-US.json';
import chLocal from 'src/i18n/locales/zh-CN.json';

// Wallet configurations.
const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId: process.env.WALLET_CONNECT_PROJECT_ID || '',
  version: 2,
});
const coinbaseWalletSdk = coinbaseWalletModule();
const trezor = trezorModule({ email: 'contact@umbra.cash', appUrl: 'https://app.umbra.cash/' });

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
const isLoading = ref<boolean>(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawProvider = ref<any>(); // raw provider from the user's wallet, e.g. EIP-1193 provider
const provider = ref<Provider>(); // ethers provider
const signer = ref<Signer>(); // ethers signer
const userAddress = ref<string>(); // user's wallet address
const userEns = ref<string | null>(); // user's ENS name
const userCns = ref<string | null>(); // user's CNS name
const network = ref<Network>(); // connected network, derived from provider
const umbra = ref<Umbra>(); // instance of Umbra class
const stealthKeyRegistry = ref<StealthKeyRegistry>(); // instance of the StealthKeyRegistry class
const spendingKeyPair = ref<KeyPair>(); // KeyPair instance, with private key, for spending receiving funds
const viewingKeyPair = ref<KeyPair>(); // KeyPair instance, with private key, for scanning for received funds
const balances = ref<Record<string, BigNumber>>({}); // mapping from token address to user's wallet balance
const relayer = ref<UmbraApi>(); // used for managing relay transactions
const hasEnsKeys = ref(false); // true if user has set stealth keys on their ENS name // LEGACY
const hasCnsKeys = ref(false); // true if user has set stealth keys on their CNS name // LEGACY
const isAccountSetup = ref(false); // true if user has registered their address on the StealthKeyRegistry
const onboard = ref<OnboardAPI>(); // blocknative's onboard.js instance
const isArgent = ref<boolean>(false); // true if user connected an argent wallet
const stealthKeys = ref<{ spendingPublicKey: string; viewingPublicKey: string } | null>();
const avatar = ref<string | null>('');

// A few parts of state are exported directly under an alias, so that they can be accessed in TS
// files without running the `onMounted` hook below, since lifecycle injection APIs can only be
// used during execution of setup(), so importing `useWalletStore` in TS files would throw an error.
// These properties must be updated manually as they are not reactive. We refresh the page on
// network change, so this is ok, but if that ever changes we'll need to modify this.
export let providerExport = provider.value;
export let relayerExport = relayer.value;
export let tokensExport: TokenInfoExtended[] = [];

// ========================================== Main Store ===========================================
export default function useWalletStore() {
  const { lastWallet, setLastWallet } = useSettingsStore();

  onMounted(() => {
    // Initialize onboard.js if not yet done
    if (!onboard.value) {
      onboard.value = Onboard({
        wallets: [injected, walletConnect, coinbaseWalletSdk, trezor],
        chains: supportedChains.map((chain) => {
          return {
            id: chain.chainId,
            token: chain.nativeCurrency.symbol,
            label: chain.chainName,
            rpcUrl: chain.rpcUrls[0],
            icon: chain.logoURI,
          };
        }),
        accountCenter: {
          desktop: { enabled: false },
          mobile: { enabled: false },
        },
        i18n: {
          'en-US': {
            connect: enLocal['connect'],
            modals: enLocal['modals'],
            accountCenter: enLocal['accountCenter'],
            notify: enLocal['notify'],
          },
          'zh-CN': {
            connect: chLocal['connect'],
            modals: chLocal['modals'],
            accountCenter: chLocal['accountCenter'],
            notify: chLocal['notify'],
          },
        },
        appMetadata: {
          name: 'Umbra',
          icon: '/icons/favicon-128x128.svg',
          logo: '/icons/favicon-128x128.svg',
          description: 'Send stealth payments.',
          explore: 'https://app.umbra.cash/faq',
        },
      });
      const addresses = onboard.value.state.select('wallets');
      addresses.subscribe((update) => {
        update.map((wallet) => {
          wallet.provider.on('accountsChanged', () => {
            window.location.reload();
          });
          wallet.provider.on('chainChanged', () => {
            window.location.reload();
          });
        });
      });
    }
  });

  watch(lastWallet, async () => {
    if (lastWallet.value && !userAddress.value) {
      if (lastWallet.value === 'MetaMask') {
        const unlocked = await window.ethereum._metamask.isUnlocked();
        if (!unlocked) {
          setLoading(false);
          return;
        }
      }
      await connectWallet();
    }
  });

  // ------------------------------------------- Actions -------------------------------------------

  async function getTokenBalances() {
    // Setup
    if (!provider.value) throw new Error('Provider not connected');

    // No longer throwing here if we don't have a relayer, just notifying the user
    //  because we don't need the relayer for balances as that is done via contract calls
    if (!relayer.value) {
      const nativeToken = currentChain.value?.nativeCurrency.symbol
        ? currentChain.value?.nativeCurrency.symbol
        : 'native token';
      notifyUser('error', `Cannot connect to token relayer/API.. only ${nativeToken} transfers available.`);
    }

    const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider.value);

    // Generate balance calls using Multicall contract
    const calls = tokens.value.map((token) => {
      const { address: tokenAddress } = token;
      if (tokenAddress === currentChain.value?.nativeCurrency.address) {
        return {
          target: MULTICALL_ADDRESS,
          callData: multicall.interface.encodeFunctionData('getEthBalance', [userAddress.value]),
        };
      } else {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer.value);
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
      balances.value[token.address] = BigNumber.from(multicallResponse[index] === '0x' ? 0 : multicallResponse[index]);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setProvider(p: any) {
    // As mentioned in the other comment within the `configureProvider` function, Vue 3's reactivity
    // system is based on ES6 proxies. ES6 proxies break `this` binding, which caused issues with
    // Brave wallet. The solution is to use `markRaw` to prevent Vue from wrapping the value in a
    // Proxy. Out of an abundance of caution, we refresh the page on account or network change, so
    // we don't need to worry about reactivity of the provider and signer, which is why this
    // solution is ok. Read more here:
    //   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#no_private_property_forwarding
    //   - https://stackoverflow.com/questions/66358449/why-does-proxy-break-this-binding
    //   - https://vuejs.org/api/reactivity-advanced.html#markraw
    rawProvider.value = markRaw(p);
  }

  function setLoading(status: boolean) {
    isLoading.value = status;
  }

  async function connectWallet() {
    try {
      if (isLoading.value || !onboard.value) return;

      setLoading(true);
      let connectedWallet;
      if (lastWallet.value) {
        [connectedWallet] = await onboard.value.connectWallet({
          autoSelect: lastWallet?.value,
        });
      } else {
        [connectedWallet] = await onboard.value.connectWallet();
      }

      if (!connectedWallet) {
        // if the user just decides not to complete the connection
        setLoading(false);
        return;
      }

      setProvider(connectedWallet.provider);

      // Add wallet name to localStorage
      if (connectedWallet.label) setLastWallet(connectedWallet.label);

      // Get ENS name, CNS names, etc.
      await configureProvider();
    } catch (e) {
      resetState();
      setLoading(false);
      throw e;
    }
  }

  async function configureProvider() {
    try {
      resetState();
      setLoading(true);

      // Set network/wallet properties
      if (!rawProvider.value) {
        setLoading(false);
        return;
      }

      provider.value = markRaw(new Web3Provider(rawProvider.value as unknown as ExternalProvider, 'any')); // the "any" network will allow spontaneous network changes: https://docs.ethers.io/v5/single-page/#/v5/concepts/best-practices/-%23-best-practices--network-changes
      providerExport = provider.value;
      signer.value = markRaw(provider.value.getSigner());

      // Get user and network information
      const [_userAddress, _network] = await Promise.all([
        signer.value.getAddress(), // get user's address
        provider.value.getNetwork(), // get information on the connected network
      ]);
      await utils.assertSupportedAddress(_userAddress);

      // Configure the relayer (soft error handling, as we still want to allow the user to transfer native tokens if the relayer is down)
      let _relayer: UmbraApi | undefined;
      try {
        _relayer = await UmbraApi.create(provider.value);
      } catch (e) {
        console.log("couldn't create relayer", e);
        _relayer = undefined;
      }

      // If nothing has changed, no need to continue configuring.
      if (_userAddress === userAddress.value && _network.chainId === chainId.value) {
        setLoading(false);
        return;
      }

      // Exit if not a valid network
      const newChainId = provider.value.network.chainId; // must be done after the .getNetwork() calls
      if (!supportedChainIds.includes(_network.chainId)) {
        network.value = _network;
        setLoading(false);
        return;
      }

      // Set Umbra and StealthKeyRegistry classes.
      //
      // When assigning ethers objects as refs, we must wrap the object in `markRaw` for assignment. This wasn't required
      // by Vue 2's reactivity system based on Object.defineProperty, but is required for Vue 3's reactivity system based
      // on ES6 proxies. The Vue 3 reactivity system does not work well with non-configurable, non-writable properties on
      // objects, and many ethers classes, such as providers and networks, use non-configurable or non-writable properties.
      // Therefore we wrap the object in `markRaw` to prevent it from being converted to a Proxy. If you do not do this,
      // you'll see errors like this when using ethers objects as refs:
      //     Uncaught (in promise) TypeError: 'get' on proxy: property 'interface' is a read-only and non-configurable data
      //     property on the proxy target but the proxy did not return its actual value (expected '#<Object>' but got
      //     '[object Object]')
      // Read more here:
      //     - https://github.com/vuejs/vue-next/issues/3024
      //     - https://stackoverflow.com/questions/65693108/threejs-component-working-in-vuejs-2-but-not-3
      //     - https://vuejs.org/api/reactivity-advanced.html#markraw
      umbra.value = markRaw(new Umbra(provider.value, newChainId));
      stealthKeyRegistry.value = markRaw(new StealthKeyRegistry(signer.value));

      // Setup to check if user is connected with Argent, since we need to handle a few things differently in that case.
      // When using Argent, a user's funds are secured by the contract wallet, not by a private key. As a result:
      //   1. We inform the user that the security of their Umbra funds is not protected by the standard Argent
      //      security model
      //   2. If a user recovers their Argent wallet (e.g. migrates wallet to a new phone) they will have a new
      //      private key and be unable to access non-withdrawn Umbra funds unless they have the old device. Therefore
      //      we also let a user know about this
      //   3. As a consequence of 2, we require Argent user's to sign a message each time they visit the Umbra app.
      //      If the public keys generated do not match what's in the registry, we ask them to update their keys in
      //      the registry and notify them about funds that may be stuck if the user no longer has the old key
      const argentDetector = {
        // https://docs.argent.xyz/wallet-connect-and-argent#wallet-detection
        address: newChainId === 1 ? '0xeca4B0bDBf7c55E9b7925919d03CbF8Dc82537E8' : '0xF230cF8980BaDA094720C01308319eF192F0F311', // prettier-ignore
        abi: ['function isArgentWallet(address) external view returns (bool)'],
      };
      const detector = new Contract(argentDetector.address, argentDetector.abi, provider.value);

      // Get ENS name, CNS name, and check if user has registered their stealth keys
      const [_userEns, _userCns, _stealthKeys, _isArgent] = await Promise.all([
        lookupEnsName(_userAddress, MAINNET_PROVIDER as Web3Provider),
        lookupCnsName(_userAddress),
        getRegisteredStealthKeys(_userAddress, provider.value),
        [1, 3].includes(newChainId) ? detector.isArgentWallet(_userAddress) : false, // Argent is only on Mainnet and Ropsten
      ]);
      const _isAccountSetup = _stealthKeys !== null;

      if (typeof _userEns === 'string') {
        // ENS address must exist.
        // We don't await this because IPFS avatars can be slow to load and we don't want to block on this.
        MAINNET_PROVIDER.getAvatar(_userEns)
          .then((res) => (avatar.value = res))
          .catch((e) => window.logger.warn(e));
      }

      // Check if user has legacy keys setup with their ENS or CNS names (if so, we hide Account Setup)
      const [_hasEnsKeys, _hasCnsKeys] = _isAccountSetup
        ? [false, false]
        : await Promise.all([
            Boolean(_userEns) && (await hasSetPublicKeysLegacy(_userEns as string, MAINNET_PROVIDER as Web3Provider)),
            Boolean(_userCns) && (await hasSetPublicKeysLegacy(_userCns as string, MAINNET_PROVIDER as Web3Provider)),
          ]);

      // Now we save the user's info to the store. We don't do this earlier because the UI is reactive based on these
      // parameters, and we want to ensure this method completed successfully before updating the UI
      relayer.value = _relayer;
      relayerExport = relayer.value;
      userAddress.value = _userAddress;
      userEns.value = _userEns;
      userCns.value = _userCns;
      network.value = _network;
      hasEnsKeys.value = _hasEnsKeys; // LEGACY
      hasCnsKeys.value = _hasCnsKeys; // LEGACY
      isAccountSetup.value = _isAccountSetup;
      isArgent.value = _isArgent;
      stealthKeys.value = _isAccountSetup ? _stealthKeys : null;

      // Get token balances in the background. User may not be sending funds so we don't await this
      void getTokenBalances();

      setLoading(false);
    } catch (e) {
      resetState();
      setLoading(false);
      throw e;
    }
  }

  async function disconnectWallet() {
    if (isLoading.value || !onboard.value) return;
    const [primaryWallet] = onboard.value.state.get().wallets;
    await onboard.value.disconnectWallet({ label: primaryWallet.label });
    resetState();
    setLastWallet(null);
  }

  // WARNING: Only call this method at the same time as the `setLanguage` method in `settings.ts` to
  // ensure the language settings stay in sync.
  function setLanguage(language: string) {
    if (!onboard.value) return;
    onboard.value.state.actions.setLocale(language);
  }

  /**
   * @notice Prompts user for a signature to generate Umbra-specific private keys
   */
  async function getPrivateKeys() {
    if (!signer.value) throw new Error('No signer connected');
    if (!umbra.value) throw new Error('No Umbra instance available. Please make sure you are on a supported network');
    if (spendingKeyPair.value && viewingKeyPair.value) {
      return 'success';
    }

    try {
      const keyPairs = await umbra.value.generatePrivateKeys(signer.value);
      spendingKeyPair.value = keyPairs.spendingKeyPair;
      viewingKeyPair.value = keyPairs.viewingKeyPair;
      return 'success';
    } catch (err) {
      console.error(err);
      return 'denied'; // most likely user rejected the signature
    }
  }

  /**
   * @notice Prompts user for a signature to change network
   */
  async function setNetwork(chain: Chain) {
    setLoading(true);
    if (!provider.value) {
      setLoading(false);
      return;
    }

    try {
      await provider.value?.send('wallet_switchEthereumChain', [{ chainId: chain.chainId }]);
    } catch (switchError) {
      const { code } = switchError as { code: number };

      // This error code indicates that the chain has not been added to MetaMask.
      if (code === 4902) {
        try {
          // Extract EIP-3085 incompatible fields
          const { nativeCurrency, logoURI, iconUrls, blockExplorerUrls, rpcUrls, ...chainIdAndName } = { ...chain };
          if (!blockExplorerUrls) {
            throw new Error('blockExplorerUrls is missing');
          }
          const { address, logoURI: currencyLogoURI, ...nativeCurrencySummary } = nativeCurrency;
          const eip3085Chain = {
            nativeCurrency: nativeCurrencySummary,
            blockExplorerUrls: [...blockExplorerUrls],
            rpcUrls: [...rpcUrls],
            ...chainIdAndName,
          };
          await provider.value?.send('wallet_addEthereumChain', [eip3085Chain]);
        } catch (addError) {
          console.log(addError);
          setLoading(false);
        }
      } else {
        console.log(switchError);
        setLoading(false);
      }
    }
  }

  // ------------------------------------------ Mutations ------------------------------------------
  // Helper method to clear state. Useful when user switches wallets.
  function resetState() {
    provider.value = undefined;
    providerExport = undefined;
    signer.value = undefined;
    userAddress.value = undefined;
    userEns.value = undefined;
    userCns.value = undefined;
    network.value = undefined;
    umbra.value = undefined;
    stealthKeyRegistry.value = undefined;
    spendingKeyPair.value = undefined;
    viewingKeyPair.value = undefined;
    balances.value = {};
    relayer.value = undefined;
    relayerExport = undefined;
    hasEnsKeys.value = false;
    hasCnsKeys.value = false;
    isAccountSetup.value = false;
    isArgent.value = false;
    stealthKeys.value = undefined;
  }

  // Mark account setup complete after a user first registers their stealth keys
  function setIsAccountSetup(status: boolean) {
    isAccountSetup.value = status;
  }

  // Call this after a user completes account setup to ensure keysMatch is true
  function syncStealthKeys() {
    stealthKeys.value = {
      spendingPublicKey: <string>spendingKeyPair.value?.publicKeyHex,
      viewingPublicKey: <string>viewingKeyPair.value?.publicKeyHex,
    };
  }

  // ------------------------------------- Computed parameters -------------------------------------
  // "True" computed properties, i.e. derived from this module's state

  const chainId = computed(() => network.value?.chainId); // returns a number
  const currentChain = computed(() => getChainById(chainId.value || 1));

  const isSupportedNetwork = computed(() => {
    if (!network.value || !chainId.value) return true; // assume valid if we have no network information
    return supportedChainIds.includes(chainId.value);
  });

  const getNativeTokenMinSend = (chainId: number): string => {
    // These were values returned by the backend in April '22. If you're reading this, it
    // is possible network conditions have changed and these values should be updated.
    switch (chainId) {
      case 100:
        return parseUnits('0.5', 'ether').toString(); // Gnosis Chain
      case 137:
        return parseUnits('0.15', 'ether').toString(); // Polygon
      default:
        return parseUnits('0.02', 'ether').toString(); // everything else
    }
  };

  const NATIVE_TOKEN = computed(() => {
    // this value is used if the relayer is down
    const fallbackMinSend = getNativeTokenMinSend(chainId.value!);
    return {
      ...(currentChain.value?.nativeCurrency as TokenInfoExtended),
      minSendAmount: relayer.value?.nativeTokenMinSendAmount || fallbackMinSend,
      chainId: chainId.value!,
    };
  });

  const tokens = computed((): TokenInfoExtended[] => {
    // Sort alphabetically, putting the native token first.
    const initialTokens = relayer.value?.tokens || [];
    let tokensArray = initialTokens.sort((a, b) => {
      if (a.address == NATIVE_TOKEN_ADDRESS) return -5;
      if (b.address == NATIVE_TOKEN_ADDRESS) return 5;
      return a.symbol.localeCompare(b.symbol);
    });

    // If the native token is not present, add it to the beginning of the array.
    if (!tokensArray.length || tokensArray[0].address !== NATIVE_TOKEN_ADDRESS) {
      tokensArray = [NATIVE_TOKEN.value, ...tokensArray];
    }

    tokensExport = tokensArray;
    return tokensArray;
  });

  const userDisplayName = computed(() => {
    if (userCns.value) return userCns.value;
    if (userEns.value) return userEns.value;

    return userAddress.value ? formatNameOrAddress(userAddress.value) : undefined;
  });

  const keysMatch = computed(() => {
    if (stealthKeys.value && spendingKeyPair.value && viewingKeyPair.value) {
      if (
        stealthKeys.value.spendingPublicKey !== spendingKeyPair.value.publicKeyHex ||
        stealthKeys.value.viewingPublicKey !== viewingKeyPair.value.publicKeyHex
      ) {
        window.logger.warn('KEYS DO NOT MATCH:');
        window.logger.warn('spendingPublicKey (found):    ', stealthKeys.value.spendingPublicKey);
        window.logger.warn('spendingPublicKey (expected): ', spendingKeyPair.value.publicKeyHex);
        window.logger.warn('viewingPublicKey (found):     ', stealthKeys.value.viewingPublicKey);
        window.logger.warn('viewingPublicKey (expected):  ', viewingKeyPair.value.publicKeyHex);
        return false;
      }
      // Things matched, so just log them for debugging purposes
      window.logger.debug('stealthKeys.value.spendingPublicKey: ', stealthKeys.value.spendingPublicKey);
      window.logger.debug('stealthKeys.value.viewingPublicKey:  ', stealthKeys.value.viewingPublicKey);
      return true;
    }
    return null;
  });

  // ------------------------------------- Exposed parameters --------------------------------------
  // Define computed properties and parts of store that should be exposed. Everything exposed is a
  // computed property to facilitate reactivity and avoid accidental state mutations
  return {
    // Methods
    configureProvider,
    connectWallet,
    disconnectWallet,
    getPrivateKeys,
    getTokenBalances,
    setIsAccountSetup,
    setLanguage,
    setProvider,
    setNetwork,
    setHasEnsKeys: (status: boolean) => (hasEnsKeys.value = status), // LEGACY
    setHasCnsKeys: (status: boolean) => (hasCnsKeys.value = status), // LEGACY
    syncStealthKeys,
    // "Direct" properties, i.e. return them directly without modification
    balances: computed(() => balances.value),
    stealthKeyRegistry: computed(() => stealthKeyRegistry.value),
    hasKeys: computed(() => spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex),
    network: computed(() => network.value),
    isAccountSetup: computed(() => isAccountSetup.value),
    isAccountSetupLegacy: computed(() => hasEnsKeys.value || hasCnsKeys.value), // LEGACY
    isLoading: computed(() => isLoading.value),
    isArgent: computed(() => isArgent.value),
    provider: computed(() => provider.value),
    avatar: computed(() => avatar.value),
    relayer: computed(() => relayer.value),
    signer: computed(() => signer.value),
    spendingKeyPair: computed(() => spendingKeyPair.value),
    umbra: computed(() => umbra.value),
    userAddress: computed(() => userAddress.value),
    viewingKeyPair: computed(() => viewingKeyPair.value),
    // "True" computed properties, i.e. derived from this module's state
    chainId,
    currentChain,
    isSupportedNetwork: computed(() => isSupportedNetwork.value),
    keysMatch,
    NATIVE_TOKEN: computed(() => NATIVE_TOKEN.value),
    tokens: computed(() => tokens.value),
    userDisplayName: computed(() => userDisplayName.value),
    connectedWalletLabel: computed(() => lastWallet),
  };
}

// Helper method to check if user has ENS or CNS keys // LEGACY
const hasSetPublicKeysLegacy = async (name: string, provider: Provider) => {
  try {
    await utils.getPublicKeysLegacy(name, provider);
    return true;
  } catch (err) {
    window.logger.warn(err);
    return false;
  }
};

// Helper method to check if user has registered public keys in the StealthKeyRegistry
async function getRegisteredStealthKeys(account: string, provider: Provider) {
  let retryCounter = 0;
  while (retryCounter < 3) {
    try {
      console.log(`getting stealth keys for ${account}, try ${retryCounter + 1} of 3`);
      const stealthPubKeys = await utils.lookupRecipient(account, provider); // throws if no keys found
      return stealthPubKeys;
    } catch (err) {
      window.logger.warn(err);
      retryCounter++;
      if (retryCounter < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds
      }
    }
  }
  return null;
}
