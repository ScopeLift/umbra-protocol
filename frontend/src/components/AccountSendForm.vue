<template>
  <q-card class="card-form">
    <q-form @submit="send">
      <!-- Amount -->
      <p class="q-mb-none">Enter the identifier provided by the recipient.</p>
      <p class="text-caption q-mb-none">
        For example, <span class="text-monospace">someone.eth</span> or
        <span class="text-monospace">someone.crypto</span>
      </p>
      <base-input v-model="recipientId" label="Recipient identifier" />

      <!-- Token -->
      <p class="q-mb-none">Select the token to send</p>
      <base-select
        v-model="tokenToSend"
        label="Token"
        :options="tokenOptions"
        optionLabel="symbol"
      />

      <!-- Amount -->
      <p class="q-mb-none">Enter the amount to send</p>
      <base-input v-model="amountToSend" label="Amount" />

      <!-- Send Button -->
      <base-button :full-width="true" label="Send" type="submit" :loading="isLoading" />
    </q-form>
  </q-card>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import useWalletStore from 'src/store/wallet';
import { tokenList } from 'components/constants';
import { Token } from 'components/models';

function useSendForm() {
  const { chainId } = useWalletStore();
  const recipientId = ref<string>();
  const tokenToSend = ref<Token>();
  const amountToSend = ref<Token>();
  const isLoading = ref(false);
  const tokenOptions = computed(() => tokenList.filter((token) => token.chainId == chainId.value));

  // Send funds via Umbra
  function send() {
    isLoading.value = true;
    console.log(recipientId.value);
    console.log(tokenToSend.value);
    console.log(amountToSend.value);
    isLoading.value = false;
    throw new Error('Not implemented');
  }

  return { isLoading, recipientId, amountToSend, tokenToSend, tokenOptions, send };
}

export default defineComponent({
  name: 'AccountSendForm',
  setup() {
    return { ...useSendForm() };
  },
});
</script>
