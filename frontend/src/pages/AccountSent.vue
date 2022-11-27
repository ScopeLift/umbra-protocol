<template>
  <q-page padding>
    <h2 class="page-title">{{ $t('AccountSendTable.sent-funds') }}</h2>
    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">{{ $t('AccountSent.connect-your-wallet') }}</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" :label="$t('AccountSent.connect-wallet')" />
        </connect-wallet>
      </div>
    </div>
    <div v-else class="q-mx-auto" style="max-width: 800px">
      <div v-if="needsSignature || scanStatus === 'waiting'" class="form">
        <div v-if="needsSignature" class="text-center q-mb-md">
          {{ $t('AccountSent.need-signature') }}
        </div>
        <div v-else class="text-center q-mb-md">{{ $t('AccountSent.scan-funds') }}</div>
        <base-button
          @click="getPrivateKeysHandler"
          class="text-center"
          :label="needsSignature ? $t('AccountSent.sign') : $t('AccountSent.scan')"
        />
      </div>
      <div v-else-if="scanStatus === 'scanning'" class="text-center">
        <progress-indicator :percentage="scanPercentage" />
        <div class="text-center text-italic">{{ $t('AccountSent.scanning') }}</div>
        <div class="text-center text-italic q-mt-lg" v-html="$t('AccountSent.wait')"></div>
      </div>
      <!-- Scanning complete -->
      <div v-else-if="scanStatus === 'complete'" class="text-center">
        <account-send-table :sendMetadata="sendMetadata" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { computed, defineComponent, getCurrentInstance, ref, watch } from '@vue/composition-api';
import useWallet from 'src/store/wallet';
import useWalletStore from 'src/store/wallet';
import AccountSendTable from 'components/AccountSendTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { fetchAccountSend } from 'src/utils/account-send';
import { BigNumber } from 'src/utils/ethers';
import { formatNameOrAddress } from 'src/utils/address';
import { notifyUser } from 'src/utils/alerts';
import { formatDate, formatAmount, formatTime, getTokenSymbol, getTokenLogoUri } from 'src/utils/utils';

type SendTableMetdataRow = {
  dateSent: string;
  dateSentUnix: number;
  dateSentTime: string;
  amount: string;
  address: string;
  addressShortened: string;
  hash: string;
  tokenLogo?: string;
  tokenAddress: string;
  tokenSymbol: string;
};

function useAccountSent() {
  const { userAddress, viewingKeyPair, getPrivateKeys, chainId } = useWallet();

  const vm = getCurrentInstance()!;
  const { tokens } = useWalletStore();
  type ScanStatus = 'waiting' | 'fetching' | 'scanning' | 'complete';
  const scanStatus = ref<ScanStatus>('waiting');
  const needsSignature = computed(() => !viewingKeyPair.value?.privateKeyHex);
  const viewingPrivateKey = computed(() => viewingKeyPair.value?.privateKeyHex);
  const sendMetadata = ref<SendTableMetdataRow[]>([]);
  //
  const scanPercentage = ref<number>(0);

  async function getPrivateKeysHandler() {
    // Get user's signature if required
    if (needsSignature.value || !viewingPrivateKey.value) {
      const success = await getPrivateKeys();
      if (success === 'denied') return; // if unsuccessful, user denied signature or an error was thrown
    }
    if (!viewingPrivateKey.value) {
      notifyUser('error', `${vm.$i18n.tc('AccountSent.valid-private-key-missing')}`);
      return;
    }
    scanStatus.value = 'scanning';
    try {
      const data = await fetchAccountSend(userAddress.value!, chainId.value!, viewingPrivateKey.value, percent => {
        scanPercentage.value = Math.floor(percent);
      });
      const formattedRows = [];
      for (const row of data) {
        formattedRows.push({
          amount: formatAmount(BigNumber.from(row.amount), row.tokenAddress, tokens.value),
          dateSent: formatDate(row.dateSent.getTime()),
          dateSentUnix: row.dateSent.getTime(),
          address: row.address.toString(),
          addressShortened: formatNameOrAddress(row.address.toString()),

          hash: row.hash,
          hashShortened: formatNameOrAddress(row.hash),
          dateSentTime: formatTime(row.dateSent.getTime()),
          tokenLogo: getTokenLogoUri(row.tokenAddress, tokens.value),
          tokenAddress: row.tokenAddress,
          tokenSymbol: getTokenSymbol(row.tokenAddress, tokens.value),
        });
      }
      sendMetadata.value = formattedRows;
      scanStatus.value = 'complete';
    } catch (err) {
      console.error(err);
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
