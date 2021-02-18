<template>
  <q-page padding>
    <h1 class="page-title">Send</h1>

    <q-form @submit="onSubmit">
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
        <base-button label="Send" type="submit" color="primary" />
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { BigNumber } from '@ethersproject/bignumber';
import { parseUnits } from '@ethersproject/units';
import useWalletStore from 'src/store/wallet';
import { TokenInfo } from 'components/models';

function useSendForm() {
  const { tokens: tokenOptions, getTokenBalances, balances, umbra, signer } = useWalletStore();
  const recipientId = ref<string>();
  const token = ref<TokenInfo>();
  const humanAmount = ref<string>();

  function isValidId(val: string) {
    if (val && (val.endsWith('.eth') || val.endsWith('.crypto'))) return true;
    return 'Please enter an ENS or CNS name';
  }

  async function onSubmit() {
    // Form validation
    if (!recipientId.value || !token.value || !humanAmount.value)
      throw new Error('Please complete the form');
    if (Object.keys(balances.value).length === 0) await getTokenBalances(); // get user token balances

    const { address: tokenAddress, decimals } = token.value;
    const amount = BigNumber.from(parseUnits(humanAmount.value, decimals));
    if (amount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');
    if (!signer.value) throw new Error('Wallet not connected');
    if (!umbra.value) throw new Error('Umbra instance not configured');

    // Send with Umbra
    // TODO Currently fails since ENS setup is not finalized
    const { tx } = await umbra.value.send(signer.value, tokenAddress, amount, recipientId.value);
    console.log('tx: ', tx);
  }

  return { recipientId, humanAmount, tokenOptions, token, onSubmit, isValidId };
}

export default defineComponent({
  name: 'PageSend',
  setup() {
    return { ...useSendForm() };
  },
});
</script>
