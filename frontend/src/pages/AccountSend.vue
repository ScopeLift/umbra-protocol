<template>
  <q-page padding>
    <h2 class="page-title">Send</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <connect-wallet-card text="Connect your wallet to send funds" />
    </div>

    <!-- Send form -->
    <q-form v-else @submit="onFormSubmit" class="form" ref="sendFormRef">
      <!-- Identifier -->
      <div>Recipient's ENS name</div>
      <base-input v-model="recipientId" placeholder="vitalik.eth" lazy-rules :rules="isValidId" />

      <!-- Token -->
      <div>Select token to send</div>
      <base-select v-model="token" filled label="Token" :options="tokenOptions" option-label="symbol" />

      <!-- Amount -->
      <div>Amount to send</div>
      <base-input v-model="humanAmount" placeholder="0" lazy-rules :rules="isValidTokenAmount" />

      <!-- Send button -->
      <div>
        <base-button :disable="isSendInProgress" :full-width="true" label="Send" type="submit" />
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { QForm } from 'quasar';
import { MaxUint256 } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';
import { ens } from '@umbra/umbra-js';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import { TokenInfo } from 'components/models';
import erc20 from 'src/contracts/erc20.json';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';

function useSendForm() {
  const { tokens: tokenOptions, getTokenBalances, balances, umbra, signer, userAddress } = useWalletStore();
  const { txNotify } = useAlerts();

  const recipientId = ref<string>();
  const token = ref<TokenInfo>();
  const humanAmount = ref<string>();
  const sendFormRef = ref<QForm>();
  const isSendInProgress = ref(false);

  function isValidId(val: string) {
    if (val && (ens.isEnsDomain(val) || val.endsWith('.crypto'))) return true;
    return 'Please enter an ENS or CNS name';
  }

  function isValidTokenAmount(val: string) {
    if (!val || !(Number(val) > 0)) return 'Please enter an amount';
    if (!token.value) return 'Please select a token';
    const { address: tokenAddress, decimals } = token.value;
    const amount = parseUnits(val, decimals);
    return amount.gt(balances.value[tokenAddress]) ? 'Amount exceeds wallet balance' : true;
  }

  async function onFormSubmit() {
    try {
      // Form validation
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error('Please complete the form');
      if (!signer.value) throw new Error('Wallet not connected');
      if (!umbra.value) throw new Error('Umbra instance not configured');

      // Ensure user has enough balance. We re-fetch user token balances in case amounts changed
      // after wallet was connected
      await getTokenBalances();
      const { address: tokenAddress, decimals } = token.value;
      const amount = parseUnits(humanAmount.value, decimals);
      if (amount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');

      // If token, get approval
      isSendInProgress.value = true;
      if (token.value.symbol !== 'ETH') {
        // Check allowance
        const tokenContract = new Contract(token.value.address, erc20.abi, signer.value);
        const umbraAddress = umbra.value.umbraContract.address;
        const allowance = await tokenContract.allowance(userAddress.value, umbraAddress);
        // If insufficient allowance, get approval
        if (amount.gt(allowance)) {
          const approveTx = await tokenContract.approve(umbraAddress, MaxUint256);
          txNotify(approveTx.hash);
          await approveTx.wait();
        }
      }

      // Send with Umbra
      const { tx } = await umbra.value.send(signer.value, tokenAddress, amount, recipientId.value);
      txNotify(tx.hash);
      await tx.wait();
      resetForm();
    } finally {
      isSendInProgress.value = false;
    }
  }

  function resetForm() {
    recipientId.value = undefined;
    token.value = undefined;
    humanAmount.value = undefined;
    sendFormRef.value?.resetValidation();
  }

  return {
    userAddress,
    isSendInProgress,
    sendFormRef,
    recipientId,
    humanAmount,
    tokenOptions,
    token,
    onFormSubmit,
    isValidId,
    isValidTokenAmount,
  };
}

export default defineComponent({
  name: 'PageSend',
  components: { ConnectWalletCard },
  setup() {
    return { ...useSendForm() };
  },
});
</script>
