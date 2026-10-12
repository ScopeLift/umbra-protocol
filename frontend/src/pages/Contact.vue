<template>
  <q-page padding>
    <h2 class="page-title">{{ $t('Contact.contact') }}</h2>

    <i18n-t
      scope="global"
      keypath="Contact.paragraph"
      tag="p"
      class="horizontal-center q-pb-lg"
      style="max-width: 400px"
    >
      <router-link class="hyperlink" :to="{ name: 'FAQ' }">{{ $t('Contact.faq') }}</router-link>
    </i18n-t>

    <p class="horizontal-center" style="max-width: 400px">
      <q-list>
        <!-- X -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="fab fa-x-twitter" />
          </q-item-section>

          <q-item-section class="text-left">
            <i18n-t scope="global" keypath="Contact.x" tag="span">
              <a class="hyperlink" href="https://x.com/UmbraCash" target="_blank">{{ $t('Contact.follow') }}</a>
            </i18n-t>
          </q-item-section>
        </q-item>

        <!-- Email -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="fas fa-envelope" />
          </q-item-section>

          <q-item-section class="text-left">
            <i18n-t scope="global" keypath="Contact.email" tag="div">
              <a class="hyperlink" href="mailto:support@umbra.cash">support@umbra.cash</a>
            </i18n-t>
          </q-item-section>
        </q-item>
      </q-list>
    </p>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageContact',
  setup() {
    return {};
  },
});
</script>
