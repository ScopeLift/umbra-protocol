import { computed, onMounted, ref } from '@vue/composition-api';
import { LocalStorage } from 'quasar';

// Shared state between instances
const advancedMode = ref(false); // true if user has advanced mode turned on

// Composition function for managing state
export default function useSettingsStore() {
  onMounted(() => (advancedMode.value = Boolean(LocalStorage.getItem('advanced-mode'))));

  function toggleAdvancedMode() {
    advancedMode.value = !advancedMode.value;
    LocalStorage.set('advanced-mode', advancedMode.value);
  }

  return { toggleAdvancedMode, advancedMode: computed(() => advancedMode.value) };
}
