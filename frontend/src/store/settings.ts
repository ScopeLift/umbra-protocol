import { computed, onMounted, ref } from '@vue/composition-api';
import { Dark, LocalStorage } from 'quasar';

// Local storage key names
const settings = {
  isDark: 'is-dark',
  advancedMode: 'advanced-mode',
  lastWallet: 'last-wallet',
};

// Shared state between instances
const isDark = ref(false); // true if user has dark mode turned on
const advancedMode = ref(false); // true if user has advanced mode turned on
const startBlock = ref<number | undefined>(undefined); // block number to start scanning from
const endBlock = ref<number | undefined>(undefined); // block number to scan through
const scanPrivateKey = ref<string>(); // private key entered when scanning
const lastWallet = ref<string>(); // name of last wallet used

// Composition function for managing state
export default function useSettingsStore() {
  onMounted(() => {
    // Load settings
    setDarkMode(Boolean(LocalStorage.getItem(settings.isDark)));
    advancedMode.value = Boolean(LocalStorage.getItem(settings.advancedMode));
    lastWallet.value = LocalStorage.getItem(settings.lastWallet)
      ? String(LocalStorage.getItem(settings.lastWallet))
      : undefined;
  });

  function setDarkMode(status: boolean) {
    // In addition to Quasars `Dark` param, we use the isDark state value with this setter, so we can reactively track
    // the dark mode status in Vue
    isDark.value = status;
    Dark.set(status);
  }

  function toggleDarkMode() {
    setDarkMode(!isDark.value);
    LocalStorage.set(settings.isDark, isDark.value);
  }

  function toggleAdvancedMode() {
    advancedMode.value = !advancedMode.value;
    LocalStorage.set(settings.advancedMode, advancedMode.value);
  }

  function setScanBlocks(startBlock_: number, endBlock_: number) {
    startBlock.value = startBlock_;
    endBlock.value = endBlock_;
  }

  function setScanPrivateKey(key: string) {
    if (key.length === 64) key = `0x${key}`;
    scanPrivateKey.value = key; // we save this in memory for access by components, but do not save it to LocalStorage
  }

  function setLastWallet(walletName: string) {
    lastWallet.value = walletName;
    LocalStorage.set(settings.lastWallet, walletName);
  }

  function resetScanSettings() {
    startBlock.value = undefined;
    endBlock.value = undefined;
    scanPrivateKey.value = undefined;
  }

  return {
    toggleDarkMode,
    toggleAdvancedMode,
    setScanBlocks,
    setScanPrivateKey,
    setLastWallet,
    resetScanSettings,
    isDark: computed(() => isDark.value),
    advancedMode: computed(() => advancedMode.value),
    startBlock: computed(() => startBlock.value),
    endBlock: computed(() => endBlock.value),
    scanPrivateKey: computed(() => scanPrivateKey.value),
    lastWallet: computed(() => lastWallet.value),
  };
}
