import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import messages from 'src/i18n';

export const i18n = createI18n({
  fallbackLocale: 'en-US',
  globalInjection: true,
  locale: 'en-US',
  messages,
  // Disable v-html warnings: https://vue-i18n.intlify.dev/guide/migration/breaking.html#change-warnhtmlinmessage-option-default-value
  warnHtmlInMessage: 'off',
  warnHtmlMessage: false,
});

export const { tc } = i18n.global;

export default boot(({ app }) => {
  // Tell app to use the I18n instance.
  app.use(i18n);
});
