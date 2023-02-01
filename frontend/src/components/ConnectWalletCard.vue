<template>
  <connect-wallet>
    <div v-if="text" class="text-center q-mb-md">{{ text }}</div>
    <base-button class="text-center" :label="$t('ConnectWalletCard.connect-wallet')" />
  </connect-wallet>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import BaseButton from './BaseButton.vue';

export default defineComponent({
  name: 'ConnectWalletCard',
  components: { ConnectWallet, BaseButton },
  props: {
    text: {
      type: String,
      required: false,
      default: undefined,
    },
  },
});
</script>
