<template>
  <q-card class="border-top-thick">
    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">Confirm Withdrawal</h5>
    </q-card-section>

    <q-card-section>
      <div class="text-caption text-grey">Withdrawing to</div>
      <div>{{ $q.screen.xs ? formatAddress(destinationAddress) : destinationAddress }}</div>

      <div>
        <div class="text-caption text-grey q-mt-md">Amount</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <div>{{ formattedAmount }} {{ symbol }}</div>
        </div>
      </div>

      <div>
        <div v-if="isEth" class="text-caption text-grey q-mt-md row items-center">
          <div>{{ useCustomFee ? 'Custom' : '' }} Transaction Fee</div>
          <base-button
            v-if="useCustomFee"
            @click="toggleCustomFee"
            class="q-ml-xs"
            :dense="true"
            :flat="true"
            label="Cancel"
            size="1em"
          />
        </div>
        <div v-else class="text-caption text-grey q-mt-md">Relayer Gas Fee</div>
        <div v-if="useCustomFee" class="row justify-start items-center">
          <div class="col-12 row items-center">
            <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
            <span>-{{ formattedCustomFeeEth }} {{ symbol }}</span>
          </div>
          <div class="col-12" :style="{ maxWidth: '200px' }">
            <base-input
              v-model="formattedCustomFee"
              type="number"
              suffix="Gwei"
              :dense="true"
              :disable="isWithdrawInProgress"
              :lazyRules="false"
              :rules="isValidFeeAmount"
            >
            </base-input>
          </div>
        </div>
        <div v-else class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <q-spinner-puff v-if="!loaded" class="text-left q-ml-sm" color="primary" size="1rem" />
          <div v-if="loaded">-{{ formattedFee }} {{ symbol }}</div>
          <q-icon
            v-if="isEth && loaded"
            @click="toggleCustomFee"
            class="cursor-pointer"
            color="primary"
            name="fas fa-edit"
            right
          />
        </div>
      </div>

      <div class="separator q-my-lg"></div>

      <div>
        <div class="text-caption text-grey">You'll receive</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <q-spinner-puff v-if="!loaded" class="text-left q-ml-sm" color="primary" size="1rem" />
          <div v-else-if="useCustomFee" class="text-bold">{{ formattedAmountReceived }} {{ symbol }}</div>
          <div v-else class="text-bold">{{ formattedAmountReceived }} {{ symbol }}</div>
        </div>
      </div>

      <div v-if="!canWithdraw" class="border-warning q-mt-lg q-pa-md">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />
        Cannot withdraw, please correct fee error
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="!isWithdrawInProgress" class="row justify-end">
        <base-button @click="context.emit('cancel')" label="Cancel" :flat="true" />
        <base-button
          @click="context.emit('confirmed', confirmationOptions)"
          class="q-ml-lg"
          :disable="!canWithdraw"
          label="Confirm"
        />
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
import { computed, defineComponent, onMounted, PropType, ref } from '@vue/composition-api';
import { UserAnnouncement } from '@umbra/umbra-js';
import { FeeEstimate } from 'components/models';
import { formatAddress } from 'src/utils/address';
import { BigNumber, formatUnits } from 'src/utils/ethers';
import { getEtherscanUrl, getGasPrice, round } from 'src/utils/utils';

export default defineComponent({
  name: 'AccountReceiveTableWithdrawConfirmation',

  props: {
    activeAnnouncement: {
      type: Object as PropType<UserAnnouncement>,
      required: true,
    },

    // This refers to the relayer fee returned from the server. For ETH withdrawals, this is ignored
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
    // Parse the provided props
    const isEth = props.activeFee.token.symbol === 'ETH';
    const amount = props.activeAnnouncement.amount; // amount being withdrawn
    const decimals = props.activeFee.token.decimals; // number of decimals token has
    const symbol = props.activeFee.token.symbol; // token symbol
    const tokenURL = props.activeFee.token.logoURI; // URL pointing to image of token logo

    // Get properties dependent on those props
    const etherscanUrl = computed(() => getEtherscanUrl(props.txHash, props.chainId)); // withdrawal tx hash URL
    const ethDisplayDecimals = 6;
    const numDecimals = isEth ? ethDisplayDecimals : 2; // maximum number of decimals to show for numbers the UI (ETH fee will be small, hence the larger value)
    const formattedAmount = round(formatUnits(amount, decimals), numDecimals); // amount being withdrawn, rounded
    function isValidFeeAmount(val: string) {
      if (!val || !(Number(val) > 0)) return 'Please enter an amount';
      if (BigNumber.from(amount).lte(customFeeInWei.value)) {
        return 'Gas price is too high';
      }
      return true;
    }

    // Get initial fee on component mount. If ETH, calculate gas cost of a transfer, otherwise use the provided relayer fee
    const fee = ref<BigNumber | string>('0'); // default to a fee of zero
    const loaded = ref(false); // true once we've fetched the initial gas price, to prevent resize issue shown here: https://github.com/ScopeLift/umbra-protocol/pull/206#pullrequestreview-718683599

    const useCustomFee = ref<boolean>(false);
    const toggleCustomFee = () => (useCustomFee.value = !useCustomFee.value);
    const formattedCustomFee = ref<BigNumber | string>('0'); // gas price in Gwei
    // the custom gas price; determines what gas price is actually used when withdrawing
    const customGasInWei = computed(() => {
      const customGasInGwei = formattedCustomFee.value ? formattedCustomFee.value : 0;
      return BigNumber.from(customGasInGwei).mul(10 ** 9);
    });
    const customFeeInWei = computed(() => {
      const transactionGasUsed = '21000';
      return BigNumber.from(transactionGasUsed).mul(customGasInWei.value);
    });
    const formattedCustomFeeEth = computed(() =>
      round(formatUnits(customFeeInWei.value, decimals), ethDisplayDecimals)
    );

    onMounted(async () => {
      if (isEth) {
        const gasPrice = await getGasPrice();
        const ethFee = BigNumber.from('21000').mul(gasPrice);
        fee.value = ethFee;
        // flooring this b/c the string we get back from formatUnits is a decimal
        formattedCustomFee.value = String(Math.floor(Number(formatUnits(gasPrice, 'gwei'))));
      } else {
        fee.value = props.activeFee.fee;
      }
      loaded.value = true;
    });

    // Define computed properties dependent on the fee (must be computed to react to ETH gas price updates by user).
    // Variables prefixed with `formatted*` are inteded for display in the U)
    const amountReceived = computed(() => amount.sub(useCustomFee.value ? customFeeInWei.value : fee.value)); // amount user will receive
    const formattedFee = computed(() => round(formatUnits(fee.value, decimals), numDecimals)); // relayer fee, rounded
    const formattedAmountReceived = computed(() => round(formatUnits(amountReceived.value, decimals), numDecimals)); // amount user will receive, rounded
    // prevent withdraw attempts if fee is larger than amount
    const canWithdraw = computed(() => {
      if (!loaded.value) return true; // assume true until finished loading, to prevent resize issue shown here: https://github.com/ScopeLift/umbra-protocol/pull/206#pullrequestreview-718683599
      const feeInWei = useCustomFee.value ? customFeeInWei.value : fee.value;
      return BigNumber.from(amount).gt(feeInWei) && BigNumber.from('0').lt(feeInWei);
    });
    const confirmationOptions = computed(() => {
      if (!isEth) return {};
      return {
        // fee is the total cost in wei for the gas, so we divide by the tx cost
        gasPrice: useCustomFee.value ? customGasInWei.value : BigNumber.from(fee.value).div('21000'),
      };
    });

    return {
      canWithdraw,
      context,
      confirmationOptions,
      etherscanUrl,
      formatAddress,
      formattedAmount,
      formattedAmountReceived,
      formattedFee,
      formattedCustomFee,
      formattedCustomFeeEth,
      isEth,
      isValidFeeAmount,
      loaded,
      symbol,
      tokenURL,
      toggleCustomFee,
      useCustomFee,
    };
  },
});
</script>
