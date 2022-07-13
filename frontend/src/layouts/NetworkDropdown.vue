<template>
  <base-select
    v-model="currentNetwork"
    @update:modelValue="setNetwork(currentNetwork)"
    dense
    :filled="false"
    :hideBottomSpace="true"
    outlined
    :options="chainOptions"
    option-label="chainName"
    rounded
  >
    <template v-if="!isSupportedNetwork" v-slot:prepend>
      <q-icon name="fas fa-exclamation-triangle" color="warning" size="1rem" />
    </template>
  </base-select>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from 'vue';
import { Chain, supportedChains } from 'src/components/models';
import useWalletStore from 'src/store/wallet';
import { getChainById } from 'src/utils/utils';

const unsupportedNetwork = { chainName: 'Unsupported network' } as Chain;
const currentNetwork = ref<Chain>(unsupportedNetwork);

export default defineComponent({
  name: 'NetworkDropdown',

  setup() {
    const { network, setNetwork, isSupportedNetwork } = useWalletStore();

    // We only show Rinkeby as an option in the network dropdown if the user is connected to Rinkeby
    const chainOptions = computed(() => {
      if (network.value?.chainId === 4) return supportedChains;
      return supportedChains.filter((chain) => chain.chainName !== 'Rinkeby');
    });

    watchEffect(() => {
      if (network.value) {
        currentNetwork.value = getChainById(network.value.chainId) || unsupportedNetwork;
      }
    });

    return { chainOptions, currentNetwork, setNetwork, isSupportedNetwork };
  },
});
</script>
