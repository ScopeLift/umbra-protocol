<template>
  <base-select
    v-model="currentNetwork"
    @input="emit('setNetwork', currentNetwork)"
    dense
    :filled="false"
    :hideBottomSpace="true"
    outlined
    :options="supportedChains"
    option-label="chainName"
    rounded
  />
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from '@vue/composition-api';
import { Chain, Network, supportedChains } from 'src/components/models';
import { getChainById } from 'src/utils/utils';

const currentNetwork = ref<Chain>();

export default defineComponent({
  name: 'NetworkDropdown',
  props: {
    isLoading: {
      type: Boolean,
      required: true,
    },
    network: {
      type: Object as PropType<Network>,
      required: false,
    },
  },
  setup({ network }, { emit }) {
    watchEffect(() => {
      if (network) {
        currentNetwork.value = getChainById(`0x${network.chainId}`);
      }
    });

    return { supportedChains, currentNetwork, emit, print };
  },
});
</script>
