<template>
  <q-card class="border-top-thick">
    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">Confirm Withdrawal</h5>
    </q-card-section>

    <q-card-section>
      <div class="text-caption text-grey">Withdrawing to</div>
      <div>{{ destinationAddress }}</div>

      <div>
        <div class="text-caption text-grey q-mt-md">Amount</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <div>{{ formattedAmount }} {{ symbol }}</div>
        </div>
      </div>

      <div v-if="!isEth">
        <div class="text-caption text-grey q-mt-md">Relayer Gas Fee</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <div class="text-danger">-{{ formattedFee }} {{ symbol }}</div>
        </div>
      </div>

      <div v-if="!isEth" class="separator q-my-lg"></div>

      <div v-if="!isEth">
        <div class="text-caption text-grey">You'll receive</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <div class="text-bold">{{ formattedAmountReceived }} {{ symbol }}</div>
        </div>
      </div>

      <div v-if="!canWithdraw" class="border-warning q-mt-lg q-pa-md">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />
        Cannot withdraw because fee is larger than amount
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="!isWithdrawInProgress" class="row justify-end">
        <base-button @click="context.emit('cancel')" label="Cancel" :flat="true" />
        <base-button @click="context.emit('confirmed')" class="q-ml-lg" :disable="!canWithdraw" label="Confirm" />
      </div>
      <div v-else class="text-center">
        <q-spinner-puff class="q-mb-md" color="primary" size="2rem" />
        <div class="text-center text-italic">Withdraw in progress...</div>
        <a v-if="txHash.length === 66" class="text-caption hyperlink" :href="etherscanUrl" target="_blank">
          View transaction <q-icon name="fas fa-external-link-alt" right />
        </a>
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from '@vue/composition-api';
import { UserAnnouncement } from '@umbra/umbra-js';
import { FeeEstimate } from 'components/models';
import { BigNumber, formatUnits } from 'src/utils/ethers';
import { getEtherscanUrl, round } from 'src/utils/utils';

export default defineComponent({
  name: 'AccountReceiveTableWithdrawConfirmation',

  props: {
    activeAnnouncement: {
      type: Object as PropType<UserAnnouncement>,
      required: true,
    },

    activeFee: {
      type: Object as PropType<FeeEstimate>,
      required: true,
    },

    chainId: {
      type: Number,
      required: true,
    },

    destinationAddress: {
      type: String,
      required: true,
    },

    isWithdrawInProgress: {
      type: Boolean,
      required: true,
    },

    txHash: {
      type: String,
      required: true,
    },
  },

  setup(props, context) {
    const isEth = props.activeFee.token.symbol === 'ETH';
    const amount = props.activeAnnouncement.amount; // amount being sent
    const fee = props.activeFee.fee; // relayer fee
    const amountReceived = BigNumber.from(amount).sub(fee).toString(); // amount user will receive
    const decimals = props.activeFee.token.decimals; // number of decimals token has
    const symbol = props.activeFee.token.symbol; // token symbol
    const numDecimals = isEth ? 4 : 2; // maximum number of decimals to show
    const formattedAmount = round(formatUnits(amount, decimals), numDecimals); // amount being sent, rounded
    const formattedFee = round(formatUnits(fee, decimals), numDecimals); // relayer fee, rounded
    const formattedAmountReceived = round(formatUnits(amountReceived, decimals), numDecimals); // amount user will receive, rounded
    const canWithdraw = BigNumber.from(amount).gt(fee); // prevent withdraw attemps if fee is larger than amount
    const tokenURL = props.activeFee.token.logoURI; // URL pointing to token logo
    const etherscanUrl = computed(() => getEtherscanUrl(props.txHash, props.chainId)); // withdraw tx hash URL
    return {
      canWithdraw,
      context,
      etherscanUrl,
      formattedAmount,
      formattedAmountReceived,
      formattedFee,
      isEth,
      symbol,
      tokenURL,
    };
  },
});
</script>
