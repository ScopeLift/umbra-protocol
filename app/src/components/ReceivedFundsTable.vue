<template>
  <div>
    <q-table
      title="Received Funds"
      :data="tableData"
      :columns="columns"
      row-key="name"
    >
      <!-- Date column -->
      <template v-slot:body-cell-txDate="props">
        <q-td :props="props">
          <div>
            {{ props.row.txDate }}
          </div>
          <div class="text-caption text-grey">
            {{ props.row.txTime }}
          </div>
        </q-td>
      </template>

      <!-- Amount column -->
      <template v-slot:body-cell-txAmount="props">
        <q-td :props="props">
          <div>
            {{ props.row.amount }} {{ props.row.tokenName }}
          </div>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'ReceivedFundsTable',

  props: {
    tableData: {
      type: undefined, // Object, but will be undefined before data is fetched
      required: true,
      default: undefined,
    },
  },

  data() {
    return {
      columns: [
        {
          name: 'txDate',
          label: 'Date Received',
          align: 'left',
          field: 'txDate',
          sortable: true,
        },
        {
          name: 'txAmount',
          label: 'Amount',
          align: 'left',
          field: 'amount',
          sortable: true,
        },
      ],
    };
  },

  computed: {
    ...mapState({
      privateKey: (state) => state.user.sensitive.privateKey,
    }),
  },
};
</script>
