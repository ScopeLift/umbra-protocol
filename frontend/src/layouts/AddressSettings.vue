<template>
  <div class="row no-wrap">
    <span v-if="advancedMode" class="q-mr-sm">
      <base-tooltip label="🧙" size="sm">Advanced mode is on</base-tooltip>
    </span>
    <connect-wallet>
      <div class="row text-caption cursor-pointer dark-toggle">
        <span v-if="userDisplayName">
          {{ userDisplayName }}
        </span>
        <Jazzicon v-if="userAddress" :address="userAddress" class="q-ml-sm" />
      </div>
    </connect-wallet>
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
