<template>
  <q-btn-dropdown
    color="primary"
    no-caps
    unelevated
    :loading="isLoading"
    :label="network ? getChainShortName(network.chainId) : ''"
  >
    <q-list>
      <q-item
        v-for="chain in supportedChains"
        v-bind:key="chain.chainId"
        clickable
        v-close-popup
        @click="emit('setNetwork', chain)"
      >
        {{ chain.chainName }}
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';
import { Network, supportedChains } from 'src/components/models';
import { getChainShortName } from 'src/utils/utils';

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
  setup(_, { emit }) {
    return { supportedChains, getChainShortName, emit };
  },
});
</script>
