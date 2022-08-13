<template>
  <q-page padding>
    <h2 class="page-title">{{ $t('Receive.receive') }}</h2>
    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">{{ $t('Receive.connect-your-wallet') }}</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" :label="$t('Receive.connect-wallet')" />
        </connect-wallet>
      </div>
    </div>

    <div v-else class="q-mx-auto" style="max-width: 800px">
      <!-- Waiting for signature -->
      <div v-if="needsSignature || scanStatus === 'waiting'" class="form">
        <div v-if="needsSignature" class="text-center q-mb-md">
          {{ $t('Receive.need-signature') }}
        </div>
        <div v-else class="text-center q-mb-md">{{ $t('Receive.scan-funds') }}</div>
        <base-button
          @click="getPrivateKeysHandler"
          class="text-center"
          :label="needsSignature ? $t('Receive.sign') : $t('Receive.scan')"
        />

        <!-- Advanced mode settings -->
        <q-card v-if="advancedMode" class="q-pt-md q-px-md q-mt-xl">
          <q-card-section class="text-center text-primary text-h6 header-black q-pb-none">
            {{ $t('Receive.scan-settings') }}
          </q-card-section>
          <q-card-section>
            <q-form class="text-left" ref="settingsFormRef">
              <div>
                {{ $t('Receive.start-end') }}
              </div>
              <div class="row justify-start q-col-gutter-md">
                <base-input
                  v-model.number="startBlockLocal"
                  @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                  class="col-xs-12 col-6"
                  :label="$t('Receive.start-block')"
                  :rules="isValidStartBlock"
                />
                <base-input
                  v-model.number="endBlockLocal"
                  @blur="setScanBlocks(startBlockLocal, endBlockLocal)"
                  class="col-xs-12 col-6"
                  :label="$t('Receive.end-block')"
                  :rules="isValidEndBlock"
                />
              </div>
              <div>
                {{ $t('Receive.enter-prv-key') }}
              </div>
              <!-- Unlike start blocks, no action on blur because we don't want to save private key to LocalStorage -->
              <base-input v-model="scanPrivateKeyLocal" :label="$t('Receive.prv-key')" :rules="isValidPrivateKey" />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div v-else-if="scanStatus === 'fetching'" class="text-center">
        <loading-spinner />
        <div class="text-center text-italic">{{ $t('Receive.fetching') }}</div>
      </div>

      <!-- Scanning in progress -->
      <div v-else-if="scanStatus === 'scanning'" class="text-center">
        <progress-indicator :percentage="scanPercentage" />
        <div class="text-center text-italic">{{ $t('Receive.scanning') }}</div>
        <div class="text-center text-italic q-mt-lg" v-html="$t('Receive.wait')"></div>
      </div>

      <!-- Scanning complete -->
      <div v-else-if="scanStatus === 'complete'" class="text-center">
        <account-receive-table :announcements="userAnnouncements" @reset="setFormStatus('waiting', '')" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from '@vue/composition-api';
import { QForm } from 'quasar';
import { UserAnnouncement, KeyPair, AnnouncementDetail, utils } from '@umbra/umbra-js';
import { BigNumber, computeAddress, isHexString } from 'src/utils/ethers';
import useSettingsStore from 'src/store/settings';
import useWallet from 'src/store/wallet';
import { filterUserAnnouncements } from 'src/worker/worker';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress } = useWallet();
  type ScanStatus = 'waiting' | 'fetching' | 'scanning' | 'complete';
  const scanStatus = ref<ScanStatus>('waiting');
  const scanPercentage = ref<number>(0);
  const userAnnouncements = ref<UserAnnouncement[]>([]);

  // Start and end blocks for advanced mode settings
  const {
    advancedMode,
    startBlock,
    endBlock,
    setScanBlocks,
    setScanPrivateKey,
    scanPrivateKey,
    resetScanSettings,
  } = useSettingsStore();
  const startBlockLocal = ref<number>();
  const endBlockLocal = ref<number>();
  const scanPrivateKeyLocal = ref<string>();
  const needsSignature = computed(() => !hasKeys.value && !scanPrivateKeyLocal.value);
  const settingsFormRef = ref<QForm>(); // for programmatically verifying settings form

  // Form validators and configurations
  const badPrivKeyMsg = 'Please enter a valid private key';
  const isValidPrivateKey = (val: string) => {
    if (!val) return true;
    if (val.length === 66 && isHexString(val)) return true;
    if (val.length === 64 && isHexString(`0x${val}`)) return true;
    return badPrivKeyMsg;
  };
  const isValidStartBlock = (val: string) => !val || Number(val) > 0 || 'Please enter a valid start block';
  const isValidEndBlock = (val: string) => !val || Number(val) > 0 || 'Please enter a valid start block';
  const setFormStatus = (scanStatusVal: ScanStatus, scanPrivateKey: string) => {
    scanStatus.value = scanStatusVal;
    if (scanPrivateKey.length === 64) scanPrivateKey = `0x${scanPrivateKey}`;
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
    if (Number(startBlockLocal.value) > Number(endBlockLocal.value)) {
      throw new Error('End block is larger than start block');
    }

    // Get user's signature if required
    if (needsSignature.value) {
      const success = await getPrivateKeys();
      if (success === 'denied') return; // if unsuccessful, user denied signature or an error was thrown

      // log the spending and viewing public keys to help debug any receiving issues
      // we log them as strings for easy comparison against Etherscan
      const { prefix: spendingPrefix, pubKeyXCoordinate: spendingPubKeyX } = KeyPair.compressPublicKey(String(spendingKeyPair.value?.publicKeyHex)); // prettier-ignore
      const { prefix: viewingPrefix, pubKeyXCoordinate: viewingPubKeyX } = KeyPair.compressPublicKey(String(viewingKeyPair.value?.publicKeyHex)); // prettier-ignore
      window.logger.debug('spendingPrefix : ', spendingPrefix);
      window.logger.debug('spendingPubKeyX: ', BigNumber.from(spendingPubKeyX).toString());
      window.logger.debug('viewingPrefix:   ', viewingPrefix);
      window.logger.debug('viewingPubKeyX:  ', BigNumber.from(viewingPubKeyX).toString());
    }

    // Save off the scanPrivateKeyLocal to memory if it exists, then scan
    if (scanPrivateKeyLocal.value) {
      await utils.assertSupportedAddress(computeAddress(scanPrivateKeyLocal.value));
      setScanPrivateKey(scanPrivateKeyLocal.value);
    }
    await scan();
  }

  async function scan() {
    if (!umbra.value) throw new Error('No umbra instance found. Please make sure you are on a supported network');
    scanStatus.value = 'fetching';

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const chooseKey = (keyPair: string | undefined | null) => {
      if (advancedMode.value && scanPrivateKey.value) return String(scanPrivateKey.value);
      return String(keyPair);
    };

    // Fetch announcements
    const overrides = { startBlock: startBlockLocal.value, endBlock: endBlockLocal.value };
    let allAnnouncements: AnnouncementDetail[] = [];
    try {
      allAnnouncements = await umbra.value.fetchAllAnnouncements(overrides);
    } catch (e) {
      scanStatus.value = 'waiting'; // reset to the default state because we were unable to fetch anouncements
      throw e;
    }

    // Scan for funds
    scanStatus.value = 'scanning';
    const spendingPubKey = chooseKey(spendingKeyPair.value?.publicKeyHex);
    const viewingPrivKey = chooseKey(viewingKeyPair.value?.privateKeyHex);

    // TODO: This is what we need to move to the webworker instead of chunking
    filterUserAnnouncements(
      spendingPubKey,
      viewingPrivKey,
      allAnnouncements,
      (percent) => {
        scanPercentage.value = Math.floor(percent);
      },
      (filteredAnnouncements) => {
        userAnnouncements.value = filteredAnnouncements;
        scanStatus.value = 'complete';
      }
    );
  }

  function resetState() {
    scanStatus.value = 'waiting';
    scanPercentage.value = 0;
    startBlockLocal.value = undefined;
    endBlockLocal.value = undefined;
    scanPrivateKeyLocal.value = undefined;
    resetScanSettings();
  }

  watch(userAddress, () => {
    if (userAddress.value) resetState();
  });

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
    scanPercentage,
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
  components: { AccountReceiveTable, ConnectWallet },
  setup() {
    return { ...useScan() };
  },
});
</script>
