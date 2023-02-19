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
      <account-send-table :sendMetadata="sendMetadata" />
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import useWallet from 'src/store/wallet';
import useWalletStore from 'src/store/wallet';
import AccountSendTable from 'components/AccountSendTable.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { BigNumber } from 'src/utils/ethers';
import { formatNameOrAddress } from 'src/utils/address';
import { formatDate, formatAmount, formatTime, getTokenSymbol, getTokenLogoUri } from 'src/utils/utils';
import { NATIVE_TOKEN_ADDRESS } from 'components/models';

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
// TODO: When interacting with real data we will want to add scanning

function useAccountSent() {
  const { userAddress } = useWallet();
  const { tokens } = useWalletStore();
  const sendMetadata = ref<SendTableMetdataRow[]>([]);

  // Get user's signature if required
  try {
    const formattedRows = [];
    const data = [
      {
        amount: '1000000000000000000',
        tokenAddress: NATIVE_TOKEN_ADDRESS,
        dateSent: new Date(),
        address: '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5',
        hash: '0xabeea5720640859db6dc46caae44fe34449469bfae8e3e930d9f59abbf50ed50',
      },
    ];
    //	  type SendMetadataDecrypted = {
    //  amount: string;
    //  address: string;
    //  dateSent: Date;
    //  hash: string;
    //  tokenAddress: string;
    //};

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
    console.log(formattedRows);
    sendMetadata.value = formattedRows;
  } catch (err) {
    console.error(err);
  }
  return {
    userAddress,
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
