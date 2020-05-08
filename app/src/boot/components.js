import BaseButton from 'components/BaseButton';
import BaseInput from 'components/BaseInput';

// "async" is optional
export default async ({ Vue /* app, router, store, ... */ }) => {
  Vue.component('base-button', BaseButton);
  Vue.component('base-input', BaseInput);
};
