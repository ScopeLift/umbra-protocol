// import something here
import { boot } from 'quasar/wrappers';
import BaseButton from 'components/BaseButton.vue';
import BaseInput from 'components/BaseInput.vue';
import BaseSelect from 'components/BaseSelect.vue';
import LoadingSpinner from 'components/LoadingSpinner.vue';
import ProgressIndicator from 'components/ProgressIndicator.vue';

// more info on params: https://quasar.dev/quasar-cli/cli-documentation/boot-files#Anatomy-of-a-boot-file
export default boot(({ app }) => {
  app.component('base-button', BaseButton);
  app.component('base-input', BaseInput);
  app.component('base-select', BaseSelect);
  app.component('loading-spinner', LoadingSpinner);
  app.component('progress-indicator', ProgressIndicator);
});
