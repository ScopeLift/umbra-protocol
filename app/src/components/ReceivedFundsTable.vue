<template>
  <div>
    <q-table
      title="Received Funds"
      :data="tableData"
      :columns="columns"
      :pagination.sync="pagination"
      row-key="name"
    >
      <!-- Header row -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
            class="header-bold text-uppercase darkestgrey"
            :class="{ 'darkgrey': $q.dark.isActive}"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

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

      <!-- From column -->
      <template v-slot:body-cell-sender="props">
        <q-td :props="props">
          <!-- TODO Update to handle mainnet URLs. Currently only handles Ropsten -->
          <a
            class="cursor-pointer"
            :href="`https://ropsten.etherscan.io/tx/${props.row.txHash}`"
            style="text-decoration: none; color: inherit; "
            target="_blank"
          >
            {{ props.row.from }}
            <q-icon
              color="primary"
              name="fas fa-external-link-alt"
              right
            />
          </a>
        </q-td>
      </template>

      <!-- Amount column -->
      <template v-slot:body-cell-txAmount="props">
        <q-td :props="props">
          <div class="row justify-start items-center">
            <img
              :src="`statics/tokens/${props.row.tokenName.toLowerCase()}.png`"
              width="20px"
            >
            <div class="q-ml-md">
              {{ props.row.amount }} {{ props.row.tokenName }}
            </div>
          </div>
        </q-td>
      </template>

      <!-- Actions -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div>
            <base-button
              :dense="true"
              :flat="true"
              label="Withdraw"
            />
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
      pagination: {
        sortBy: 'txDate',
        descending: true,
        rowsPerPage: 10,
      },
      columns: [
        {
          align: 'left',
          field: 'timestamp',
          label: 'Date Received',
          name: 'txDate',
          sortable: true,
        },
        {
          align: 'left',
          field: 'amount,',
          label: 'Amount',
          name: 'txAmount',
          sortable: true,
        },
        {
          align: 'left',
          field: 'from',
          label: 'From',
          name: 'sender',
          sortable: true,
        },
        {
          align: 'left',
          label: 'Withdraw Funds',
          name: 'actions',
          sortable: false,
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
