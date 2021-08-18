<template>
  <q-form @submit="emit('initializeWithdraw')" class="form-wide q-pa-md" style="white-space: normal">
    <!-- Withdrawal form -->
    <div v-if="!isWithdrawInProgress">
      <div>Enter address to withdraw funds to</div>
      <base-input
        v-model="content"
        @input="emit('updateDestinationAddress', content)"
        @click="emit('initializeWithdraw')"
        appendButtonLabel="Withdraw"
        :appendButtonDisable="isWithdrawInProgress || isFeeLoading"
        :appendButtonLoading="isWithdrawInProgress"
        :disable="isWithdrawInProgress"
        label="Address"
        lazy-rules
        :rules="(val) => (val && val.length > 4) || 'Please enter valid address'"
      />
      <!-- Fee estimate -->
      <div class="q-mb-lg">
        <div v-if="!isEth && isFeeLoading" class="text-caption text-italic">
          <q-spinner-puff class="q-my-none q-mr-sm" color="primary" size="2rem" />
          Fetching fee estimate...
        </div>
        <div v-else-if="isEth" class="text-caption">Withdrawal fee: <span class="text-bold"> 0 ETH </span></div>
        <div v-else-if="activeFee" class="text-caption">
          Estimated withdrawal fee:
          <span class="text-bold">
            {{ round(formatUnits(activeFee.fee, activeFee.token.decimals)) }}
            {{ activeFee.token.symbol }}
          </span>
        </div>
      </div>
    </div>
    <div v-else class="text-center q-mb-lg">
      <q-spinner-puff class="q-mb-md q-mr-sm" color="primary" size="2rem" />
      <div class="text-center text-italic">Withdraw in progress...</div>
    </div>

    <!-- Privacy warning -->
    <div class="border q-mb-lg" />
    <div class="text-caption">
      <q-icon name="fas fa-exclamation-triangle" color="warning" left />
      <span class="text-bold">WARNING</span>: Be sure you understand the security implications before entering a
      withdrawal address. If you withdraw to an address publicly associated with you, privacy for this transaction will
      be lost. <router-link class="hyperlink" to="/faq#receiving-funds" target="_blank"> Learn more </router-link>.
    </div>

    <!-- Advanced feature: show private key -->
    <div v-if="advancedMode">
      <div @click="emit('togglePrivateKey')" class="text-caption hyperlink q-mt-lg">
        {{ spendingPrivateKey ? 'Hide' : 'Show' }} withdrawal private key
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
import { defineComponent, PropType, ref } from '@vue/composition-api';
import { formatUnits } from 'src/utils/ethers';
import { round } from 'src/utils/utils';
import { FeeEstimateResponse } from './models';

export default defineComponent({
  name: 'WithdrawForm',
  props: {
    destinationAddress: {
      type: String,
      required: false,
    },
    isWithdrawInProgress: {
      type: Boolean,
      required: true,
    },
    isFeeLoading: {
      type: Boolean,
      required: true,
    },
    isEth: {
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
  setup({ destinationAddress }, { emit }) {
    const content = ref<string>(destinationAddress || '');

    return { formatUnits, round, emit, content };
  },
});
</script>
