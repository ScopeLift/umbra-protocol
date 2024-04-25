import { computed, onMounted, ref } from 'vue';
import { Dark, LocalStorage } from 'quasar';
import { isHexString } from 'src/utils/ethers';
import { i18n } from '../boot/i18n';
import { Language, UmbraApiVersion } from '../components/models';

// Local storage key names
const settings = {
  isDark: 'is-dark',
  advancedMode: 'advanced-mode',
  lastWallet: 'last-wallet',
  language: 'language',
  sendHistorySave: 'send-history-save',
  UmbraApiVersion: 'umbra-api-version',
};

// Shared state between instances
const isDark = ref(false); // true if user has dark mode turned on
const advancedMode = ref(false); // true if user has advanced mode turned on
const sendHistorySave = ref(true); // true if user send history is saved, false if it is not
const language = ref<Language>({ label: '', value: '' }); //language code
const supportedLanguages = [
  { label: 'English', value: 'en-US' },
  { label: '中文', value: 'zh-CN' },
];
const startBlock = ref<number | undefined>(undefined); // block number to start scanning from
const endBlock = ref<number | undefined>(undefined); // block number to scan through
const scanPrivateKey = ref<string>(); // private key entered when scanning
const lastWallet = ref<string>(); // name of last wallet used
const params = new URLSearchParams(window.location.search);
const paramLocale = params.get('locale') || undefined;

// Composition function for managing state
export default function useSettingsStore() {
  onMounted(() => {
    // Load settings
    setDarkMode(Boolean(LocalStorage.getItem(settings.isDark)));
    advancedMode.value = Boolean(LocalStorage.getItem(settings.advancedMode));
    const saveSetting = LocalStorage.getItem(settings.sendHistorySave);
    sendHistorySave.value = saveSetting || saveSetting === null ? true : false;
    lastWallet.value = LocalStorage.getItem(settings.lastWallet)
      ? String(LocalStorage.getItem(settings.lastWallet))
      : undefined;
  });
  setLanguage(
    paramLocale
      ? { label: getLanguageLabel(paramLocale), value: paramLocale }
      : LocalStorage.getItem(settings.language)
      ? (LocalStorage.getItem(settings.language) as Language)
      : { label: getLanguageLabel(i18n.global.locale), value: i18n.global.locale }
  );

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

  function toggleSendHistory() {
    sendHistorySave.value = !sendHistorySave.value;
    LocalStorage.set(settings.sendHistorySave, sendHistorySave.value);
  }

  function setLanguage(newLanguage: Language) {
    // xx-yy was changed to xx-YY with the quasar v1 -> v2 upgrade, so we need to handle that.
    if (newLanguage.value === 'en-us') newLanguage.value = 'en-US';
    else if (newLanguage.value === 'zh-cn') newLanguage.value = 'zh-CN';

    // Now we set the language.
    language.value = newLanguage;
    i18n.global.locale = <'en-US' | 'zh-CN'>language.value.value;
    LocalStorage.set(settings.language, language.value);
  }

  function getLanguageLabel(languageValue: string) {
    for (let i = 0; i < supportedLanguages.length; i++) {
      if (supportedLanguages[i].value === languageValue) {
        return supportedLanguages[i].label;
      }
    }
    return '';
  }

  function setScanBlocks(startBlock_: number, endBlock_: number) {
    startBlock.value = startBlock_;
    endBlock.value = endBlock_ || undefined;
  }

  function setScanPrivateKey(key: string) {
    const check1 = key === '';
    const check2 = key.length === 66 && isHexString(key);
    const isValid = check1 || check2;
    if (!isValid) throw new Error(`Invalid private key '${key}'`);
    scanPrivateKey.value = key; // we save this in memory for access by components, but do not save it to LocalStorage
  }

  function setLastWallet(walletName: string | null) {
    if (walletName === null) {
      LocalStorage.remove(settings.lastWallet);
      return;
    }
    lastWallet.value = walletName;
    LocalStorage.set(settings.lastWallet, walletName);
  }

  function resetScanSettings() {
    startBlock.value = undefined;
    endBlock.value = undefined;
    scanPrivateKey.value = undefined;
  }

  function getUmbraApiVersion(): UmbraApiVersion | null {
    const storedVersion = LocalStorage.getItem(settings.UmbraApiVersion);
    if (storedVersion) {
      return storedVersion as UmbraApiVersion;
    } else {
      return null;
    }
  }

  function setUmbraApiVersion(version: UmbraApiVersion) {
    LocalStorage.set(settings.UmbraApiVersion, version);
  }

  function clearUmbraApiVersion() {
    LocalStorage.remove(settings.UmbraApiVersion);
  }

  return {
    toggleDarkMode,
    toggleAdvancedMode,
    toggleSendHistory,
    setLanguage,
    setScanBlocks,
    setScanPrivateKey,
    setLastWallet,
    resetScanSettings,
    supportedLanguages,
    isDark: computed(() => isDark.value),
    advancedMode: computed(() => advancedMode.value),
    sendHistorySave: computed(() => sendHistorySave.value),
    language: computed(() => language.value),
    startBlock: computed(() => startBlock.value),
    endBlock: computed(() => endBlock.value),
    scanPrivateKey: computed(() => scanPrivateKey.value),
    lastWallet: computed(() => lastWallet.value),
    getUmbraApiVersion,
    setUmbraApiVersion,
    clearUmbraApiVersion,
  };
}
