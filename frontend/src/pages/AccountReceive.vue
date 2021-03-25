<template>
  <q-page padding>
    <h2 class="page-title">Receive</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <connect-wallet-card text="Connect your wallet to scan for received funds" />
    </div>

    <div v-else class="q-mx-auto" style="max-width: 800px">
      <!-- Waiting for signature -->
      <div v-if="!hasKeys || scanStatus === 'waiting'" class="form">
        <div v-if="!hasKeys" class="text-center q-mb-md">
          This app needs your signature to scan for funds you've received
        </div>
        <div v-else class="text-center q-mb-md">Click below to scan for funds you've received</div>
        <base-button @click="getPrivateKeysHandler" class="text-center" :label="hasKeys ? 'Scan' : 'Sign'" />

        <!-- Advanced mode settings -->
        <q-card v-if="advancedMode" class="card-border cursor-pointer q-pt-md q-px-md q-mt-xl">
          <q-card-section class="text-center text-primary text-h6 header-black q-pb-none">
            Scan Settings
          </q-card-section>
          <q-card-section class="text-left">
            <div>
              Enter the start or end blocks to use when scanning for events. A blank start block will scan from block
              zero, and a blank end block will scan through the current block.
            </div>
            <div class="row justify-between q-mt-lg">
              <base-input
                v-model.number="startBlockLocal"
                @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                class="col-5"
                label="Start block"
              />
              <base-input
                v-model.number="endBlockLocal"
                @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                class="col-5"
                label="End block"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Scanning in progress -->
      <div v-else-if="scanStatus === 'scanning'" class="text-center">
        <loading-spinner />
        <div class="text-center text-italic">Scanning for funds...</div>
      </div>

      <!-- Scanning complete -->
      <div v-else-if="scanStatus === 'complete'" class="text-center">
        <account-receive-table :announcements="userAnnouncements" @reset="scanStatus = 'waiting'" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { UserAnnouncement } from '@umbra/umbra-js';
import useSettingsStore from 'src/store/settings';
import useWallet from 'src/store/wallet';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress } = useWallet();
  const scanStatus = ref<'waiting' | 'scanning' | 'complete'>('waiting');
  const userAnnouncements = ref<UserAnnouncement[]>([]);

  // Start and end blocks for advanced mode settings
  const { advancedMode, startBlock, endBlock, setScanBlocks } = useSettingsStore();
  const startBlockLocal = ref<number>();
  const endBlockLocal = ref<number>();

  onMounted(async () => {
    // Read in the scan range
    startBlockLocal.value = startBlock.value;
    endBlockLocal.value = endBlock.value;

    // If user already signed and we have their keys in memory, start scanning
    if (hasKeys.value) await scan();
  });

  async function getPrivateKeysHandler() {
    if (startBlock.value && endBlock.value && Number(startBlock.value) > Number(endBlock.value)) {
      throw new Error('Invalid start or end block values');
    }
    const success = await getPrivateKeys();
    if (!success) return; // user denied signature or an error was thrown
    await scan(); // start scanning right after we get the user's signature
  }

  async function scan() {
    if (!umbra.value) throw new Error('No umbra instance found. Please make sure you are on a supported network');
    scanStatus.value = 'scanning';
    const { userAnnouncements: announcements } = await umbra.value.scan(
      String(spendingKeyPair.value?.publicKeyHex),
      String(viewingKeyPair.value?.privateKeyHex),
      { startBlock: startBlock.value, endBlock: endBlock.value } // overrides
    );
    userAnnouncements.value = announcements;
    scanStatus.value = 'complete';
  }

  return {
    userAddress,
    hasKeys,
    scanStatus,
    startBlockLocal,
    endBlockLocal,
    advancedMode,
    setScanBlocks,
    getPrivateKeysHandler,
    userAnnouncements,
  };
}

export default defineComponent({
  name: 'PageReceive',
  components: { AccountReceiveTable, ConnectWalletCard },
  setup() {
    return { ...useScan() };
  },
});
</script>
