<template>
  <q-page padding>
    <h2 class="page-title">Receive</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <connect-wallet-card text="Connect your wallet to scan for received funds" />
    </div>

    <div v-else class="q-mx-auto" style="max-width: 800px">
      <!-- Waiting for signature -->
      <div v-if="needsSignature || scanStatus === 'waiting'" class="form">
        <div v-if="needsSignature" class="text-center q-mb-md">
          This app needs your signature to scan for funds you've received
        </div>
        <div v-else class="text-center q-mb-md">Click below to scan for funds you've received</div>
        <base-button @click="getPrivateKeysHandler" class="text-center" :label="needsSignature ? 'Sign' : 'Scan'" />

        <!-- Advanced mode settings -->
        <q-card v-if="advancedMode" class="q-pt-md q-px-md q-mt-xl">
          <q-card-section class="text-center text-primary text-h6 header-black q-pb-none">
            Scan Settings
          </q-card-section>
          <q-card-section>
            <q-form class="text-left" ref="settingsFormRef">
              <div>
                Enter the start or end blocks to use when scanning for events. A blank start block will scan from block
                zero, and a blank end block will scan through the current block.
              </div>
              <div class="row justify-start">
                <base-input
                  v-model.number="startBlockLocal"
                  @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                  class="col-5"
                  label="Start block"
                  :rules="isValidStartBlock"
                />
                <base-input
                  v-model.number="endBlockLocal"
                  @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                  class="col-5 q-ml-md"
                  label="End block"
                  :rules="isValidEndBlock"
                />
              </div>
              <div>
                Enter the private key to use when scanning for events. A blank private key will use the ones generated
                from your signature.
              </div>
              <!-- Unlike start blocks, no action on blur because we don't want to save private key to LocalStorage -->
              <base-input v-model="scanPrivateKeyLocal" label="Private key" :rules="isValidPrivateKey" />
            </q-form>
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
        <account-receive-table :announcements="userAnnouncements" @reset="setFormStatus('waiting', '')" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from '@vue/composition-api';
import { QForm } from 'quasar';
import { UserAnnouncement } from '@umbra/umbra-js';
import { isHexString } from '@ethersproject/bytes';
import useSettingsStore from 'src/store/settings';
import useWallet from 'src/store/wallet';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress } = useWallet();
  type ScanStatus = 'waiting' | 'scanning' | 'complete';
  const scanStatus = ref<ScanStatus>('waiting');
  const userAnnouncements = ref<UserAnnouncement[]>([]);

  // Start and end blocks for advanced mode settings
  const { advancedMode, startBlock, endBlock, setScanBlocks, setScanPrivateKey } = useSettingsStore();
  const startBlockLocal = ref<number>();
  const endBlockLocal = ref<number>();
  const scanPrivateKeyLocal = ref<string>();
  const needsSignature = computed(() => !hasKeys.value && !scanPrivateKeyLocal.value);
  const settingsFormRef = ref<QForm>(); // for programtically verifying settings form

  // Form validators and configurations
  const invalidPrivateKeyMsg = 'Please enter a valid private key starting with 0x';
  const isValidPrivateKey = (val: string) => !val || (isHexString(val) && val.length === 66) || invalidPrivateKeyMsg;
  const isValidStartBlock = (val: string) => !val || Number(val) > 0 || 'Please enter a valid start block';
  const isValidEndBlock = (val: string) => !val || Number(val) > 0 || 'Please enter a valid start block';
  const setFormStatus = (scanStatusVal: ScanStatus, scanPrivateKey: string) => {
    scanStatus.value = scanStatusVal;
    setScanPrivateKey(scanPrivateKey);
    scanPrivateKeyLocal.value = scanPrivateKey;
  };

  onMounted(async () => {
    startBlockLocal.value = startBlock.value; // read in last used startBlock
    endBlockLocal.value = endBlock.value; // read in last used endBlock
    if (hasKeys.value) await scan(); // if user already signed and we have their keys in memory, start scanning
  });

  async function getPrivateKeysHandler() {
    // Validate form
    if (advancedMode.value) {
      const isFormValid = await settingsFormRef.value?.validate(true);
      if (!isFormValid) return;
    }
    if (Number(startBlock.value) > Number(endBlock.value)) {
      throw new Error('End block is larger than start block');
    }

    // Get user's signature if required
    if (needsSignature.value) {
      const success = await getPrivateKeys();
      if (!success) return; // user denied signature or an error was thrown
    }

    // Save off the scanPrivateKeyLocal to memory if it exists, then scan
    if (scanPrivateKeyLocal.value) setScanPrivateKey(scanPrivateKeyLocal.value);
    await scan();
  }

  async function scan() {
    if (!umbra.value) throw new Error('No umbra instance found. Please make sure you are on a supported network');
    scanStatus.value = 'scanning';

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const chooseKey = (keyPair: string | undefined | null) => {
      if (advancedMode.value && scanPrivateKeyLocal.value) return String(scanPrivateKeyLocal.value);
      return String(keyPair);
    };

    // Scan for funds
    const spendingPubKey = chooseKey(spendingKeyPair.value?.publicKeyHex);
    const viewingPrivKey = chooseKey(viewingKeyPair.value?.privateKeyHex);
    const overrides = { startBlock: startBlock.value, endBlock: endBlock.value };
    const { userAnnouncements: announcements } = await umbra.value.scan(spendingPubKey, viewingPrivKey, overrides);
    userAnnouncements.value = announcements;
    scanStatus.value = 'complete';
  }

  return {
    advancedMode,
    endBlockLocal,
    getPrivateKeysHandler,
    isValidEndBlock,
    isValidPrivateKey,
    isValidStartBlock,
    needsSignature,
    scanPrivateKeyLocal,
    scanStatus,
    setFormStatus,
    setScanBlocks,
    settingsFormRef,
    startBlockLocal,
    userAddress,
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
