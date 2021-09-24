<template>
  <div class="row no-wrap">
    <connect-wallet>
      <span v-if="userDisplayAddress" class="text-caption cursor-pointer dark-toggle">
        {{ userDisplayAddress }}
      </span>
    </connect-wallet>
    <span v-if="advancedMode" class="q-ml-md">
      🧙
      <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md" :hide-delay="$q.screen.lt.lg ? 1000 : 0">
        Advanced mode is on
      </q-tooltip>
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import ConnectWallet from 'components/ConnectWallet.vue';

export default defineComponent({
  name: 'AddressSettings',
  components: { ConnectWallet },
  props: {
    userDisplayAddress: {
      type: String,
      required: false,
    },
    advancedMode: {
      type: Boolean,
      required: true,
    },
  },
});
</script>
