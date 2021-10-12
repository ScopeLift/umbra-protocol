<template>
  <q-page padding>
    <h2 class="page-title">Send</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">Connect your wallet to send funds</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" label="Connect Wallet" />
        </connect-wallet>
      </div>
    </div>

    <!-- Send form -->
    <q-form v-else @submit="onFormSubmit" class="form" ref="sendFormRef">
      <!-- Identifier -->
      <div>Recipient's ENS name, CNS name, or address</div>
      <base-input
        v-model="recipientId"
        :debounce="500"
        :disable="isSending"
        placeholder="vitalik.eth"
        lazy-rules
        :rules="isValidId"
      />

      <!-- Identifier, advanced mode tooltip -->
      <div
        v-if="advancedMode"
        class="row items-center text-caption q-pt-sm q-pb-lg"
        :style="!recipientId || isValidRecipientId ? 'margin-top:-2em' : ''"
      >
        <q-checkbox v-model="useNormalPubKey" class="col-auto" dense>
          Send using recipient's standard public key
        </q-checkbox>
        <base-tooltip class="col-auto q-ml-sm" icon="fas fa-question-circle">
          <span>
            When checked, the public key used will be the standard public for the provided Ethereum address. The
            receiver will have to enter their account's private key into this app to withdrawal the funds.
            <span class="text-bold">
              Don't use this feature unless you know what you're doing.
              <router-link
                class="dark-toggle hyperlink"
                :to="{ name: 'FAQ', hash: '#how-do-i-send-funds-to-a-user-by-their-address-or-public-key' }"
              >
                Learn more
              </router-link>
            </span>
          </span>
        </base-tooltip>
      </div>

      <!-- Token -->
      <div>Select token to send</div>
      <base-select
        v-model="token"
        :disable="isSending"
        filled
        label="Token"
        :options="tokenOptions"
        option-label="symbol"
      />

      <!-- Amount -->
      <div>Amount to send</div>
      <base-input v-model="humanAmount" :disable="isSending" placeholder="0" lazy-rules :rules="isValidTokenAmount" />

      <!-- Send button -->
      <div>
        <base-button
          :disable="!isValidForm || isSending"
          :full-width="true"
          label="Send"
          :loading="isSending"
          type="submit"
        />
        <base-button
          @click="generatePaymentLink({ to: recipientId, token, amount: humanAmount })"
          :disable="isSending"
          :flat="true"
          :full-width="true"
          icon="far fa-copy"
          label="Copy payment link"
        />
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
// --- External imports ---
import { computed, defineComponent, onMounted, ref, watch } from '@vue/composition-api';
import { QForm } from 'quasar';
import { utils as umbraUtils } from '@umbra/umbra-js';
// --- Components ---
import BaseTooltip from 'components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
// --- Store ---
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
// --- Other ---
import { txNotify } from 'src/utils/alerts';
import { getAddress, MaxUint256, parseUnits, Contract } from 'src/utils/ethers';
import { generatePaymentLink, parsePaymentLink } from 'src/utils/payment-links';
import { Provider, TokenInfo } from 'components/models';
import { ERC20_ABI } from 'src/utils/constants';

function useSendForm() {
  const { advancedMode } = useSettingsStore();
  const { tokens: tokenOptions, getTokenBalances, balances, umbra, signer, provider, userAddress } = useWalletStore();

  // Helpers
  const sendFormRef = ref<QForm>();
  const isSending = ref(false);

  // Form parameters
  const recipientId = ref<string>();
  const useNormalPubKey = ref(false);
  const shouldUseNormalPubKey = computed(() => advancedMode.value && useNormalPubKey.value); // only use normal public key if advanced mode is on
  const token = ref<TokenInfo>();
  const humanAmount = ref<string>();
  const isValidForm = ref(false);
  const isValidRecipientId = ref(true); // for showing/hiding bottom space (error message div) under input field

  watch(
    // We watch `shouldUseNormalPubKey` to ensure the "Address 0x123 has not registered stealkth keys" validation
    // message is hidden if the user checks the block after entering an address. We do this by checking if the
    // checkbox toggle was changed, and if so re-validating the form. The rest of this watcher is for handling
    // async validation rules
    [recipientId, token, humanAmount, shouldUseNormalPubKey],
    async ([recipientId, token, humanAmount, useNormalPubKey], [_p, _t, _h, prevUseNormalPubKey]) => {
      [_p, _t, _h]; // silence unused parameter error from TS compiler
      if (useNormalPubKey !== prevUseNormalPubKey) void sendFormRef.value?.validate();
      const validId = Boolean(recipientId) && (await isValidId(recipientId as string)) === true;
      isValidRecipientId.value = validId;
      const validAmount = Boolean(humanAmount) && isValidTokenAmount(humanAmount as string) === true;
      isValidForm.value = validId && Boolean(token) && validAmount;
    }
  );

  // Check for query parameters on load
  onMounted(async () => {
    const { to, token: paymentToken, amount } = await parsePaymentLink();
    if (to) recipientId.value = to;
    if (paymentToken?.symbol) token.value = paymentToken;
    if (amount) humanAmount.value = amount;
  });

  // Validators
  async function isValidId(val: string | undefined) {
    // Return true if nothing is provided
    if (!val) return true;

    // Check if recipient ID is valid
    try {
      await umbraUtils.lookupRecipient(recipientId.value as string, provider.value as Provider, {
        advanced: shouldUseNormalPubKey.value,
      });
      return true;
    } catch (e) {
      const toSentenceCase = (str: string) => str[0].toUpperCase() + str.slice(1);
      if (e.reason) return toSentenceCase(e.reason);
      return toSentenceCase(e.message);
    }
  }

  const isEth = (address: string) => getAddress(address) === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  function isValidTokenAmount(val: string | undefined) {
    if (val === undefined) return true; // don't show error on empty field
    if (!val || !(Number(val) > 0)) return 'Please enter an amount';
    if (!token.value) return 'Please select a token';

    const { address: tokenAddress, decimals } = token.value;
    if (Number(val) < 0.01 && isEth(tokenAddress)) return 'Please send at least 0.01 ETH';
    if (Number(val) < 50 && !isEth(tokenAddress)) return `Please send at least 50 ${token.value.symbol}`;

    const amount = parseUnits(val, decimals);
    if (!balances.value[tokenAddress]) return true; // balance hasn't loaded yet, so return without erroring
    if (amount.gt(balances.value[tokenAddress])) return 'Amount exceeds wallet balance';
    return true;
  }

  // Send funds
  async function onFormSubmit() {
    try {
      // Form validation
      console.log(1);
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error('Please complete the form');
      if (!signer.value) throw new Error('Wallet not connected');
      if (!umbra.value) throw new Error('Umbra instance not configured');
      console.log(2);

      // Verify the recipient ID is valid. (This throws if public keys could not be found. This check is also
      // done in the Umbra class `send` method, but we do it here to throw before the user pays for a token approval.
      // This should usually be caught by the isValidId rule anyway, but is here again as a safety check)
      const ethersProvider = provider.value as Provider;
      await umbraUtils.lookupRecipient(recipientId.value, ethersProvider, { advanced: shouldUseNormalPubKey.value });
      console.log(3);

      // Ensure user has enough balance. We re-fetch token balances in case amounts changed since wallet was connected
      await getTokenBalances();
      const { address: tokenAddress, decimals } = token.value;
      const amount = parseUnits(humanAmount.value, decimals);
      if (amount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');
      console.log(4);

      // If token, get approval when required
      isSending.value = true;
      if (token.value.symbol !== 'ETH') {
        // Check allowance
        const tokenContract = new Contract(token.value.address, ERC20_ABI, signer.value);
        const umbraAddress = umbra.value.umbraContract.address;
        const allowance = await tokenContract.allowance(userAddress.value, umbraAddress);
        // If insufficient allowance, get approval
        if (amount.gt(allowance)) {
          const approveTx = await tokenContract.approve(umbraAddress, MaxUint256);
          void txNotify(approveTx.hash, ethersProvider);
          await approveTx.wait();
        }
      }

      // Send with Umbra
      console.log(5);
      const { tx } = await umbra.value.send(signer.value, tokenAddress, amount, recipientId.value, {
        advanced: shouldUseNormalPubKey.value,
      });
      console.log(6);
      void txNotify(tx.hash, ethersProvider);
      await tx.wait();
      resetForm();
    } finally {
      isSending.value = false;
    }
  }

  function resetForm() {
    recipientId.value = undefined;
    token.value = undefined;
    humanAmount.value = undefined;
    sendFormRef.value?.resetValidation();
  }

  return {
    advancedMode,
    humanAmount,
    isSending,
    isValidForm,
    isValidId,
    isValidRecipientId,
    isValidTokenAmount,
    onFormSubmit,
    recipientId,
    sendFormRef,
    token,
    tokenOptions,
    useNormalPubKey,
    userAddress,
  };
}

export default defineComponent({
  name: 'PageSend',
  components: { BaseTooltip, ConnectWallet },
  setup() {
    return { generatePaymentLink, ...useSendForm() };
  },
});
</script>
