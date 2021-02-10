<template>
  <q-page padding>
    <h1 class="page-title">Setup</h1>

    <div class="q-mx-auto">
      <div v-if="keyStatus === 'denied'" class="text-center">
        This app needs your signature to continue
        <base-button @click="getPrivateKeysHandler" label="Sign" />
      </div>
      <div v-else-if="keyStatus === 'waiting'" class="text-center">Waiting for signature</div>
      <div v-else-if="keyStatus === 'success'" class="text-center">
        Follow the steps below to setup ENS
      </div>
      <div v-else class="text-center">Invalid app state! Please contact us for support</div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import useWallet from 'src/store/wallet';

function useKeys() {
  const { getPrivateKeys } = useWallet();
  const keyStatus = ref<'waiting' | 'success' | 'denied'>('waiting');

  async function getPrivateKeysHandler() {
    keyStatus.value = await getPrivateKeys();
  }

  onMounted(async () => await getPrivateKeysHandler());
  return { keyStatus, getPrivateKeysHandler };
}

export default defineComponent({
  name: 'PageSetup',
  setup() {
    return { ...useKeys() };
  },
});
</script>
