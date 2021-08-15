<template>
  <div>
    <connect-wallet>
      <span v-if="userDisplayAddress" class="text-caption cursor-pointer dark-toggle">
        {{ userDisplayAddress }}
      </span>
      <span v-else-if="!isSupportedNetwork" class="text-caption text-grey cursor-pointer dark-toggle">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left /> Unsupported network
      </span>
    </connect-wallet>
    <span v-if="advancedMode" class="q-ml-md">
      🧙 <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md"> Advanced mode is on </q-tooltip>
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
    isSupportedNetwork: {
      type: Boolean,
      required: true,
    },
    advancedMode: {
      type: Boolean,
      required: true,
    },
  },
});
</script>
