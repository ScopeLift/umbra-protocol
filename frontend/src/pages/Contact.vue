<template>
  <q-page padding>
    <h2 class="page-title">{{$t('Contact.contact')}}</h2>

    <p class="horizontal-center q-pb-lg" style="max-width: 400px" v-html="$t('Contact.paragraph')">
    </p>
    <p class="horizontal-center" style="max-width: 400px">
      <q-list>
        <!-- Discord -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon class="discord" name="fab fa-discord" />
          </q-item-section>

          <q-item-section class="text-left">
            <div v-html="$t('Contact.discord')">
            </div>
          </q-item-section>
        </q-item>

        <!-- Twitter -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon class="twitter" name="fab fa-twitter" />
          </q-item-section>

          <q-item-section class="text-left">
            <div v-html="$t('Contact.twitter')">
            </div>
          </q-item-section>
        </q-item>

        <!-- Email -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="fas fa-envelope" />
          </q-item-section>

          <q-item-section class="text-left" v-html="$t('Contact.email')">
          </q-item-section>
        </q-item>
      </q-list>
    </p>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'PageContact',
  setup() {
    return {};
  },
});
</script>

<style lang="sass" scoped>
.discord
  color: #5865F2

.twitter
  color: #1DA1F2
</style>
