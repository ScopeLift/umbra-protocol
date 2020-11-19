// import something here
import { boot } from 'quasar/wrappers';
import BaseButton from 'components/BaseButton.vue';
import BaseInput from 'components/BaseInput.vue';
import BaseSelect from 'components/BaseSelect.vue';
import LoadingSpinner from 'components/LoadingSpinner.vue';

// more info on params: https://quasar.dev/quasar-cli/cli-documentation/boot-files#Anatomy-of-a-boot-file
export default boot(({ Vue }) => {
  Vue.component('base-button', BaseButton);
  Vue.component('base-input', BaseInput);
  Vue.component('base-select', BaseSelect);
  Vue.component('loading-spinner', LoadingSpinner);
});
