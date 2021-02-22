<template>
  <q-page padding>
    <h2 class="page-title">Receive</h2>

    <div class="q-mx-auto" style="max-width: 800px">
      <!-- Waiting for signature -->
      <div v-if="keyStatus === 'denied' || keyStatus === 'waiting'" class="row justify-center">
        <div class="col-12 text-center">This app needs your signature to scan for funds you've received</div>
        <div><base-button @click="getPrivateKeysHandler" label="Sign" /></div>
      </div>

      <!-- Scanning in progress -->
      <div v-else-if="scanStatus === 'scanning'" class="text-center">
        <loading-spinner />
        <div class="text-center text-italic">Scanning for funds...</div>
      </div>

      <!-- Scanning complete -->
      <div v-else-if="scanStatus === 'complete'" class="text-center">
        <account-receive-table :announcements="userAnnouncements" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { UserAnnouncement } from '@umbra/umbra-js';
import useWallet from 'src/store/wallet';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair } = useWallet();
  const keyStatus = ref<'waiting' | 'success' | 'denied'>('waiting');
  const scanStatus = ref<'waiting' | 'scanning' | 'complete'>('waiting');
  const userAnnouncements = ref<UserAnnouncement[]>([]);

  async function getPrivateKeysHandler() {
    keyStatus.value = await getPrivateKeys();
    if (keyStatus.value !== 'success') return; // user denied signature
    await scan(); // start scanning right after we get the user's signature
  }

  async function scan() {
    if (!umbra.value) {
      throw new Error('No umbra instance found. Please make sure you are on a supported network');
    }
    scanStatus.value = 'scanning';
    const { userAnnouncements: announcements } = await umbra.value.scan(
      String(spendingKeyPair.value?.publicKeyHex),
      String(viewingKeyPair.value?.privateKeyHex)
    );
    userAnnouncements.value = announcements;
    scanStatus.value = 'complete';
  }

  return { keyStatus, scanStatus, getPrivateKeysHandler, userAnnouncements };
}

export default defineComponent({
  name: 'PageReceive',
  components: { AccountReceiveTable },
  setup() {
    return { ...useScan() };
  },
});
</script>
