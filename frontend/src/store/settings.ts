import { computed, onMounted, ref } from '@vue/composition-api';
import { Dark, LocalStorage } from 'quasar';

// Local storage key names
const settings = {
  isDark: 'is-dark',
  advancedMode: 'advanced-mode',
  startBlock: 'start-block',
  endBlock: 'end-block',
};

// Shared state between instances
const isDark = ref(false); // true if user has dark mode turned on
const advancedMode = ref(false); // true if user has advanced mode turned on

// Composition function for managing state
export default function useSettingsStore() {
  onMounted(() => {
    setDarkMode(Boolean(LocalStorage.getItem('is-dark')));
    advancedMode.value = Boolean(LocalStorage.getItem(settings.advancedMode));
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

  return {
    toggleDarkMode,
    toggleAdvancedMode,
    isDark: computed(() => isDark.value),
    advancedMode: computed(() => advancedMode.value),
  };
}
