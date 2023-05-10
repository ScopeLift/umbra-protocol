<template>
  <div>
    <div class="text-caption q-mb-sm">
      {{ $t('AccountSentTable.stored-on-device') }}.
      <router-link
        class="cursor-pointer hyperlink"
        :to="{ name: 'FAQ', hash: '#why-cant-I-see-my-send-history-on-different-devices' }"
        >{{ $t('AccountSentTable.learn-more') }}</router-link
      >.
    </div>
    <q-table
      :grid="$q.screen.xs"
      card-container-class="col q-col-gutter-md"
      :columns="mainTableColumns"
      :rows="formattedSendMetadata"
      :no-data-label="$t('AccountSentTable.account-empty')"
      :pagination="paginationConfig"
      row-key="dateSentUnix"
      :title="$t('AccountSentTable.sent-funds')"
    >
      <template v-slot:top-left="props">
        <div class="flex">
          <div class="q-table__title" :props="props">{{ $t('AccountSentTable.sent-funds') }}</div>
          <base-tooltip class="q-ml-sm self-center" size="xs" icon="fas fa-question-circle">
            {{ $t('AccountSentTable.storage-description') }}
          </base-tooltip>
        </div>
      </template>
      <!-- Card Layout for grid option -->
      <template v-slot:item="props">
        <div :key="props.row.dateSentUnix" class="col-12">
          <q-card class="card-border cursor-pointer q-pa-md col justify-center items-center">
            <q-card-section class="row justify-center items-center">
              <img class="q-mr-md" :src="props.row.tokenLogo" style="width: 1.2rem" />
              <div class="text-primary text-h6 header-black q-pb-none">
                {{ props.row.amount }} {{ props.row.tokenSymbol }}
              </div>
            </q-card-section>
            <div class="row justify-between items-center">
              <div>
                <span class="q-mr-xs">
                  {{ $t('AccountSentTable.receiver') }}
                  <span v-if="true" class="q-ml-sm">
                    <base-tooltip label="🧙" size="sm">{{ $t('AccountSent.advanced-mode-on') }}</base-tooltip>
                  </span>
                  <span v-if="true" class="q-ml-sm">
                    <base-tooltip label="🔑" size="sm">{{ $t('AccountSent.use-public-key-checked') }}</base-tooltip>
                  </span>
                </span>
              </div>
              <div>
                <div @click="copyAddress(props.row.address, provider)" class="cursor-pointer copy-icon-parent">
                  <span>{{ props.row.recipientId }} </span>
                  <q-icon color="primary" class="q-ml-sm" name="far fa-copy" />
                </div>
              </div>
            </div>

            <div class="row justify-between items-center text-caption text-grey">
              <div>{{ $t('AccountSentTable.date-sent') }}</div>
              <div>
                {{ props.row.dateSent }}
                {{ props.row.dateSentTime }}
              </div>
            </div>
          </q-card>
        </div>
      </template>

      <!-- Body row configuration -->
      <template v-slot:body="props">
        <q-tr :props="props" :key="props.row.dateSentUnix">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <!-- Date column -->
            <div v-if="col.name === 'dateSent'" class="d-inline-block">
              <div
                @click="openInEtherscan(props.row.txHash, provider, chainId)"
                class="row justify-start items-center cursor-pointer external-link-icon-parent"
              >
                <div class="col-auto">
                  <div>{{ col.value }}</div>
                  <div class="text-caption text-grey">{{ props.row.dateSentTime }}</div>
                </div>
                <q-icon class="external-link-icon" name="fas fa-external-link-alt" right />
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
            <div v-else-if="col.name === 'from'" class="d-inline-block">
              <div @click="copyAddress(props.row.address, provider)" class="cursor-pointer copy-icon-parent">
                <span class="">
                  {{ props.row.recipientId }}
                  <span v-if="props.row.advancedMode">
                    <base-tooltip class="q-mb-md" label="🧙" size="sm">{{
                      $t('AccountSentTable.advanced-mode-on')
                    }}</base-tooltip>
                  </span>
                  <span v-if="props.row.usePublicKeyChecked">
                    <base-tooltip class="q-mb-md" label="🔑" size="sm">{{
                      $t('AccountSentTable.use-public-key-checked')
                    }}</base-tooltip>
                  </span>
                </span>
                <q-icon class="copy-icon" name="far fa-copy" right />
              </div>
            </div>
            <!-- Default -->
            <div v-else>{{ col.value }}</div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SendTableMetadataRow } from 'components/models';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import useWalletStore from 'src/store/wallet';
import { copyAddress, openInEtherscan } from 'src/utils/utils';
import { tc } from 'src/boot/i18n';

export default defineComponent({
  name: 'AccountSentTable',
  components: { BaseTooltip },
  props: {
    sendMetadata: {
      type: undefined as unknown as PropType<SendTableMetadataRow[]>,
      required: true,
    },
  },
  setup(props, context) {
    const { provider, chainId } = useWalletStore();
    const paginationConfig = { rowsPerPage: 25 };
    const mainTableColumns = [
      {
        align: 'left',
        field: 'dateSent',
        label: tc('AccountSentTable.date-sent'),
        name: 'dateSent',
        sortable: true,
      },
      {
        align: 'left',
        field: 'amount',
        label: tc('AccountSentTable.amount'),
        name: 'amount',
        sortable: true,
      },
      {
        align: 'left',
        field: 'address',
        label: tc('AccountSentTable.address'),
        name: 'from',
        sortable: true,
      },
    ];
    return {
      context,
      paginationConfig,
      mainTableColumns,
      formattedSendMetadata: props.sendMetadata,
      copyAddress,
      openInEtherscan,
      provider,
      chainId,
    };
  },
});
</script>

<style lang="sass" scoped>
.copy-icon-parent:hover .copy-icon
  color: $primary
.copy-icon
  color: transparent
.external-link-icon-parent:hover .external-link-icon
  color: $primary
.external-link-icon
  color: transparent
</style>
