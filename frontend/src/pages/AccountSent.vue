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
      </div>
      <div v-else-if="scanStatus === 'scanning'" class="text-center">
        <progress-indicator :percentage="scanPercentage" />
        <div class="text-center text-italic">{{ $t('Receive.scanning') }}</div>
        <div class="text-center text-italic q-mt-lg" v-html="$t('Receive.wait')"></div>
      </div>
      <!-- Scanning complete -->
      <div v-else-if="scanStatus === 'complete'" class="text-center">
        <account-send-table :sendMetadata="sendMetadata" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import useWallet from 'src/store/wallet';
import useWalletStore from 'src/store/wallet';
import { AccountSendTable, SendTableMetdataRow } from 'components/AccountSendTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { fetchAccountSend } from 'src/utils/account-send';
import { BigNumber, formatUnits } from 'src/utils/ethers';
import { date } from 'quasar';
import { formatNameOrAddress } from 'src/utils/address';

// consolidate

function useAccountSent() {
  const { userAddress, viewingKeyPair, getPrivateKeys } = useWallet();
  const { tokens } = useWalletStore();
  // Make scan status a shared type
  type ScanStatus = 'waiting' | 'fetching' | 'scanning' | 'complete';
  const scanStatus = ref<ScanStatus>('waiting');
  const needsSignature = computed(() => !viewingKeyPair.value?.privateKeyHex);
  const viewingPrivateKey = computed(() => viewingKeyPair.value?.privateKeyHex);
  const sendMetadata = ref<SendTableMetdataRow[]>([]);
  //
  const scanPercentage = ref<number>(0);
  const getTokenInfo = (tokenAddress: string) => tokens.value.filter(token => token.address === tokenAddress)[0];

  const formatDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');

  /* const formatTime = (timestamp: number) => date.formatDate(timestamp, 'h:mm A'); */
  const formatAmount = (amount: BigNumber, tokenAddress: string) => {
    console.log('tokenAddress');
    console.log(tokenAddress);
    const decimals = getTokenInfo(tokenAddress).decimals;
    return Number(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 10,
    });
  };

  const getTokenLogoUri = (tokenAddress: string) => getTokenInfo(tokenAddress).logoURI;

  const formatTime = (timestamp: number) => date.formatDate(timestamp, 'h:mm A');

  const getTokenSymbol = (tokenAddress: string) => getTokenInfo(tokenAddress).symbol;

  async function getPrivateKeysHandler() {
    // Get user's signature if required
    if (needsSignature.value || !viewingPrivateKey.value) {
      const success = await getPrivateKeys();
      console.log('success!');
      console.log(success);
      if (success === 'denied') return; // if unsuccessful, user denied signature or an error was thrown
    }
    if (!viewingPrivateKey.value) {
      return; // TODO pop toast
    }
    scanStatus.value = 'scanning';
    // begin fetching sent data
    try {
      const data = await fetchAccountSend(viewingPrivateKey.value, percent => {
        scanPercentage.value = Math.floor(percent);
      });
      const formattedRows = [];
      for (const row of data) {
        formattedRows.push({
          amount: formatAmount(BigNumber.from(row.amount), row.tokenAddress),
          dateSent: formatDate(row.dateSent.getTime()),
          dateSentUnix: row.dateSent.getTime(),
          address: formatNameOrAddress(row.address.toString()),

          hash: row.hash,
          dateSentTime: formatTime(row.dateSent.getTime()),
          tokenLogo: getTokenLogoUri(row.tokenAddress),
          tokenAddress: row.tokenAddress,
          tokenSymbol: getTokenSymbol(row.tokenAddress),
        });
      }
      sendMetadata.value = formattedRows;
      scanStatus.value = 'complete';
    } catch (err) {
      console.log(err);
      resetState();
    }
  }

  function resetState() {
    scanStatus.value = 'waiting';
    scanPercentage.value = 0;
  }

  watch(userAddress, () => {
    if (userAddress.value) resetState();
  });

  return {
    userAddress,
    needsSignature,
    viewingPrivateKey,
    getPrivateKeysHandler,
    scanStatus,
    scanPercentage,
    sendMetadata,
  };
}

export default defineComponent({
  name: 'PageSent',
  components: { AccountSendTable, ConnectWallet },

  setup(context) {
    return { context, ...useAccountSent() };
  },
});
</script>
