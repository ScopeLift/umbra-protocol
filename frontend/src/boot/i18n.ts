import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import messages from 'src/i18n';

export const i18n = createI18n({
  locale: 'en-US',
  globalInjection: true,
  fallbackLocale: 'en-US',
  messages,
});

export const { tc } = i18n.global;

export default boot(({ app }) => {
  // Tell app to use the I18n instance.
  app.use(i18n);
});
