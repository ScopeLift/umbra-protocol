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
      <div v-if="!advancedMode">Recipient's ENS or CNS name</div>
      <div v-else>Recipient's ENS name, CNS name, transaction hash, address, or uncompressed public key</div>
      <base-input v-model="recipientId" :disable="isSending" placeholder="vitalik.eth" lazy-rules :rules="isValidId" />

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
        <base-button :disable="isSending" :full-width="true" label="Send" :loading="isSending" type="submit" />
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { QForm } from 'quasar';
import { getAddress, isHexString, MaxUint256, parseUnits, Contract } from 'src/utils/ethers';
import { ens, cns, utils as umbraUtils } from '@umbra/umbra-js';
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
import { txNotify } from 'src/utils/alerts';
import { TokenInfo } from 'components/models';
import ERC20 from 'src/contracts/ERC20.json';
import ConnectWallet from 'components/ConnectWallet.vue';

function useSendForm() {
  const { advancedMode } = useSettingsStore();
  const { tokens: tokenOptions, getTokenBalances, balances, umbra, signer, userAddress } = useWalletStore();

  // Helpers
  const sendFormRef = ref<QForm>();
  const isSending = ref(false);

  // Form parameters
  const recipientId = ref<string>();
  const token = ref<TokenInfo>();
  const humanAmount = ref<string>();

  function isValidId(val: string) {
    if (val && (ens.isEnsDomain(val) || cns.isCnsDomain(val))) return true;
    if (advancedMode.value) {
      // Also allow identifying recipient by transaction hash, address, or public key. We copy the checks
      // used by utils.lookupRecipient() here
      const isPublicKey = val.length === 132 && isHexString(val);
      const isTxHash = val.length === 66 && isHexString(val);
      const isValidAddress = val.length === 42 && isHexString(val);
      return isPublicKey || isTxHash || isValidAddress || 'Please enter a valid recipient identifer';
    }
    return 'Please enter an ENS or CNS name';
  }

  const isEth = (address: string) => getAddress(address) === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  function isValidTokenAmount(val: string) {
    if (!val || !(Number(val) > 0)) return 'Please enter an amount';
    if (!token.value) return 'Please select a token';

    const { address: tokenAddress, decimals } = token.value;
    if (Number(val) < 0.01 && isEth(tokenAddress)) return 'Please send at least 0.01 ETH';
    if (Number(val) < 25 && !isEth(tokenAddress)) return `Please send at least 25 ${token.value.symbol}`;

    const amount = parseUnits(val, decimals);
    if (amount.gt(balances.value[tokenAddress])) return 'Amount exceeds wallet balance';
    return true;
  }

  async function onFormSubmit() {
    try {
      // Form validation
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error('Please complete the form');
      if (!signer.value) throw new Error('Wallet not connected');
      if (!umbra.value) throw new Error('Umbra instance not configured');

      // Verify the recipient ID is valid. (This throws if public keys could not be found. This check is also
      // done in the Umbra class `send` method, but we do it here to throw before the user pays for a token approval)
      await umbraUtils.lookupRecipient(recipientId.value, signer.value.provider);

      // Ensure user has enough balance. We re-fetch user token balances in case amounts changed
      // after wallet was connected
      await getTokenBalances();
      const { address: tokenAddress, decimals } = token.value;
      const amount = parseUnits(humanAmount.value, decimals);
      if (amount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');

      // If token, get approval
      isSending.value = true;
      if (token.value.symbol !== 'ETH') {
        // Check allowance
        const tokenContract = new Contract(token.value.address, ERC20.abi, signer.value);
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
    isValidId,
    isValidTokenAmount,
    onFormSubmit,
    recipientId,
    sendFormRef,
    token,
    tokenOptions,
    userAddress,
  };
}

export default defineComponent({
  name: 'PageSend',
  components: { ConnectWallet },
  setup() {
    return { ...useSendForm() };
  },
});
</script>
