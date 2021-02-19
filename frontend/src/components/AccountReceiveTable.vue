<template>
  <div>
    <q-table
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
              <div>{{ getDate(col.value.timestamp * 1000) }}</div>
              <div class="text-caption text-grey">{{ getTime(col.value.timestamp * 1000) }}</div>
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
            <div class="q-pa-md">Withdraw form will go here</div>
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
import { Block } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { UserAnnouncement } from '@umbra/umbra-js';
import useWalletStore from 'src/store/wallet';

function useReceivedFundsTable(announcements: UserAnnouncement[]) {
  const { tokens, provider } = useWalletStore();
  const paginationConfig = { rowsPerPage: 25 };

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
  const getDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');
  const getTime = (timestamp: number) => date.formatDate(timestamp, 'H:mm A');
  const getTokenInfo = (tokenAddress: string) => {
    return tokens.value.filter((token) => token.address === tokenAddress)[0];
  };
  const getTokenSymbol = (tokenAddress: string) => getTokenInfo(tokenAddress).symbol;
  const getTokenLogoUri = (tokenAddress: string) => getTokenInfo(tokenAddress).logoURI;
  const formatAmount = (amount: BigNumber, tokenAddress: string) => {
    const decimals = getTokenInfo(tokenAddress).decimals;
    return Number(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
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
    const fromAddresses = announcements.map((announcement) => announcement.receipt.from);
    const formattedFromAddresses = await Promise.all(fromAddresses.map(formatAddress));
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.receipt.from = formattedFromAddresses[index];
      announcement.tx.from = formattedFromAddresses[index];
    });
  });

  return {
    paginationConfig,
    mainTableColumns,
    getDate,
    getTime,
    getTokenLogoUri,
    getTokenSymbol,
    formatAmount,
    formattedAnnouncements,
  };
}

export default defineComponent({
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
