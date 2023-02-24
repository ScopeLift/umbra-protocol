<template>
  <q-page padding>
    <h2 class="page-title">
      {{ $t('AccountSendTable.sent-funds') }}

      <base-tooltip class="q-ml-sm" icon="fas fa-question-circle">
        {{ $t('AccountSent.storage-description') }}
      </base-tooltip>
    </h2>
    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" :label="$t('AccountSent.connect-wallet')" />
        </connect-wallet>
      </div>
    </div>
    <div v-else class="q-mx-auto" style="max-width: 800px">
      <account-sent-table :sendMetadata="sendMetadata" />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import useWalletStore from 'src/store/wallet';
import AccountSentTable from 'components/AccountSentTable.vue';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { SendTableMetadataRow } from 'components/models';
import { BigNumber } from 'src/utils/ethers';
import { formatNameOrAddress } from 'src/utils/address';
import { formatDate, formatAmount, formatTime, getTokenSymbol, getTokenLogoUri } from 'src/utils/utils';
import { NATIVE_TOKEN_ADDRESS } from 'components/models';

function useAccountSent() {
  const { tokens, userAddress } = useWalletStore();
  const sendMetadata = ref<SendTableMetadataRow[]>([]);

  const data = [
    {
      amount: '1000000000000000000',
      tokenAddress: NATIVE_TOKEN_ADDRESS,
      dateSent: new Date(),
      address: '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5',
      hash: '0xabeea5720640859db6dc46caae44fe34449469bfae8e3e930d9f59abbf50ed50',
    },
    {
      amount: '2000000000000000000',
      tokenAddress: NATIVE_TOKEN_ADDRESS,
      dateSent: new Date('2021-01-01'),
      address: '0xEAC5F0d4A9a45E1f9FdD0e7e2882e9f60E301156',
      hash: '0xf1a4ad61bd073c8262f18a13b81f9a3ce33884d22963be3f9150719116ac3194',
    },
  ];

  sendMetadata.value = data.map((row) => {
    return {
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
    };
  });
  return {
    userAddress,
    sendMetadata,
  };
}
export default defineComponent({
  name: 'PageSent',
  components: { AccountSentTable, BaseTooltip, ConnectWallet },
  setup(context) {
    return { context, ...useAccountSent() };
  },
});
</script>
