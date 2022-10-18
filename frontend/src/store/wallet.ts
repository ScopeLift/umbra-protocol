import { computed, onMounted, ref, watch } from '@vue/composition-api';

import Onboard, { OnboardAPI } from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';
import coinbaseWalletModule from '@web3-onboard/coinbase';
import ledgerModule from '@web3-onboard/ledger';
import trezorModule from '@web3-onboard/trezor';

import { KeyPair, Umbra, StealthKeyRegistry, utils } from '@umbra/umbra-js';
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
import { BigNumber, Contract, Web3Provider, parseUnits } from 'src/utils/ethers';
import { UmbraApi } from 'src/utils/umbra-api';
import { getChainById } from 'src/utils/utils';
import useSettingsStore from 'src/store/settings';
import enLocal from 'src/i18n/locales/en-us.json';
import chLocal from 'src/i18n/locales/zh-cn.json';

// Wallet configurations.
const injected = injectedModule();
const walletConnect = walletConnectModule();
const coinbaseWalletSdk = coinbaseWalletModule();
const ledger = ledgerModule();
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

// ========================================== Main Store ===========================================
export default function useWalletStore() {
  const { lastWallet, setLastWallet } = useSettingsStore();

  onMounted(() => {
    // Initialize onboard.js if not yet done
    if (!onboard.value) {
      onboard.value = Onboard({
        wallets: [injected, walletConnect, coinbaseWalletSdk, ledger, trezor],
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
          'en-us': {
            connect: enLocal['connect'],
            modals: enLocal['modals'],
            accountCenter: enLocal['accountCenter'],
            notify: enLocal['notify'],
          },
          'zh-cn': {
            connect: chLocal['connect'],
            modals: chLocal['modals'],
            accountCenter: chLocal['accountCenter'],
            notify: chLocal['notify'],
          },
        },
        appMetadata: {
          name: 'Umbra',
          icon: '/icons/favicon-128x128.png',
          logo: '/icons/favicon-128x128.png',
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
      await connectWallet();
    }
  });

  // ------------------------------------------- Actions -------------------------------------------

  async function getTokenBalances() {
    // Setup
    if (!provider.value) throw new Error('Provider not connected');
    if (!relayer.value) throw new Error('Relayer instance not found');
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
    rawProvider.value = p;
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
          autoSelect: lastWallet.value,
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

      provider.value = new Web3Provider(rawProvider.value, 'any'); // the "any" network will allow spontaneous network changes: https://docs.ethers.io/v5/single-page/#/v5/concepts/best-practices/-%23-best-practices--network-changes
      signer.value = provider.value.getSigner();

      // Get user and network information
      const [_userAddress, _network, _relayer] = await Promise.all([
        signer.value.getAddress(), // get user's address
        provider.value.getNetwork(), // get information on the connected network
        UmbraApi.create(provider.value), // Configure the relayer (even if not withdrawing, this gets the list of tokens we allow to send)
      ]);
      await utils.assertSupportedAddress(_userAddress);

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

      // Set Umbra and StealthKeyRegistry classes
      umbra.value = new Umbra(provider.value, newChainId);
      stealthKeyRegistry.value = new StealthKeyRegistry(signer.value);

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
        // ENS address must exist
        avatar.value = await MAINNET_PROVIDER.getAvatar(_userEns);
      }

      // Check if user has legacy keys setup with their ENS or CNS names (if so, we hide Account Setup)
      const [_hasEnsKeys, _hasCnsKeys] = _isAccountSetup
        ? [false, false]
        : await Promise.all([
            Boolean(_userEns) && (await hasSetPublicKeysLegacy(_userEns as string, provider.value)),
            Boolean(_userCns) && (await hasSetPublicKeysLegacy(_userCns as string, provider.value)),
          ]);

      // Now we save the user's info to the store. We don't do this earlier because the UI is reactive based on these
      // parameters, and we want to ensure this method completed successfully before updating the UI
      relayer.value = _relayer;
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

    try {
      await provider.value?.send('wallet_switchEthereumChain', [{ chainId: chain.chainId }]);
    } catch (switchError) {
      const { code } = switchError as { code: number };

      // This error code indicates that the chain has not been added to MetaMask.
      if (code === 4902) {
        try {
          const eip3085Chain = <any>{ ...chain }; // without casting to any, TS errors on `delete` since we're deleting a required property
          delete eip3085Chain.logoURI; // if you don't remove extraneous fields, adding the chain will error
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
      ...(currentChain.value!.nativeCurrency as TokenInfoExtended),
      minSendAmount: relayer.value?.nativeTokenMinSendAmount || fallbackMinSend,
      chainId: chainId.value!,
    };
  });

  const tokens = computed((): TokenInfoExtended[] => {
    const sortedTokens = (relayer.value?.tokens || []).sort(
      // sort alphabetically
      (firstToken, secondToken) => firstToken.symbol.localeCompare(secondToken.symbol)
    );
    const nativeTokenIndex = sortedTokens.map((token) => token.address).indexOf(NATIVE_TOKEN_ADDRESS);
    if (nativeTokenIndex > -1) {
      // native token present
      return sortedTokens.sort((tok) => Number(tok.address != NATIVE_TOKEN_ADDRESS)); // move native token to front
    } else {
      // add native token to the front of the array
      return [NATIVE_TOKEN.value, ...sortedTokens];
    }
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
    getPrivateKeys,
    getTokenBalances,
    setIsAccountSetup,
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
  try {
    const stealthPubKeys = await utils.lookupRecipient(account, provider); // throws if no keys found
    return stealthPubKeys;
  } catch (err) {
    window.logger.warn(err);
    return null;
  }
}
