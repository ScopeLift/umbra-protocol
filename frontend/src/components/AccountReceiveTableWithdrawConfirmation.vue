<template>
  <q-card class="border-top-thick">
    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        {{ $t('AccountReceiveTableWithdrawConfirmation.confirm-withdrawal') }}
      </h5>
    </q-card-section>

    <q-card-section>
      <div class="text-caption text-grey">{{ $t('AccountReceiveTableWithdrawConfirmation.to') }}</div>
      <div>{{ $q.screen.xs ? formatNameOrAddress(destinationAddress) : destinationAddress }}</div>

      <div>
        <div class="text-caption text-grey q-mt-md">{{ $t('AccountReceiveTableWithdrawConfirmation.amount') }}</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <div>{{ formattedAmount }} {{ symbol }}</div>
        </div>
      </div>

      <div>
        <div v-if="isNativeToken" class="text-caption text-grey q-mt-md row items-center">
          <div>{{ useCustomFee ? 'Custom' : '' }} {{ $t('AccountReceiveTableWithdrawConfirmation.tx-fee') }}</div>
          <base-button
            v-if="useCustomFee"
            @click="toggleCustomFee"
            class="q-ml-xs"
            :dense="true"
            :flat="true"
            :label="$t('AccountReceiveTableWithdrawConfirmation.cancel')"
            size="1em"
          />
        </div>
        <div v-else class="text-caption text-grey q-mt-md">
          {{ $t('AccountReceiveTableWithdrawConfirmation.relayer-gas-fee') }}
        </div>

        <div v-if="useCustomFee" class="row justify-start items-center">
          <div class="col-12 row items-center">
            <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
            <span>-{{ formattedCustomTxCostEth }} {{ symbol }}</span>
          </div>
          <div class="col-12" :style="{ maxWidth: '200px' }">
            <base-input
              v-model="formattedCustomTxCostGwei"
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
          <div v-if="loaded">-{{ formattedDefaultTxCost }} {{ symbol }}</div>
          <!-- Custom fees not allowed on L2s, since gas price is affected by
          both L1 and L2 costs, so users will likely not estimate it properly -->
          <q-icon
            v-if="isNativeToken && loaded && ![10, 8453, 42161].includes(chainId)"
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
        <div class="text-caption text-grey">{{ $t('AccountReceiveTableWithdrawConfirmation.you-will-receive') }}</div>
        <div class="row justify-start items-center">
          <img :src="tokenURL" class="q-mr-sm" style="height: 1rem" />
          <q-spinner-puff v-if="!loaded" class="text-left q-ml-sm" color="primary" size="1rem" />
          <div v-else class="text-bold">{{ formattedAmountReceived }} {{ symbol }}</div>
        </div>
      </div>

      <div v-if="!canWithdraw" class="border-warning q-mt-lg q-pa-md">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />
        {{ $t('AccountReceiveTableWithdrawConfirmation.cannot-withdraw') }}
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="!isWithdrawInProgress" class="row justify-end">
        <base-button
          @click="context.emit('cancel')"
          :label="$t('AccountReceiveTableWithdrawConfirmation.cancel')"
          :flat="true"
        />
        <base-button
          @click="context.emit('confirmed', confirmationOptions)"
          class="q-ml-lg"
          :disable="!canWithdraw"
          :label="$t('AccountReceiveTableWithdrawConfirmation.confirm')"
        />
      </div>
      <div v-else class="text-center">
        <q-spinner-puff class="q-mb-md" color="primary" size="2rem" />
        <div class="text-center text-italic">
          {{ $t('AccountReceiveTableWithdrawConfirmation.withdraw-in-progress') }}
        </div>
        <a v-if="txHash.length === 66" class="text-caption hyperlink" :href="etherscanUrl" target="_blank">
          {{ $t('AccountReceiveTableWithdrawConfirmation.view-transaction') }}
          <q-icon name="fas fa-external-link-alt" right />
        </a>
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, PropType, ref, toRefs } from 'vue';
import { utils as umbraUtils, UserAnnouncement } from '@umbracash/umbra-js';
import { FeeEstimate } from 'components/models';
import { formatNameOrAddress, toAddress } from 'src/utils/address';
import { BigNumber, formatUnits } from 'src/utils/ethers';
import { getEtherscanUrl, getGasPrice, humanizeTokenAmount, humanizeArithmeticResult } from 'src/utils/utils';
import useWalletStore from 'src/store/wallet';

export default defineComponent({
  name: 'AccountReceiveTableWithdrawConfirmation',

  props: {
    activeAnnouncement: {
      type: Object as PropType<UserAnnouncement>,
      required: true,
    },

    // This refers to the relayer fee returned from the server. For native token withdrawals, this is ignored
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
    const { NATIVE_TOKEN, network, provider } = useWalletStore();
    const propsRef = toRefs(props);
    const isNativeToken = propsRef.activeFee.value.token.symbol === NATIVE_TOKEN.value.symbol;
    const amount = propsRef.activeAnnouncement.value.amount; // amount being withdrawn
    const symbol = propsRef.activeFee.value.token.symbol; // token symbol
    const tokenURL = propsRef.activeFee.value.token.logoURI; // URL pointing to image of token logo

    // Get properties dependent on those props
    const etherscanUrl = computed(() => getEtherscanUrl(propsRef.txHash.value, propsRef.chainId.value)); // withdrawal tx hash URL

    // amount being withdrawn, rounded
    const formattedAmount: string = humanizeTokenAmount(amount, propsRef.activeFee.value.token);

    function isValidFeeAmount(val: string) {
      if (!val || !(Number(val) > 0)) return 'Please enter an amount';
      if (BigNumber.from(amount).lte(customTxFeeInWei.value)) {
        return 'Gas price is too high';
      }
      return true;
    }

    // Get initial fee on component mount. If native token, calculate gas cost of a transfer, otherwise use the provided relayer fee
    const fee = ref<BigNumber | string>('0'); // default to a fee of zero
    const gasLimit = ref<BigNumber>(BigNumber.from('21000')); // default to a 21k gaslimit

    const loaded = ref(false); // true once we've fetched the initial gas price, to prevent resize issue shown here: https://github.com/ScopeLift/umbra-protocol/pull/206#pullrequestreview-718683599

    const useCustomFee = ref<boolean>(false);
    const toggleCustomFee = () => (useCustomFee.value = !useCustomFee.value);
    const formattedCustomTxCostGwei = ref<BigNumber | string>('0'); // gas price in Gwei
    // the custom gas price; determines what gas price is actually used when withdrawing
    const customGasPriceInWei = computed(() => {
      const customGasInGwei = formattedCustomTxCostGwei.value ? formattedCustomTxCostGwei.value : 0;
      return BigNumber.from(customGasInGwei).mul(10 ** 9);
    });
    const customTxFeeInWei = computed(() => gasLimit.value.mul(customGasPriceInWei.value));
    const formattedCustomTxCostEth = computed(() =>
      humanizeTokenAmount(customTxFeeInWei.value, propsRef.activeFee.value.token)
    );

    // Wrapper around getGasPrice which falls back to returning the node's gas price if getGasPrice fails
    async function tryGetGasPrice() {
      try {
        return await getGasPrice();
      } catch (e) {
        console.warn(`Could not get gas price: ${JSON.stringify(e)}`);
        return await provider.value?.getGasPrice();
      }
    }

    onMounted(async () => {
      if (isNativeToken) {
        // Flooring this because the string we get back from formatUnits is a decimal.
        const formattedCost = (gasPrice: BigNumber) => String(Math.floor(Number(formatUnits(gasPrice, 'gwei'))));
        const from = propsRef.activeAnnouncement.value.receiver;
        const to = await toAddress(propsRef.destinationAddress.value, provider.value!);

        // On Optimism or Base, we use Umbra's getEthSweepGasInfo method to ensure L1 fees are accounted for.
        // Otherwise we use the standard gasPrice * gasLimit as the default.
        if (network.value?.chainId === 10 || network.value?.chainId === 8453) {
          const { getEthSweepGasInfo } = umbraUtils;
          const sweepGasInfo = await getEthSweepGasInfo(from, to, provider.value!);
          gasLimit.value = sweepGasInfo.gasLimit;
          // The base fee used for the estimate may change by the time the user sends the transaction. As a result
          // we show a value 20% higher than the current fee estimate to account for fluctuations. In practice, the
          // transaction fee paid will be lower than this estimate.
          fee.value = sweepGasInfo.txCost.mul(120).div(100);
          formattedCustomTxCostGwei.value = formattedCost(sweepGasInfo.gasPrice);
        } else {
          gasLimit.value = (await provider.value?.estimateGas({ to, from, value: amount, gasPrice: 0 })) as BigNumber;
          const gasPrice = network.value?.chainId === 1 ? await tryGetGasPrice() : await provider.value?.getGasPrice(); // use blocknative on mainnet, the node elsewhere
          fee.value = gasLimit.value.mul(gasPrice!);
          formattedCustomTxCostGwei.value = formattedCost(gasPrice!);
        }
      } else {
        fee.value = propsRef.activeFee.value.fee;
      }
      loaded.value = true;
    });

    // Define computed properties dependent on the fee. Must be computed to react to gas price updates by user.
    // Variables prefixed with `formatted*` are intended for display in the UI.
    const amountReceived = computed(() => amount.sub(useCustomFee.value ? customTxFeeInWei.value : fee.value)); // amount user will receive

    // transaction fee, rounded
    const formattedDefaultTxCost = computed(() => {
      const txFee = isNativeToken ? fee.value : propsRef.activeFee.value.fee;
      return humanizeTokenAmount(txFee, propsRef.activeFee.value.token);
    });

    // amount user will receive, rounded
    const formattedAmountReceived = computed(() => {
      const formattedFee = useCustomFee.value ? formattedCustomTxCostEth : formattedDefaultTxCost;
      return humanizeArithmeticResult(
        amountReceived.value,
        // we want to base this on what the user *sees*, i.e. the formatted fees, since
        // they are what the user will be checking our calculations against
        [formattedAmount, formattedFee.value],
        propsRef.activeFee.value.token
      );
    });

    // prevent withdraw attempts if fee is larger than amount
    const canWithdraw = computed(() => {
      if (!loaded.value) return true; // assume true until finished loading, to prevent resize issue shown here: https://github.com/ScopeLift/umbra-protocol/pull/206#pullrequestreview-718683599
      const feeInWei = useCustomFee.value ? customTxFeeInWei.value : fee.value;
      return BigNumber.from(amount).gt(feeInWei) && BigNumber.from('0').lt(feeInWei);
    });
    const confirmationOptions = computed(() => {
      if (!isNativeToken) return {};
      const gasPrice = useCustomFee.value
        ? customGasPriceInWei.value
        : // fee is the total cost in wei for the gas, so we divide by the tx cost
          BigNumber.from(fee.value).div('21000');
      return { gasPrice };
    });

    return {
      canWithdraw,
      context,
      confirmationOptions,
      etherscanUrl,
      formatNameOrAddress,
      formattedAmount,
      formattedAmountReceived,
      formattedDefaultTxCost,
      formattedCustomTxCostGwei,
      formattedCustomTxCostEth,
      isNativeToken,
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
