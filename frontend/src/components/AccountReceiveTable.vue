<template>
  <div>
    <div v-if="isLoading" class="text-center">
      <loading-spinner />
      <div class="text-center text-italic">Scanning for funds...</div>
    </div>

    <q-table
      v-else
      :columns="mainTableColumns"
      :data="formattedAnnouncements"
      :pagination="paginationConfig"
      row-key="randomNumber"
      title="Received Funds"
    >
      <!-- Header labels -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
          <q-th auto-width />
        </q-tr>
      </template>

      <!-- Body row configuration -->
      <template v-slot:body="props">
        <q-tr :props="props" :key="props.row.id">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <!-- Asset column -->
            <div v-if="col.name === 'date'">
              <div>{{ formatDate(col.value.timestamp * 1000) }}</div>
              <div class="text-caption text-grey">{{ formatTime(col.value.timestamp * 1000) }}</div>
            </div>

            <!-- Amount column -->
            <div v-else-if="col.name === 'amount'">
              <div class="row justify-start items-center no-wrap">
                <img
                  class="col-auto q-mr-md"
                  :src="getTokenLogoUri(props.row.token)"
                  style="width: 1.5rem"
                />
                <div class="col-auto">
                  {{ formatAmount(col.value, props.row.token) }}
                  {{ getTokenSymbol(props.row.token) }}
                </div>
              </div>
            </div>

            <!-- From column -->
            <div v-else-if="col.name === 'from'">
              {{ col.value.from }}
            </div>

            <!-- Default -->
            <div v-else>
              {{ col.value }}
            </div>
          </q-td>

          <!-- Expansion button -->
          <q-td auto-width>
            <base-button
              @click="props.expand = !props.expand"
              color="primary"
              :dense="true"
              :flat="true"
              :label="props.expand ? 'Hide' : 'Withdraw'"
            />
          </q-td>
        </q-tr>

        <!-- Expansion row -->
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="bg-grey-2">
            <q-form class="q-pa-md">
              <div>Enter address to withdraw funds to</div>
              <div class="text-caption">
                <span class="text-bold">WARNING</span>: Be sure you understand the security
                implications before entering a withdrawal address. If you withdraw to an address
                publicly associated with you, privacy for this transaction will be lost
              </div>
              <base-input
                v-model="destinationAddress"
                @click="withdraw(props.row)"
                appendButtonLabel="Withdraw"
                label="Address"
                lazy-rules
                :rules="(val) => (val && val.length > 4) || 'Please enter valid address'"
              />
            </q-form>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from '@vue/composition-api';
import { date } from 'quasar';
import { BigNumber } from '@ethersproject/bignumber';
import { Block, TransactionResponse } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { UserAnnouncement, KeyPair } from '@umbra/umbra-js';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import BaseButton from './BaseButton.vue';

function useReceivedFundsTable(announcements: UserAnnouncement[]) {
  const { tokens, provider, umbra, spendingKeyPair, viewingKeyPair } = useWalletStore();
  const { txNotify } = useAlerts();
  const paginationConfig = { rowsPerPage: 25 };
  const isLoading = ref(false);
  const destinationAddress = ref('');

  const mainTableColumns = [
    {
      align: 'left',
      field: 'block',
      label: 'Date Received',
      name: 'date',
      sortable: true,
      sort: (a: Block, b: Block) => b.timestamp - a.timestamp,
    },
    {
      align: 'left',
      field: 'amount',
      label: 'Amount',
      name: 'amount',
      sortable: true,
      format: (val: BigNumber) => val.toString(),
    },
    {
      align: 'left',
      field: 'receipt',
      label: 'From',
      name: 'from',
      sortable: true,
    },
  ];

  // Table formatters
  const formatDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');
  const formatTime = (timestamp: number) => date.formatDate(timestamp, 'H:mm A');
  const getTokenInfo = (tokenAddress: string) => {
    return tokens.value.filter((token) => token.address === tokenAddress)[0];
  };
  const getTokenSymbol = (tokenAddress: string) => getTokenInfo(tokenAddress).symbol;
  const getTokenLogoUri = (tokenAddress: string) => getTokenInfo(tokenAddress).logoURI;
  const formatAmount = (amount: BigNumber, tokenAddress: string) => {
    const decimals = getTokenInfo(tokenAddress).decimals;
    return Number(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 10,
    });
  };
  const formatAddress = async (address: string) => {
    try {
      const ens = await provider.value?.lookupAddress(address);
      return ens || `${address}...${address}`;
    } catch (err) {
      return address;
    }
  };

  // Format announcements so from addresses support ENS
  const formattedAnnouncements = ref(announcements.reverse()); // We reverse so most recent transaction is first
  onMounted(async () => {
    isLoading.value = true;
    const fromAddresses = announcements.map((announcement) => announcement.receipt.from);
    const formattedFromAddresses = await Promise.all(fromAddresses.map(formatAddress));
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.receipt.from = formattedFromAddresses[index];
      announcement.tx.from = formattedFromAddresses[index];
    });
    isLoading.value = false;
  });

  async function withdraw(announcement: UserAnnouncement) {
    // Get token info and stealth private key
    const token = getTokenInfo(announcement.token);
    const stealthKeyPair = (spendingKeyPair.value as KeyPair).mulPrivateKey(
      announcement.randomNumber
    );

    console.log('spendingKeyPair.value?.privateKeyHex: ', spendingKeyPair.value?.privateKeyHex);
    console.log('token.address: ', token.address);
    console.log('announcement.receiver: ', announcement.receiver);
    console.log('destinationAddress.value: ', destinationAddress.value);
    // Send transaction
    let tx: TransactionResponse;
    if (token.symbol === 'ETH') {
      tx = await umbra.value?.withdraw(
        String(stealthKeyPair.privateKeyHex),
        token.address,
        announcement.receiver,
        destinationAddress.value
      );
    } else {
      //
    }
    txNotify(tx.hash);
  }

  return {
    isLoading,
    paginationConfig,
    mainTableColumns,
    formatDate,
    formatTime,
    getTokenLogoUri,
    getTokenSymbol,
    formatAmount,
    formattedAnnouncements,
    destinationAddress,
    withdraw,
  };
}

export default defineComponent({
  components: { BaseButton },
  name: 'AccountReceiveTable',
  props: {
    announcements: {
      type: (undefined as unknown) as PropType<UserAnnouncement[]>,
      required: true,
    },
  },

  setup(props) {
    return { ...useReceivedFundsTable(props.announcements) };
  },
});
</script>
