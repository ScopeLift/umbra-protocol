<template>
  <q-page padding>
    <h2 class="page-title">Contact</h2>

    <p class="horizontal-center q-pb-lg" style="max-width: 400px">
      Read the <router-link class="hyperlink" :to="{ name: 'FAQ' }">FAQ</router-link> and still have questions? Feel
      free to get in touch! You'll likely get the fastest response on Telegram.
    </p>
    <p class="horizontal-center" style="max-width: 400px">
      <q-list>
        <!-- Telegram -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon class="telegram" name="fab fa-telegram" />
          </q-item-section>

          <q-item-section class="text-left">
            <div><a class="hyperlink" href="https://t.me/UmbraCash" target="_blank">Join us</a> on Telegram</div>
          </q-item-section>
        </q-item>

        <!-- Twitter -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon class="twitter" name="fab fa-twitter" />
          </q-item-section>

          <q-item-section class="text-left">
            <div>
              <a class="hyperlink" href="https://twitter.com/UmbraCash" target="_blank">Follow</a> Umbra on Twitter
            </div>
          </q-item-section>
        </q-item>

        <!-- Email -->
        <q-item class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="fas fa-envelope" />
          </q-item-section>

          <q-item-section class="text-left">
            <div>Email us at <a class="hyperlink" href="mailto:support@umbra.cash">support@umbra.cash</a></div>
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
.telegram
  color: #0088cc

.twitter
  color: #1DA1F2
</style>
