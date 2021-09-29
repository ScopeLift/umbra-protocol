<template>
  <div class="row no-wrap">
    <connect-wallet>
      <span v-if="userDisplayName" class="text-caption cursor-pointer dark-toggle">
        {{ userDisplayName }}
      </span>
    </connect-wallet>
    <span v-if="advancedMode" class="q-ml-md">
      <base-tooltip label="🧙">Advanced mode is on</base-tooltip>
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';

export default defineComponent({
  name: 'AddressSettings',
  components: { BaseTooltip, ConnectWallet },
  props: {
    userDisplayName: {
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
