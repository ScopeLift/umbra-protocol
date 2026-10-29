<template>
  <q-page padding>
    <h2 class="page-title">{{ $t('Contact.contact') }}</h2>

    <div class="form">
      <i18n-t scope="global" keypath="Contact.paragraph" tag="p" class="q-pb-md">
        <router-link class="hyperlink" :to="{ name: 'FAQ' }">{{ $t('Contact.faq') }}</router-link>
      </i18n-t>

      <!-- Confirmation -->
      <p v-if="isSent" class="q-py-lg">{{ $t('Contact.sent', { email: email.trim() }) }}</p>

      <!-- Contact form -->
      <q-form v-else greedy @submit="onFormSubmit">
        <base-select
          v-model="requestType"
          :disable="isSending"
          :label="$t('Contact.request-type')"
          lazy-rules
          :options="requestTypeOptions"
          option-label="label"
          :rules="(value: unknown) => Boolean(value) || $t('Contact.select-request-type')"
        />
        <base-input
          v-model="name"
          :disable="isSending"
          :label="$t('Contact.name')"
          lazy-rules
          :rules="(value: string) => validateText(value, FIELD_LIMITS.name)"
        />
        <base-input
          v-model="email"
          :disable="isSending"
          :label="$t('Contact.email')"
          lazy-rules
          :rules="isValidEmail"
          type="email"
        />
        <base-input
          v-model="subject"
          :disable="isSending"
          :label="$t('Contact.subject')"
          lazy-rules
          :rules="(value: string) => validateText(value, FIELD_LIMITS.subject, $t('Contact.enter-subject'))"
        />
        <base-input
          v-model="pageUrl"
          :disable="isSending"
          :label="$t('Contact.page-url')"
          lazy-rules
          :rules="(value: string) => validateText(value, FIELD_LIMITS.pageUrl)"
        />
        <base-input
          v-model="message"
          class="message-input"
          :disable="isSending"
          :label="$t('Contact.message')"
          lazy-rules
          :rules="(value: string) => validateText(value, FIELD_LIMITS.message, $t('Contact.enter-message'))"
          type="textarea"
        />

        <turnstile-widget
          ref="turnstileRef"
          @verify="onTurnstileVerify"
          @expire="turnstileToken = ''"
          @error="onTurnstileError"
        />
        <p v-if="turnstileFailed" class="text-caption text-negative">{{ $t('Contact.verification-failed') }}</p>
        <p v-if="sendError" class="text-caption text-negative">{{ sendError }}</p>

        <base-button
          class="q-mt-md"
          :disable="!turnstileToken || isSending"
          :full-width="true"
          :label="$t('Contact.send')"
          :loading="isSending"
          type="submit"
        />
      </q-form>

      <q-list class="q-mt-xl">
        <!-- X -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="fab fa-x-twitter" />
          </q-item-section>

          <q-item-section class="text-left">
            <i18n-t scope="global" keypath="Contact.x" tag="span">
              <a class="hyperlink" href="https://x.com/UmbraCash" target="_blank">@UmbraCash</a>
            </i18n-t>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { tc } from 'src/boot/i18n';
import TurnstileWidget from 'components/TurnstileWidget.vue';

type RequestTypeOption = { value: string; label: string };

// Keep the request types, field limits, and email pattern in sync with netlify/functions/contact.mjs.
const FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 200,
  pageUrl: 2000,
  message: 5000,
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rules return true when the value is valid, or the error message to show.
function validateText(value: string, limit: number, requiredMessage?: string) {
  if (requiredMessage && !value.trim()) return requiredMessage;
  if (value.length > limit) return tc('Contact.too-long', { limit });
  return true;
}

function isValidEmail(value: string) {
  if (!value.trim()) return tc('Contact.enter-email');
  if (!EMAIL_PATTERN.test(value.trim())) return tc('Contact.invalid-email');
  return validateText(value, FIELD_LIMITS.email);
}

export default defineComponent({
  name: 'PageContact',
  components: { TurnstileWidget },

  setup() {
    const requestType = ref<RequestTypeOption>();
    const name = ref('');
    const email = ref('');
    const subject = ref('');
    const pageUrl = ref('');
    const message = ref('');

    const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>();
    const turnstileToken = ref('');
    const turnstileFailed = ref(false);
    const isSending = ref(false);
    const isSent = ref(false);
    const sendError = ref('');

    const requestTypeOptions = computed<RequestTypeOption[]>(() => [
      { value: 'bug-report', label: tc('Contact.bug-report') },
      { value: 'support-request', label: tc('Contact.support-request') },
      { value: 'feature-request', label: tc('Contact.feature-request') },
      { value: 'other', label: tc('Contact.other') },
    ]);

    function onTurnstileVerify(token: string) {
      turnstileToken.value = token;
      turnstileFailed.value = false;
    }

    function onTurnstileError() {
      turnstileToken.value = '';
      turnstileFailed.value = true;
    }

    async function onFormSubmit() {
      if (!requestType.value || !turnstileToken.value) return;

      isSending.value = true;
      sendError.value = '';
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            requestType: requestType.value.value,
            name: name.value,
            email: email.value,
            subject: subject.value,
            pageUrl: pageUrl.value,
            message: message.value,
            commitHash: process.env.COMMIT_HASH, // the commit being built, set in quasar.conf.js
            turnstileToken: turnstileToken.value,
          }),
        });
        isSent.value = response.ok;
        if (!response.ok) {
          sendError.value = response.status === 429 ? tc('Contact.rate-limited') : tc('Contact.send-failed');
        }
      } catch {
        sendError.value = tc('Contact.send-failed');
      } finally {
        isSending.value = false;
      }

      // Turnstile tokens can only be verified once, so get a new one before the user can try again.
      if (!isSent.value) {
        turnstileToken.value = '';
        turnstileRef.value?.reset();
      }
    }

    return {
      email,
      FIELD_LIMITS,
      isSending,
      isSent,
      isValidEmail,
      message,
      name,
      onFormSubmit,
      onTurnstileError,
      onTurnstileVerify,
      pageUrl,
      requestType,
      requestTypeOptions,
      sendError,
      subject,
      turnstileFailed,
      turnstileRef,
      turnstileToken,
      validateText,
    };
  },
});
</script>

<style lang="sass" scoped>
.message-input :deep(textarea)
  min-height: 10rem
</style>
