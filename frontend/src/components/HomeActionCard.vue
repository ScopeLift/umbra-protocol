<template>
  <connect-wallet :to="to" style="max-width: 325px">
    <q-card class="card-border cursor-pointer q-py-md">
      <q-card-section class="text-center text-primary text-h6 header-black q-pb-none">
        {{ text }}
      </q-card-section>
      <q-card-section class="text-center"> {{ description }} </q-card-section>
    </q-card>
  </connect-wallet>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ConnectWallet from 'components/ConnectWallet.vue';

export default defineComponent({
  name: 'HomeActionCard',

  components: { ConnectWallet },

  props: {
    description: {
      type: String,
      required: true,
    },

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
