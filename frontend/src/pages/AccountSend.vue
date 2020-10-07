<template>
  <q-page padding>
    <h1 class="page-title">Send</h1>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from '@vue/composition-api';
import useKeysStore from 'src/store/keys';
import useWalletStore from 'src/store/wallet';
import { Signer } from 'components/models';

/**
 * @notice Request signature to generate user's two private keys when page loads
 */
function usePrivateKeys() {
  onMounted(async () => {
    const { getPrivateKeys, keyPairStealthAddress, keyPairEncryption } = useKeysStore();
    const { signer } = useWalletStore();
    await getPrivateKeys(signer.value as Signer);
    console.log('keyPairStealthAddress: ', keyPairStealthAddress.value);
    console.log('keyPairEncryption: ', keyPairEncryption.value);
  });

  return {};
}

export default defineComponent({
  name: 'PageSend',
  setup() {
    return { ...usePrivateKeys() };
  },
});
</script>
