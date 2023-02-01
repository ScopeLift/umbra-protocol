<template>
  <q-form
    @submit="
      emit('initializeWithdraw');
      setIsInWithdrawFlow(true);
    "
    class="form-wide q-pa-md"
    style="white-space: normal"
  >
    <!-- Withdrawal form -->
    <div v-if="!isWithdrawn" class="q-mb-lg">
      <div v-if="!isWithdrawInProgress">
        <div>{{ $t('WithdrawForm.withdraw-address') }}</div>
        <base-input
          v-model="content"
          @update:modelValue="emitUpdateDestinationAddress"
          @click="
            emit('initializeWithdraw');
            setIsInWithdrawFlow(true);
          "
          :appendButtonLabel="$t('WithdrawForm.withdraw')"
          :appendButtonDisable="isInWithdrawFlow || isFeeLoading"
          :appendButtonLoading="isInWithdrawFlow"
          :disable="isInWithdrawFlow"
          :label="$t('WithdrawForm.address')"
          lazy-rules
          :rules="(val) => (val && val.length > 4) || $t('WithdrawForm.enter-valid-address')"
        />
        <!-- Fee estimate -->
        <div class="q-mb-lg">
          <div v-if="!isNativeToken && isFeeLoading" class="text-caption text-italic">
            <q-spinner-puff class="q-my-none q-mr-sm" color="primary" size="2rem" />
            {{ $t('WithdrawForm.fetching-fee-estimate') }}
          </div>
          <div v-else-if="isNativeToken" class="text-caption">
            {{ $t('WithdrawForm.withdrawal-fee') }} <span class="text-bold"> 0 {{ nativeTokenSymbol }} </span>
          </div>
          <div v-else-if="activeFee" class="text-caption">
            {{ $t('WithdrawForm.estimated-withdrawal-fee') }}
            <span class="text-bold">
              {{ humanizeTokenAmount(activeFee.fee, activeFee.token) }}
              {{ activeFee.token.symbol }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="text-center q-mb-lg">
        <q-spinner-puff class="q-mb-md q-mr-sm" color="primary" size="2rem" />
        <div class="text-center text-italic">{{ $t('WithdrawForm.withdraw-in-progress') }}</div>
      </div>
      <!-- Privacy warning -->
      <div class="border q-mb-lg" />
      <div class="text-caption">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />
        <span v-html="$t('WithdrawForm.warning')"></span>
        <router-link class="hyperlink" to="/faq#receiving-funds" target="_blank">
          {{ $t('WithdrawForm.learn-more') }} </router-link
        >.
      </div>
    </div>

    <!-- Advanced feature: show private key -->
    <div v-if="advancedMode">
      <div @click="emit('togglePrivateKey')" class="text-caption hyperlink">
        {{ spendingPrivateKey ? $t('WithdrawForm.hide') : $t('WithdrawForm.show') }}
        {{ $t('WithdrawForm.stealth-prv-key') }}
      </div>
      <div
        v-if="spendingPrivateKey"
        @click="emit('copyPrivateKey')"
        class="text-caption text-break-word cursor-pointer copy-icon-parent q-mt-sm"
      >
        <span>{{ spendingPrivateKey }}</span>
        <q-icon class="copy-icon" name="far fa-copy" right />
      </div>
    </div>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import { FeeEstimateResponse } from './models';
import { formatUnits } from 'src/utils/ethers';
import { humanizeTokenAmount } from 'src/utils/utils';
import useStatusesStore from 'src/store/statuses';
import useWalletStore from 'src/store/wallet';

export default defineComponent({
  name: 'WithdrawForm',
  props: {
    destinationAddress: {
      type: String,
      required: false,
    },
    isWithdrawn: {
      type: Boolean,
      required: true,
    },
    isWithdrawInProgress: {
      type: Boolean,
      required: true,
    },
    isFeeLoading: {
      type: Boolean,
      required: true,
    },
    isNativeToken: {
      type: Boolean,
      required: true,
    },
    spendingPrivateKey: {
      type: String,
      required: false,
    },
    activeFee: {
      type: Object as PropType<FeeEstimateResponse>,
      required: false,
    },
    advancedMode: {
      type: Boolean,
      required: true,
    },
  },
  setup(data, { emit }) {
    const { NATIVE_TOKEN } = useWalletStore();
    const { setIsInWithdrawFlow, isInWithdrawFlow } = useStatusesStore();
    const content = ref<string>(data.destinationAddress || '');
    const nativeTokenSymbol = NATIVE_TOKEN.value.symbol;

    function emitUpdateDestinationAddress(val: string) {
      emit('updateDestinationAddress', val);
    }

    return {
      formatUnits,
      humanizeTokenAmount,
      emit,
      emitUpdateDestinationAddress,
      content,
      nativeTokenSymbol,
      isInWithdrawFlow,
      setIsInWithdrawFlow,
    };
  },
});
</script>
