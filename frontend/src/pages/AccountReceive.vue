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

    <div
      v-else-if="!isAccountSetup && !advancedMode"
      class="dark-toggle bg-notice text-notice text-center text-bold q-pa-md q-mb-lg q-mx-auto form-max-wide rounded-borders-md"
    >
      {{ $t('AccountReceiveTable.configure-umbra') }}<br />
      <i18n-t keypath="AccountReceiveTable.navigate-to-setup" tag="span">
        <router-link class="hyperlink" :to="{ name: 'setup' }">{{ $t('AccountReceiveTable.setup') }}</router-link>
      </i18n-t>
    </div>

    <div v-else-if="userAddress" class="q-mx-auto" style="max-width: 800px">
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
                  @blur="setScanBlocks(startBlockLocal!, endBlockLocal!)"
                  class="col-xs-12 col-6"
                  :label="$t('Receive.start-block')"
                  :rules="isValidStartBlock"
                />
                <base-input
                  v-model.number="endBlockLocal"
                  @blur="setScanBlocks(startBlockLocal!, endBlockLocal!)"
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

      <!-- Scanning complete -->
      <div v-else-if="userAnnouncements.length || scanStatus === 'complete'" class="text-center">
        <account-receive-table
          :announcements="userAnnouncements"
          :scanStatus="scanStatus"
          :scanPercentage="scanPercentage"
          :mostRecentAnnouncementBlockNumber="mostRecentAnnouncementBlockNumber"
          :mostRecentAnnouncementTimestamp="mostRecentAnnouncementTimestamp"
          :mostRecentBlockNumber="mostRecentBlockNumber"
          :mostRecentBlockTimestamp="mostRecentBlockTimestamp"
          @reset="setFormStatus('waiting')"
        />
      </div>

      <!-- Scanning in progress -->
      <div
        v-if="(scanStatus === 'scanning' || scanStatus === 'scanning latest') && !userAnnouncements.length"
        class="text-center"
      >
        <progress-indicator :percentage="scanPercentage" />
        <div v-if="scanStatus === 'scanning'" class="text-center text-italic">{{ $t('Receive.scanning') }}</div>
        <div v-else class="text-center text-italic">{{ $t('Receive.scanning-latest') }}</div>
        <div class="text-center text-italic q-mt-lg" v-html="$t('Receive.wait')"></div>
      </div>

      <div
        v-else-if="(scanStatus === 'fetching latest' || scanStatus === 'fetching') && !userAnnouncements.length"
        class="text-center"
      >
        <loading-spinner />
        <div v-if="scanStatus === 'fetching'" class="text-center text-italic">
          {{ $t('Receive.fetching') }}
        </div>
        <div v-else class="text-center text-italic">{{ $t('Receive.fetching-latest') }}</div>
      </div>
      <div>
        <base-button
          v-if="scanStatus != 'complete' && scanStatus != 'waiting'"
          @click="terminateWorkers()"
          class="text-center q-pt-md"
          :label="$t('Receive.stop')"
        />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { QForm } from 'quasar';
import { Block } from '@ethersproject/abstract-provider';
import { UserAnnouncement, KeyPair, utils, AnnouncementDetail } from '@umbracash/umbra-js';
import { BigNumber, Web3Provider, computeAddress, isHexString } from 'src/utils/ethers';
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
import useWallet from 'src/store/wallet';
import { filterUserAnnouncements } from 'src/worker/worker';
import AccountReceiveTable from 'components/AccountReceiveTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';

function useScan() {
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress } = useWallet();
  type ScanStatus =
    | 'waiting'
    | 'fetching'
    | 'fetching latest'
    | 'scanning'
    | 'scanning latest'
    | 'complete'
    | 'complete latest';
  const scanStatus = ref<ScanStatus>('waiting');
  const scanPercentage = ref<number>(0);
  const userAnnouncements = ref<UserAnnouncement[]>([]);
  const workers: Worker[] = [];
  const paused = ref(false);

  const mostRecentAnnouncementTimestamp = ref<number>(0);
  const mostRecentAnnouncementBlockNumber = ref<number>(0);

  const mostRecentBlockTimestamp = ref<number>(0);
  const mostRecentBlockNumber = ref<number>(0);

  // Start and end blocks for advanced mode settings
  const { advancedMode, startBlock, endBlock, setScanBlocks, setScanPrivateKey, scanPrivateKey, resetScanSettings } =
    useSettingsStore();
  const { signer, userAddress: userWalletAddress, isAccountSetup, provider } = useWalletStore();
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
  const setFormStatus = (scanStatusVal: ScanStatus) => {
    scanStatus.value = scanStatusVal;
    scanPrivateKeyLocal.value = '';
    setScanPrivateKey('');
  };

  onMounted(async () => {
    startBlockLocal.value = startBlock.value; // read in last used startBlock
    endBlockLocal.value = endBlock.value; // read in last used endBlock
    if (hasKeys.value && !advancedMode.value) await scan(); // if user already signed and we have their keys in memory, start scanning
  });

  async function getPrivateKeysHandler() {
    // Validate form and reset userAnnouncements
    if (advancedMode.value) {
      userAnnouncements.value = [];
      const isFormValid = await settingsFormRef.value?.validate(true);
      if (!isFormValid) return;
    }

    if (Number(startBlockLocal.value) > Number(endBlockLocal.value || undefined)) {
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
      if (scanPrivateKeyLocal.value.length === 64) scanPrivateKeyLocal.value = `0x${scanPrivateKeyLocal.value}`;
      await utils.assertSupportedAddress(computeAddress(scanPrivateKeyLocal.value));
      setScanPrivateKey(scanPrivateKeyLocal.value);
    }
    await scan();
  }

  function terminateWorkers() {
    workers.forEach((worker) => worker.terminate());
    paused.value = true;
    if (scanStatus.value == 'fetching latest') {
      scanStatus.value = 'waiting';
    } else {
      scanStatus.value = 'complete';
    }
  }

  async function getLastBlock(provider: Web3Provider): Promise<Block> {
    return provider.getBlock('latest');
  }

  async function scan() {
    // Reset paused state
    paused.value = false;
    if (!umbra.value) throw new Error('No umbra instance found. Please make sure you are on a supported network');
    scanStatus.value = 'fetching latest';

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const chooseKey = (keyPair: string | undefined | null) => {
      if (advancedMode.value && scanPrivateKey.value) return String(scanPrivateKey.value);
      return String(keyPair);
    };

    // Fetch announcements
    const overrides = { startBlock: startBlockLocal.value, endBlock: endBlockLocal.value };

    // Scan for funds
    const spendingPubKey = chooseKey(spendingKeyPair.value?.publicKeyHex);
    const viewingPrivKey = chooseKey(viewingKeyPair.value?.privateKeyHex);

    // Wrapper for `filterUserAnnouncements` so we can await for the first batch of web workers to finish before
    // creating new workers.
    const filterUserAnnouncementsAsync = (
      spendingPublicKey: string,
      viewingPrivateKey: string,
      announcements: AnnouncementDetail[]
    ) => {
      return new Promise<void>((resolve) => {
        filterUserAnnouncements(
          spendingPublicKey,
          viewingPrivateKey,
          announcements,
          workers,
          (percent) => {
            scanPercentage.value = Math.floor(percent);
          },
          (filteredAnnouncements) => {
            userAnnouncements.value = [...userAnnouncements.value, ...filteredAnnouncements].sort(function (a, b) {
              return parseInt(b.timestamp) - parseInt(a.timestamp);
            });
            if (scanStatus.value === 'scanning latest') scanStatus.value = 'complete latest';
            else scanStatus.value = 'complete';
            scanPercentage.value = 0;
            resolve();
          }
        );
      });
    };

    try {
      if (!signer.value) throw new Error('signer is undefined');
      if (!userWalletAddress.value) throw new Error('userWalletAddress is undefined');

      let announcementsCount = 0; // Track the count of announcements
      let announcementsQueue: AnnouncementDetail[] = []; // Announcements to be filtered
      let firstScanPromise = Promise.resolve();
      // When in advanced mode and a private key is provided,
      // we fetch user specified blocks in overrides or all announcements
      if (advancedMode.value && scanPrivateKey.value) {
        for await (const announcementsBatch of umbra.value.fetchAllAnnouncements(overrides)) {
          announcementsCount += announcementsBatch.length; // Increment count
          announcementsQueue = [...announcementsQueue, ...announcementsBatch];
          if (announcementsCount == 10000) {
            scanStatus.value = 'scanning latest';
            firstScanPromise = filterUserAnnouncementsAsync(spendingPubKey, viewingPrivKey, announcementsQueue);
            announcementsQueue = [];
          }
          // Update status if the scan is complete but additional announcements are still being fetched
          if ((scanStatus.value as ScanStatus) === 'complete') {
            scanStatus.value = 'fetching';
          }
        }
        // Wait for the first batch of web workers to finish scanning before creating new workers
        await firstScanPromise;
        scanStatus.value = 'scanning';
        await filterUserAnnouncementsAsync(spendingPubKey, viewingPrivKey, announcementsQueue);
        scanStatus.value = 'complete';
      } else if (advancedMode.value && !isAccountSetup.value && !scanPrivateKey.value) {
        userAnnouncements.value = [];
        scanStatus.value = 'complete';
      } else {
        // Fetch the most recent block
        const latestBlock: Block = await getLastBlock(provider.value!);
        mostRecentBlockNumber.value = latestBlock.number;
        mostRecentBlockTimestamp.value = latestBlock.timestamp;
        // Default scan behavior
        for await (const announcementsBatch of umbra.value.fetchSomeAnnouncements(
          signer.value,
          userWalletAddress.value,
          overrides
        )) {
          if (paused.value) {
            return;
          }

          announcementsCount += announcementsBatch.length; // Increment count
          announcementsBatch.forEach((announcement) => {
            const thisTimestamp = parseInt(announcement.timestamp);
            if (thisTimestamp > mostRecentAnnouncementTimestamp.value) {
              mostRecentAnnouncementTimestamp.value = thisTimestamp;
            }
            const thisBlock = parseInt(announcement.block);
            if (thisBlock > mostRecentAnnouncementBlockNumber.value) {
              mostRecentAnnouncementBlockNumber.value = thisBlock;
            }
          });

          announcementsQueue = [...announcementsQueue, ...announcementsBatch];
          if (announcementsCount == 10000) {
            scanStatus.value = 'scanning latest';
            firstScanPromise = filterUserAnnouncementsAsync(spendingPubKey, viewingPrivKey, announcementsQueue);
            announcementsQueue = [];
          }
          // Update status if the scan is complete but additional announcements are still being fetched
          if ((scanStatus.value as ScanStatus) === 'complete latest') {
            scanStatus.value = 'fetching';
          }
        }
        // Wait for the first batch of web workers to finish scanning before creating new workers
        await firstScanPromise;
        // Clear out existing workers
        workers.length = 0;
        scanStatus.value = 'scanning';
        await filterUserAnnouncementsAsync(spendingPubKey, viewingPrivKey, announcementsQueue);
        scanStatus.value = 'complete';
      }
    } catch (e) {
      scanStatus.value = 'waiting'; // reset to the default state because we were unable to fetch announcements
      throw e;
    }
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
    isAccountSetup,
    isValidEndBlock,
    isValidPrivateKey,
    isValidStartBlock,
    mostRecentAnnouncementBlockNumber,
    mostRecentAnnouncementTimestamp,
    mostRecentBlockNumber,
    mostRecentBlockTimestamp,
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
    terminateWorkers,
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
