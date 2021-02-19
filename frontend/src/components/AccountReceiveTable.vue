<template>
  <div>
    <q-table
      :columns="mainTableColumns"
      :data="announcements"
      :pagination="paginationConfig"
      row-key="randomNumber"
      title="Received Funds"
    >
    </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';
import { BigNumber } from '@ethersproject/bignumber';
import { Block, TransactionReceipt } from '@ethersproject/providers';
import { UserAnnouncement } from '@umbra/umbra-js';
// import useWalletStore from 'src/store/wallet';

function useReceivedFundsTable() {
  // const { tokens } = useWalletStore();
  const paginationConfig = { rowsPerPage: 25 };
  const mainTableColumns = [
    {
      align: 'left',
      field: 'block',
      label: 'Date Received',
      name: 'txDate',
      sortable: true,
      format: (val: Block) => new Date(val.timestamp * 1000).toLocaleDateString(),
    },
    {
      align: 'left',
      field: 'amount',
      label: 'Amount',
      name: 'txAmount',
      sortable: true,
      format: (val: BigNumber) => val.toString(),
    },
    {
      align: 'left',
      field: 'receipt',
      label: 'From',
      name: 'sender',
      sortable: true,
      format: (val: TransactionReceipt) => val.from,
    },
    {
      align: 'left',
      label: 'Withdraw Funds',
      name: 'actions',
      sortable: false,
    },
  ];

  return { paginationConfig, mainTableColumns };
}

export default defineComponent({
  name: 'AccountReceiveTable',
  props: {
    announcements: {
      type: (undefined as unknown) as PropType<UserAnnouncement>,
      required: true,
    },
  },

  setup() {
    return { ...useReceivedFundsTable() };
  },
});
</script>
