<template>
  <connect-wallet :to="to">
    <q-card class="card-border action-card">
      <q-card-section class="text-h6 header-black card-header"> {{ text }} </q-card-section>
    </q-card>
  </connect-wallet>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import ConnectWallet from 'components/ConnectWallet.vue';

export default defineComponent({
  name: 'HomeActionCard',

  components: { ConnectWallet },

  props: {
    text: {
      type: String,
      required: true,
    },

    to: {
      type: String,
      required: true,
    },
  },

  setup() {
    return {};
  },
});
</script>
