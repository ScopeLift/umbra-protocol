<template>
  <q-page padding>
    <div class="text-center q-mb-xl">
      <h2 class="header-black">Send Stealth Payments</h2>
      <h4 class="darkgrey q-mt-md">Only the sender and recipient know who received funds</h4>
    </div>

    <div class="row justify-center">
      <home-action-card to="send" text="Send" />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import HomeActionCard from 'components/HomeActionCard.vue';

export default defineComponent({
  name: 'PageHome',
  components: { HomeActionCard },
  setup() {
    return {};
  },
});
</script>
