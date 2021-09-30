<template>
  <div class="row no-wrap">
    <connect-wallet>
      <span v-if="userDisplayName" class="text-caption cursor-pointer dark-toggle">
        {{ userDisplayName }}
      </span>
    </connect-wallet>
    <Jazzicon v-if="userAddress" :address="userAddress" class="q-ml-sm" />
    <span v-if="advancedMode" class="q-ml-md">
      <base-tooltip label="🧙">Advanced mode is on</base-tooltip>
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import Jazzicon from 'src/components/Jazzicon.vue';

export default defineComponent({
  name: 'AddressSettings',
  components: { BaseTooltip, ConnectWallet, Jazzicon },
  props: {
    userDisplayName: {
      type: String,
      required: true,
    },
    userAddress: {
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
