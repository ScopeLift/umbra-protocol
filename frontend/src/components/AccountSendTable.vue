<template>
  <q-table
    :grid="$q.screen.xs"
    card-container-class="col q-col-gutter-md"
    :columns="mainTableColumns"
    :data="formattedSendMetadata"
    :no-data-label="$t('AccountSendTable.account-empty')"
    :pagination="paginationConfig"
    row-key="dateSentUnix"
    :title="$t('AccountSendTable.sent-funds')"
  >
    <!-- Card Layout for grid option -->
    <template v-slot:item="props">
      <div :key="props.row.dateSentUnix" class="col-12">
        <q-card class="card-border cursor-pointer q-pt-md col justify-center items-center">
          <q-card-section class="row justify-center items-center">
            <img class="q-mr-md" :src="props.row.tokenLogo" style="width: 1.2rem" />
            <div class="text-primary text-h6 header-black q-pb-none">
              {{ props.row.amount }} {{ props.row.tokenSymbol }}
            </div>
          </q-card-section>
          <div class="row justify-between items-center">
            <div>
              <span class="q-mr-xs">{{ $t('AccountReceiveTable.stealth-receiver') }}</span>
              <base-tooltip icon="fas fa-question-circle">
                <span>
                  {{ 'tooltip text' }}
                </span>
                <router-link
                  active-class="text-bold"
                  class="hyperlink dark-toggle"
                  :to="{ path: 'faq', hash: '#receiving-funds' }"
                >
                  {{ $t('AccountReceiveTable.learn-more') }}
                </router-link>
              </base-tooltip>
            </div>
            <div>
              <div @click="copyAddress(props.row.receiver, 'Receiver')" class="cursor-pointer copy-icon-parent">
                <span>{{ props.row.address }}</span>
                <q-icon color="primary" class="q-ml-sm" name="far fa-copy" />
              </div>
            </div>
          </div>

          <div class="row justify-between items-center text-caption text-grey">
            <div>{{ $t('AccountReceiveTable.received') }}</div>
            <div>
              {{ props.row.dateSent }}
              {{ props.row.dateSentTime }}
            </div>
          </div>
        </q-card>
      </div>
    </template>

    <!-- Header labels -->
    <template v-slot:header="props">
      <q-tr :props="props">
        <q-th v-for="col in props.cols" :key="col.name" :props="props">
          {{ col.label }}
          <!-- Question mark with tooltip for receiver column -->
        </q-th>
        <q-th auto-width />
      </q-tr>
    </template>

    <!-- Body row configuration -->
    <template v-slot:body="props">
      <q-tr :props="props" :key="props.row.dateSentUnix">
        <q-td v-for="col in props.cols" :key="col.name" :props="props">
          <!-- Date column -->
          <div v-if="col.name === 'dateSent'" class="d-inline-block">
            <div class="row justify-start items-center cursor-pointer external-link-icon-parent">
              <div class="col-auto">
                <div>{{ col.value }}</div>
                <div class="text-caption text-grey">{{ props.row.dateSentTime }}</div>
              </div>
            </div>
          </div>

          <!-- Amount column -->
          <div v-else-if="col.name === 'amount'">
            <div class="row justify-start items-center no-wrap">
              <img class="col-auto q-mr-md" :src="props.row.tokenLogo" style="width: 1.2rem" />
              <div class="col-auto">
                {{ col.value }}
                {{ props.row.tokenSymbol }}
              </div>
            </div>
          </div>

          <!-- Sender column -->
          <div v-else-if="col.name === 'address'" class="d-inline-block">
            <div @click="copyAddress(props.row.address, 'Sender')" class="cursor-pointer copy-icon-parent">
              <span>{{ props.row.address }}</span>
              <q-icon class="copy-icon" name="far fa-copy" right />
            </div>
          </div>
          <!-- Default -->
          <div v-else>{{ col.value }}</div>
        </q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script lang="ts">
// get the data as props

import { defineComponent, getCurrentInstance, PropType } from '@vue/composition-api';
import BaseTooltip from 'src/components/BaseTooltip.vue';

export type SendTableMetdataRow = {
  dateSent: string;
  dateSentUnix: number;
  dateSentTime: string;
  amount: string;
  address: string;
  hash: string;
  tokenLogo?: string;
  tokenAddress: string;
  tokenSymbol: string;
};

// 1. on mount fetch data
// 2. Event will trigger a refetch
export const AccountSendTable = defineComponent({
  name: 'AccountSendTable',
  components: { BaseTooltip },
  props: {
    sendMetadata: {
      type: (undefined as unknown) as PropType<SendTableMetdataRow[]>,
      required: true,
    },
  },

  setup(props, context) {
    const vm = getCurrentInstance()!;
    const paginationConfig = { rowsPerPage: 25 };
    function copyAddress() {
      //if (!provider.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.wallet-not-connected'));
      //const mainAddress = await toAddress(address, provider.value);
      //await copyToClipboard(mainAddress);
      //notifyUser('success', `${type} ${vm.$i18n.tc('AccountReceiveTable.address-copied')}`);
      console.log('Copy');
    }

    const mainTableColumns = [
      {
        align: 'left',
        field: 'dateSent',
        label: vm.$i18n.tc('AccountSendTable.date-sent'),
        name: 'dateSent',
        sortable: true,
      },
      {
        align: 'left',
        field: 'amount',
        label: vm.$i18n.tc('AccountSendTable.amount'),
        name: 'amount',
        sortable: true,
      },
      {
        align: 'left',
        field: 'address',
        label: vm.$i18n.tc('AccountSendTable.address'),
        name: 'from',
        sortable: true,
      },
      {
        align: 'left',
        field: 'hash',
        label: vm.$i18n.tc('AccountSendTable.hash'),
        name: 'hash',
        sortable: false,
      },
    ];

    return {
      context,
      paginationConfig,
      mainTableColumns,
      formattedSendMetadata: props.sendMetadata,
      copyAddress,
    };
  },
});
</script>
