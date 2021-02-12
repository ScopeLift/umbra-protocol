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
        type="number"
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
import useWalletStore from 'src/store/wallet';

function useSendForm() {
  const { tokens: tokenOptions } = useWalletStore();
  const recipientId = ref<string>();
  const token = ref<string>();
  const humanAmount = ref<string>();

  function isValidId(val: string) {
    if (val && (val.endsWith('.eth') || val.endsWith('.crypto'))) return true;
    return 'Please enter an ENS or CNS name';
  }

  function onSubmit() {
    if (!recipientId.value || !token.value || !humanAmount.value) {
      throw new Error('Please complete the form');
    }

    console.log('recipientId', recipientId.value);
    console.log('token', token.value);
    console.log('humanAmount', humanAmount.value);
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
