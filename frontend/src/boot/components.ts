import { Component } from 'vue';
import { boot } from 'quasar/wrappers';
import BaseButton from 'components/BaseButton.vue';
import BaseInput from 'components/BaseInput.vue';
import BaseSelect from 'components/BaseSelect.vue';
import LoadingSpinner from 'components/LoadingSpinner.vue';
import ProgressIndicator from 'components/ProgressIndicator.vue';

// more info on params: https://quasar.dev/quasar-cli/cli-documentation/boot-files#Anatomy-of-a-boot-file
export default boot(({ app }) => {
  app.component('base-button', BaseButton as unknown as Component);
  app.component('base-input', BaseInput as unknown as Component);
  app.component('base-select', BaseSelect as unknown as Component);
  app.component('loading-spinner', LoadingSpinner as unknown as Component);
  app.component('progress-indicator', ProgressIndicator as unknown as Component);
});
