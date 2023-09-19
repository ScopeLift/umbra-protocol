<template>
  <q-page padding>
    <h2 class="page-title">
      {{ $t('AccountSendTable.sent-funds') }}
    </h2>
    <div class="q-mx-auto" style="max-width: 800px">
      <div v-if="!userAddress" class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" :label="$t('AccountSent.connect-wallet')" />
        </connect-wallet>
      </div>

      <div v-else-if="needsSignature" class="text-center q-mb-md">
        {{ $t('AccountSent.need-signature') }}
        <base-button @click="getData" class="text-center q-mt-md" :label="$t('AccountSent.sign')" />
      </div>
      <div v-else-if="dataLoading" class="text-center">
        <loading-spinner />
        <div class="text-center text-italic">{{ $t('AccountSent.fetching-send-history') }}</div>
      </div>
      <div v-else-if="!needsSignature && !dataLoading" class="q-mx-auto flex column" style="max-width: 800px">
        <account-sent-table :sendMetadata="sendMetadata" :clearHistory="clearHistory" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { KeyPair } from '@umbracash/umbra-js';

import useWalletStore from 'src/store/wallet';
import AccountSentTable from 'components/AccountSentTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { SendTableMetadataRow } from 'components/models';
import { BigNumber } from 'src/utils/ethers';
import { formatNameOrAddress } from 'src/utils/address';
import { formatDate, formatAmount, formatTime, getTokenSymbol, getTokenLogoUri } from 'src/utils/utils';
import { clearAccountSend, fetchAccountSends } from 'src/utils/account-send';

function useAccountSent() {
  const { tokens, userAddress, chainId, viewingKeyPair, spendingKeyPair, getPrivateKeys } = useWalletStore();
  const sendMetadata = ref<SendTableMetadataRow[]>([]);
  const dataLoading = ref<boolean>(false);
  const needsSignature = computed(() => !viewingKeyPair.value?.privateKeyHex);
  const viewingPrivateKey = computed(() => viewingKeyPair.value?.privateKeyHex);

  const getData = async () => {
    if (needsSignature.value) {
      const success = await getPrivateKeys();
      if (success === 'denied') return; // if unsuccessful, user denied signature or an error was thrown

      const { prefix: spendingPrefix, pubKeyXCoordinate: spendingPubKeyX } = KeyPair.compressPublicKey(String(spendingKeyPair.value?.publicKeyHex)); // prettier-ignore
      const { prefix: viewingPrefix, pubKeyXCoordinate: viewingPubKeyX } = KeyPair.compressPublicKey(String(viewingKeyPair.value?.publicKeyHex)); // prettier-ignore
      window.logger.debug('spendingPrefix : ', spendingPrefix);
      window.logger.debug('spendingPubKeyX: ', BigNumber.from(spendingPubKeyX).toString());
      window.logger.debug('viewingPrefix:   ', viewingPrefix);
      window.logger.debug('viewingPubKeyX:  ', BigNumber.from(viewingPubKeyX).toString());
    }
    // The viewingKeyPair should exist and this if statement is to appease the type checker guaranteeing privateKeyHex exists
    if (!viewingKeyPair.value?.privateKeyHex) {
      return;
    }
    dataLoading.value = true;
    const data = await fetchAccountSends({
      address: userAddress.value!,
      chainId: chainId.value!,
      viewingPrivateKey: viewingKeyPair.value?.privateKeyHex,
    });
    const formattedRows = [];
    for (const row of data) {
      formattedRows.push({
        amount: formatAmount(BigNumber.from(row.amount), row.tokenAddress, tokens.value),
        advancedMode: row.advancedMode,
        usePublicKeyChecked: row.usePublicKeyChecked,
        dateSent: formatDate(row.dateSent.getTime()),
        dateSentUnix: row.dateSent.getTime(),
        address: row.recipientAddress.toString(),
        recipientId: formatNameOrAddress(row.recipientId.toString()),
        txHash: row.txHash,
        dateSentTime: formatTime(row.dateSent.getTime()),
        tokenLogo: getTokenLogoUri(row.tokenAddress, tokens.value),
        tokenAddress: row.tokenAddress,
        tokenSymbol: getTokenSymbol(row.tokenAddress, tokens.value),
      });
    }
    sendMetadata.value = formattedRows;
    dataLoading.value = false;
  };

  const clearHistory = async () => {
    dataLoading.value = true;
    await clearAccountSend(userAddress.value!, chainId.value!);
    sendMetadata.value = [];
    dataLoading.value = false;
  };

  onMounted(async () => {
    if (!needsSignature.value) {
      await getData();
    }
  });

  return {
    userAddress,
    sendMetadata,
    getData,
    clearHistory,
    viewingPrivateKey,
    needsSignature,
    dataLoading,
  };
}
export default defineComponent({
  name: 'PageSent',
  components: { AccountSentTable, ConnectWallet },
  setup(context) {
    return { context, ...useAccountSent() };
  },
});
</script>
