import { boot } from 'quasar/wrappers';
import messages from 'src/i18n';
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import Quasar from 'quasar';

Vue.use(VueI18n);
const locale = Quasar.lang.getLocale();

export const i18n = new VueI18n({
  locale: locale,
  fallbackLocale: 'en-us',
  messages,
});

export default boot(({ app }) => {
  // Set i18n instance on app
  app.i18n = i18n;
});

const params = new URLSearchParams(window.location.search);
if (params.has('locale')) {
  i18n.locale = params.get('locale')!;
  window.logger.info(params.get('locale'));
}
