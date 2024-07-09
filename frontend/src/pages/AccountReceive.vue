<template>
  <q-page padding>
    <h2 class="send-page-title">{{ $t('Receive.receive') }}</h2>
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
        <div v-if="needsSignature" class="text-center q-my-md">
          <template v-if="userAnnouncements.length">
            {{ $t('Receive.need-signature-lately') }}
          </template>
          <template v-else>
            {{ $t('Receive.need-signature') }}
          </template>
        </div>
        <div v-else class="text-center q-mb-md">{{ $t('Receive.scan-funds') }}</div>
        <base-button
          @click="getPrivateKeysHandler"
          class="text-center q-my-md"
          :label="needsSignature ? $t('Receive.sign') : $t('Receive.scan')"
        />

        <!-- Advanced mode settings -->
        <q-card v-if="advancedMode" class="q-pt-md q-px-md q-my-md">
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

      <!-- Scanning complete or there are user announcements -->
      <div v-if="userAnnouncements.length || scanStatus === 'complete'" class="text-center">
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

      <!-- Scanning in progress (only shown when no user annoucnements) -->
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
          v-if="scanStatus !== 'complete' && scanStatus !== 'waiting' && !userAnnouncements.length"
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
import { LocalStorage, QForm } from 'quasar';
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
  const { getPrivateKeys, umbra, spendingKeyPair, viewingKeyPair, hasKeys, userAddress, chainId } = useWallet();
  type ScanStatus =
    | 'waiting'
    | 'fetching'
    | 'fetching latest'
    | 'scanning'
    | 'scanning latest'
    | 'scanning latest from last fetched block'
    | 'complete'
    | 'complete latest';
  const scanStatus = ref<ScanStatus>('waiting');
  const scanPercentage = ref<number>(0);

  const lastFetchedBlockKey = computed(() =>
    userAddress.value && chainId.value ? `lastFetchedBlock-${userAddress.value}-${chainId.value}` : null
  );
  const userAnnouncementsLocalStorageKey = computed(() =>
    userAddress.value && chainId.value ? `userAnnouncements-${userAddress.value}-${chainId.value}` : null
  );
  const mostRecentAnnouncementTimestampKey = computed(() =>
    userAddress.value && chainId.value ? `mostRecentAnnouncementTimestamp-${userAddress.value}-${chainId.value}` : null
  );
  const mostRecentAnnouncementBlockNumberKey = computed(() =>
    userAddress.value && chainId.value
      ? `mostRecentAnnouncementBlockNumber-${userAddress.value}-${chainId.value}`
      : null
  );
  const userAnnouncements = ref<UserAnnouncement[]>([]);
  const mostRecentAnnouncementTimestamp = ref<number>();
  const mostRecentAnnouncementBlockNumber = ref<number>();
  const mostRecentBlockTimestamp = ref<number>(0);
  const mostRecentBlockNumber = ref<number>(0);

  // Start and end blocks for advanced mode settings
  const {
    advancedMode,
    startBlock,
    endBlock,
    setScanBlocks,
    setScanPrivateKey,
    scanPrivateKey,
    resetScanSettings: resetScanSettingsInSettingsStore,
  } = useSettingsStore();
  const { signer, userAddress: userWalletAddress, isAccountSetup, provider } = useWalletStore();

  const startBlockLocal = ref<number | undefined>(startBlock.value);

  function loadLastFetchedBlock() {
    if (lastFetchedBlockKey.value) {
      LocalStorage.getItem(lastFetchedBlockKey.value);
      const lastFetchedBlock = LocalStorage.getItem(lastFetchedBlockKey.value);
      window.logger.debug('Last fetched block loaded:', lastFetchedBlock);
      if (lastFetchedBlock) {
        startBlockLocal.value = Number(lastFetchedBlock);
        setScanBlocks(Number(lastFetchedBlock), endBlockLocal.value);
        return Number(lastFetchedBlock);
      }
    }

    return undefined;
  }

  function setLastFetchedBlock(block: number) {
    if (lastFetchedBlockKey.value) LocalStorage.set(lastFetchedBlockKey.value, block);
  }

  function resetLastFetchedBlock() {
    if (lastFetchedBlockKey.value) LocalStorage.remove(lastFetchedBlockKey.value);
  }

  function loadUserAnnouncementBlockData() {
    const storedBlockNumber = mostRecentAnnouncementBlockNumberKey.value
      ? LocalStorage.getItem(mostRecentAnnouncementBlockNumberKey.value)
      : undefined;
    if (storedBlockNumber) {
      mostRecentAnnouncementBlockNumber.value = Number(storedBlockNumber);
      window.logger.debug('Most recent announcement block number loaded:', mostRecentAnnouncementBlockNumber.value);
    }

    const storedTimestamp = mostRecentAnnouncementTimestampKey.value
      ? LocalStorage.getItem(mostRecentAnnouncementTimestampKey.value)
      : undefined;

    if (storedTimestamp) {
      mostRecentAnnouncementTimestamp.value = Number(storedTimestamp);
      window.logger.debug('Most recent announcement timestamp loaded:', mostRecentAnnouncementTimestamp.value);
    }

    return {
      mostRecentAnnouncementBlockNumber: Number(storedBlockNumber),
      mostRecentAnnouncementTimestamp: Number(storedTimestamp),
    };
  }

  function loadUserAnnouncements() {
    if (!userAnnouncementsLocalStorageKey.value) return;

    const storedAnnouncements = deserializeUserAnnouncements(
      LocalStorage.getItem(userAnnouncementsLocalStorageKey.value)
    );

    if (!storedAnnouncements) {
      window.logger.debug('No announcements found in local storage for key:', userAnnouncementsLocalStorageKey.value);
      return;
    }

    userAnnouncements.value = storedAnnouncements;
    window.logger.debug('Announcements loaded:', userAnnouncements.value);

    return storedAnnouncements;
  }

  function resetUserAnnouncements() {
    userAnnouncements.value = [];
    if (userAnnouncementsLocalStorageKey.value) LocalStorage.remove(userAnnouncementsLocalStorageKey.value);
  }

  function deduplicateAnnouncements(announcements: UserAnnouncement[]) {
    const seen = new Set();
    return announcements.filter((announcement) => {
      // Deduplicate by txHash and receiver address (stealth address) to handle batch sends
      const uniqueId = `${announcement.txHash}-${announcement.receiver}`;
      const duplicate = seen.has(uniqueId);
      seen.add(uniqueId);
      return !duplicate;
    });
  }

  // Watch for changes in userAddress or chainId to load announcements
  watch([userAddress, chainId], () => {
    window.logger.debug('Detected change in user address or chain ID, attempting to load announcements...');
    loadUserAnnouncements();
  });

  const workers: Worker[] = [];
  const paused = ref(false);

  // watch for changes in startBlock and update startBlockLocal
  watch(startBlock, (newVal) => {
    startBlockLocal.value = newVal;
    window.logger.debug('startBlockLocal updated:', startBlockLocal.value);
  });

  const endBlockLocal = ref<number | undefined>(endBlock.value);

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
    loadLastFetchedBlock();
    loadUserAnnouncementBlockData();
    loadUserAnnouncements();
    if (hasKeys.value && !advancedMode.value) await scan(); // if user already signed and we have their keys in memory, start scanning
  });

  // Watch for changes in userAnnouncements and save to localStorage
  watch(userAnnouncements, (newVal, oldVal) => {
    const serializedNewVal = serializeUserAnnouncements(newVal);
    const serializedOldVal = serializeUserAnnouncements(oldVal);
    if (serializedNewVal === serializedOldVal) return;

    if (userAnnouncementsLocalStorageKey.value) {
      LocalStorage.set(userAnnouncementsLocalStorageKey.value, serializedNewVal);
      window.logger.debug('Announcements updated in local storage:', newVal);
    }
  });

  // Serialize userAnnouncements to store in LocalStorage
  function serializeUserAnnouncements(announcements: UserAnnouncement[]) {
    return JSON.stringify(
      announcements.map((announcement) => ({
        ...announcement,
        amount: announcement.amount.toString(),
      }))
    );
  }

  // Deserialize userAnnouncements from LocalStorage
  function deserializeUserAnnouncements(serialized: string | null) {
    if (!serialized) return null;

    return JSON.parse(serialized).map((announcement: UserAnnouncement) => ({
      ...announcement,
      amount: BigNumber.from(announcement.amount),
    })) as UserAnnouncement[];
  }

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

    const isInitialScan = userAnnouncements.value.length === 0;
    scanStatus.value = 'fetching latest';

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const chooseKey = (keyPair: string | undefined | null) => {
      if (advancedMode.value && scanPrivateKey.value) return String(scanPrivateKey.value);
      return String(keyPair);
    };

    // Fetch announcements
    window.logger.debug(
      `Scanning for announcements from ${startBlockLocal.value ?? 'undefined'} to ${endBlockLocal.value ?? 'undefined'}`
    );
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
            userAnnouncements.value = deduplicateAnnouncements(
              [...userAnnouncements.value, ...filteredAnnouncements].sort(function (a, b) {
                return parseInt(b.timestamp) - parseInt(a.timestamp);
              })
            );
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
            if (thisTimestamp > (mostRecentAnnouncementTimestamp.value || 0)) {
              mostRecentAnnouncementTimestamp.value = thisTimestamp;
              // Save the most recent announcement timestamp to localStorage
              if (mostRecentAnnouncementTimestampKey.value) {
                LocalStorage.set(mostRecentAnnouncementTimestampKey.value, thisTimestamp);
              }
            }
            const thisBlock = parseInt(announcement.block);
            if (thisBlock > (mostRecentAnnouncementBlockNumber.value || 0)) {
              mostRecentAnnouncementBlockNumber.value = thisBlock;
              // Save the most recent announcement block number to localStorage
              if (mostRecentAnnouncementBlockNumberKey.value) {
                LocalStorage.set(mostRecentAnnouncementBlockNumberKey.value, thisBlock);
              }
            }
          });

          announcementsQueue = [...announcementsQueue, ...announcementsBatch];
          if (announcementsCount == 10000) {
            scanStatus.value = isInitialScan ? 'scanning latest' : 'scanning latest from last fetched block';
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
        scanStatus.value = isInitialScan ? 'scanning' : 'scanning latest from last fetched block';
        await filterUserAnnouncementsAsync(spendingPubKey, viewingPrivKey, announcementsQueue);
        scanStatus.value = 'complete';

        // Save the latest block to localStorage for future scans as the start block
        setLastFetchedBlock(latestBlock.number);

        // Update startBlockLocal with the latest block number
        startBlockLocal.value = latestBlock.number;
      }
    } catch (e) {
      scanStatus.value = 'waiting'; // reset to the default state because we were unable to fetch announcements
      throw e;
    }
  }

  function resetScanSettingsLocal() {
    scanStatus.value = 'waiting';
    scanPercentage.value = 0;
    startBlockLocal.value = undefined;
    endBlockLocal.value = undefined;
    scanPrivateKeyLocal.value = undefined;
    resetScanSettingsInSettingsStore();
  }

  function resetState() {
    resetScanSettingsLocal();
    resetLastFetchedBlock();
    resetUserAnnouncements();
  }

  // Handle changes in userAddress
  watch(userAddress, () => {
    if (!userAddress.value) return;

    // Always reset state if advanced mode is enabled
    if (advancedMode.value) {
      resetState();
      return;
    }

    // Get the user announcements from local storage
    const storedAnnouncements = loadUserAnnouncements();

    // Load the last fetched block
    const lastFetchedBlock = loadLastFetchedBlock();

    // Load the most recent announcement block data
    loadUserAnnouncementBlockData();

    if (storedAnnouncements && lastFetchedBlock) {
      window.logger.debug('User announcements found in local storage:', storedAnnouncements);
      startBlockLocal.value = lastFetchedBlock;
      setScanBlocks(lastFetchedBlock, endBlockLocal.value);
      return;
    }

    // Only reset state if the address has changed and is not undefined, or if no announcements are found
    window.logger.debug('Resetting state for new address:', userAddress.value);
    resetState();
  });

  // If no recent block data set and there are announcements, set the most recent block data
  watch(userAnnouncements, () => {
    if (!mostRecentAnnouncementBlockNumber.value && userAnnouncements.value.length) {
      const {
        mostRecentAnnouncementBlockNumber: blockNumInLocalStorage,
        mostRecentAnnouncementTimestamp: timestampInLocalStorage,
      } = loadUserAnnouncementBlockData();
      mostRecentAnnouncementBlockNumber.value = blockNumInLocalStorage;
      mostRecentAnnouncementTimestamp.value = timestampInLocalStorage;
    }
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
