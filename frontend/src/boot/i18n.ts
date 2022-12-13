import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import messages from 'src/i18n';

// Configure and create the i18n instance. Exported so it can be imported within files and components.
const params = new URLSearchParams(window.location.search);
const locale = params.get('locale') || 'en-US';

export const i18n = createI18n({
  locale,
  globalInjection: true,
  fallbackLocale: 'en-US',
  messages,
});

export const { tc } = i18n.global;

export default boot(({ app }) => {
  // Tell app to use the I18n instance.
  app.use(i18n);
});
