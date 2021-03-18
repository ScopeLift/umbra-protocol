<template>
  <q-page padding>
    <h2 class="page-title">Receive</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <connect-wallet-card text="Connect your wallet to scan for received funds" />
    </div>

    <div v-else class="q-mx-auto" style="max-width: 800px">
      <!-- Waiting for signature -->
      <div v-if="!hasKeys" class="form">
        <div class="text-center q-mb-md">This app needs your signature to scan for funds you've received</div>
        <base-button @click="getPrivateKeysHandler" class="text-center" label="Sign" />
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
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { UserAnnouncement } from '@umbra/umbra-js';
import useWallet from 'src/store/wallet';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress } = useWallet();
  const scanStatus = ref<'waiting' | 'scanning' | 'complete'>('waiting');
  const userAnnouncements = ref<UserAnnouncement[]>([]);

  onMounted(async () => {
    // If user already signed and we have their keys in memory, start scanning
    if (hasKeys.value) {
      await scan();
    }
  });

  async function getPrivateKeysHandler() {
    const success = await getPrivateKeys();
    if (!success) return; // user denied signature or an error was thrown
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

  return { userAddress, hasKeys, scanStatus, getPrivateKeysHandler, userAnnouncements };
}

export default defineComponent({
  name: 'PageReceive',
  components: { AccountReceiveTable, ConnectWalletCard },
  setup() {
    return { ...useScan() };
  },
});
</script>
