<template>
  <q-page padding>
    <h2 class="page-title">Send</h2>

    <q-form @submit="onFormSubmit" class="form" ref="sendFormRef">
      <!-- Identifier -->
      <div>Recipient's ENS or CNS name</div>
      <base-input v-model="recipientId" placeholder="vitalik.eth" lazy-rules :rules="isValidId" />

      <!-- Token -->
      <div>Select token to send</div>
      <base-select
        v-model="token"
        filled
        label="Token"
        :options="tokenOptions"
        option-label="symbol"
      />

      <!-- Amount -->
      <div>Amount to send</div>
      <base-input
        v-model="humanAmount"
        placeholder="0"
        lazy-rules
        :rules="(val) => (val && val > 0) || 'Please enter an amount'"
      />

      <!-- Send button -->
      <div>
        <base-button :full-width="true" label="Send" type="submit" />
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { QForm } from 'quasar';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import { TokenInfo } from 'components/models';
import erc20 from 'src/contracts/erc20.json';

function useSendForm() {
  const {
    tokens: tokenOptions,
    getTokenBalances,
    balances,
    umbra,
    signer,
    userAddress,
  } = useWalletStore();
  const { txNotify } = useAlerts();

  const recipientId = ref<string>();
  const token = ref<TokenInfo>();
  const humanAmount = ref<string>();
  const sendFormRef = ref<QForm>();

  function isValidId(val: string) {
    if (val && (val.endsWith('.eth') || val.endsWith('.crypto'))) return true;
    return 'Please enter an ENS or CNS name';
  }

  async function onFormSubmit() {
    // Form validation
    if (!recipientId.value || !token.value || !humanAmount.value)
      throw new Error('Please complete the form');
    if (Object.keys(balances.value).length === 0) await getTokenBalances(); // get user token balances

    const { address: tokenAddress, decimals } = token.value;
    const amount = BigNumber.from(parseUnits(humanAmount.value, decimals));
    if (amount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');
    if (!signer.value) throw new Error('Wallet not connected');
    if (!umbra.value) throw new Error('Umbra instance not configured');

    // If token, get approval
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
    resetForm();
    await tx.wait();
  }

  function resetForm() {
    recipientId.value = undefined;
    token.value = undefined;
    humanAmount.value = undefined;
    sendFormRef.value?.resetValidation();
  }

  return { sendFormRef, recipientId, humanAmount, tokenOptions, token, onFormSubmit, isValidId };
}

export default defineComponent({
  name: 'PageSend',
  setup() {
    return { ...useSendForm() };
  },
});
</script>
