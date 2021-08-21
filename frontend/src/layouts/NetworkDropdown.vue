<template>
  <base-select
    v-model="currentNetwork"
    @input="setNetwork(currentNetwork)"
    dense
    :filled="false"
    :hideBottomSpace="true"
    outlined
    :options="supportedChains"
    option-label="chainName"
    rounded
  >
    <template v-if="!isSupportedNetwork" v-slot:prepend>
      <q-icon name="fas fa-exclamation-triangle" color="warning" size="1rem" />
    </template>
  </base-select>
</template>

<script lang="ts">
import { defineComponent, ref, watchEffect } from '@vue/composition-api';
import { Chain, supportedChains } from 'src/components/models';
import useWalletStore from 'src/store/wallet';
import { getChainById } from 'src/utils/utils';

const unsupportedNetwork = { chainName: 'Unsupported network' } as Chain;
const currentNetwork = ref<Chain>(unsupportedNetwork);

export default defineComponent({
  name: 'NetworkDropdown',

  setup() {
    const { network, setNetwork, isSupportedNetwork } = useWalletStore();

    watchEffect(() => {
      if (network.value) {
        currentNetwork.value = getChainById(network.value.chainId) || unsupportedNetwork;
      }
    });

    return { supportedChains, currentNetwork, setNetwork, isSupportedNetwork };
  },
});
</script>
