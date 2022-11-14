<template>
  <q-form @submit="onFormSubmit" class="form">
    {{ Sends }}

    <div v-for="(Send, index) in Sends" :key="index">

      <!-- Identifier -->
      <div>{{ $t('Send.recipient') }}</div>
      <base-input
        v-model="Send.address"
        :debounce="500"
        :disable="isSending"
        :placeholder="index + 1 + '.eth'"
        lazy-rules
        :rules="isValidId"
        style="width: 10"
      />

      <!-- Token -->
      <div>{{ $t('Send.select-token') }}</div>
      <base-select
        v-model="Send.token"
        :disable="isSending"
        filled
        :label="$t('Send.token')"
        :options="tokenList"
        option-label="symbol"
      />

      <!-- Amount -->
      <div>
        {{ $t('Send.amount') }}
      </div>
      <base-input
        v-model="Send.amount"
        :disable="isSending"
        placeholder="0"
        :appendButtonDisable="!Send.address || !isValidRecipientId"
        :appendButtonLabel="Send.token && NATIVE_TOKEN && Send.token.address !== NATIVE_TOKEN.address ? $t('Send.max') : ''"
        @click="setHumanAmountMax(Send.token, Send.address, Send.amount)"
      />

      <p> {{ index }} {{ Send }} </p>

    </div>

    <base-button @click="addFields(Sends)" label="Add fields"/>
    <base-button :full-width="true" :label="$t('Send.send')" :loading="isSending" type="submit" />

  </q-form>
</template>

<script lang="ts">
// --- External imports ---
import { computed, defineComponent, getCurrentInstance, onMounted, ref, watch } from '@vue/composition-api';
// import { QForm, QInput } from 'quasar';
import { utils as umbraUtils } from '@umbra/umbra-js';
// --- Store ---
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
// --- Other ---
import { txNotify } from 'src/utils/alerts';
import { BigNumber, Contract, getAddress, MaxUint256, parseUnits, formatUnits, Zero } from 'src/utils/ethers';
import { humanizeTokenAmount, humanizeMinSendAmount, humanizeArithmeticResult } from 'src/utils/utils';
// import { generatePaymentLink, parsePaymentLink } from 'src/utils/payment-links';
import { Provider, TokenInfoExtended } from 'components/models';
import { ERC20_ABI } from 'src/utils/constants';
import { toAddress } from 'src/utils/address';



interface SendBatch {
      address: string;
      token: TokenInfoExtended | null;
      amount: string;
};

function useBatchSendForm() {
  const { advancedMode } = useSettingsStore();
  const {
    balances,
    // chainId,
    // currentChain,
    getTokenBalances,
    // isLoading,
    NATIVE_TOKEN,
    provider,
    signer,
    tokens: tokenList,
    umbra,
    userAddress,
  } = useWalletStore();

  // Helpers
  const isSending = ref(false);
  const vm = getCurrentInstance()!;

  // Form parameters
  const Sends = ref<SendBatch[]>([{address:'', token:null, amount:''}]);
  const isValidRecipientId = ref(true); // for showing/hiding bottom space (error message div) under input field

  const useNormalPubKey = ref(false);
  const shouldUseNormalPubKey = computed(() => advancedMode.value && useNormalPubKey.value); // only use normal public key if advanced mode is on

  const toll = ref<BigNumber>(Zero);
  const humanToll = computed(() => humanizeTokenAmount(toll.value, NATIVE_TOKEN.value));

  // Validators
  async function isValidId(val: string | undefined) {
    // Return true if nothing is provided
    if (!val) return true;

    // Check if recipient ID is valid
    try {
      await umbraUtils.lookupRecipient(val as string, provider.value as Provider, {
        advanced: shouldUseNormalPubKey.value,
      });
      return true;
    } catch (e) {
      const toSentenceCase = (str: string) => str[0].toUpperCase() + str.slice(1);
      if (e.reason) return toSentenceCase(e.reason);
      return toSentenceCase(e.message);
    }
  }

  function addFields(CurrentSends : SendBatch[]) {
    CurrentSends.push({address: '', token: null, amount: ''});
  }


  const isNativeToken = (address: string) => getAddress(address) === NATIVE_TOKEN.value.address;

  const getMinSendAmount = (tokenAddress: string): number => {
    const tokenInfo = tokenList.value.filter((token) => token.address === tokenAddress)[0];
    if (!tokenInfo) throw new Error(`token info unavailable for ${tokenAddress}`); // this state should not be possible
    const tokenMinSendInWei = parseUnits(tokenInfo.minSendAmount, 'wei');
    // We don't need to worry about fallbacks: native tokens have hardcoded fallbacks
    // defined in the wallet store. For any other tokens, we wouldn't have info about them
    // unless we got it from the relayer, which includes minSend amounts for all tokens.
    const minSend = Number(formatUnits(tokenMinSendInWei, tokenInfo.decimals));
    return humanizeMinSendAmount(minSend);
  };

  function isValidTokenAmount(val: string | undefined, token: TokenInfoExtended | null | undefined) {
    if (val === undefined) return true; // don't show error on empty field
    if (!val || !(Number(val) > 0)) return vm.$i18n.tc('Send.enter-an-amount');
    if (!token) return vm.$i18n.tc('Send.select-a-token');

    const { address: tokenAddress, decimals } = token;
    const minAmt = getMinSendAmount(tokenAddress);
    if (Number(val) < minAmt && isNativeToken(tokenAddress)) return `${vm.$i18n.tc('Send.send-at-least')} ${minAmt} ${NATIVE_TOKEN.value.symbol}`; // prettier-ignore
    if (Number(val) < minAmt && !isNativeToken(tokenAddress)) return `${vm.$i18n.tc('Send.send-at-least')} ${minAmt} ${token.symbol}`; // prettier-ignore

    const amount = parseUnits(val, decimals);
    if (!balances.value[tokenAddress]) return true; // balance hasn't loaded yet, so return without erroring
    if (amount.gt(balances.value[tokenAddress])) return `${vm.$i18n.tc('Send.amount-exceeds-balance')}`;
    return true;
  }


  async function onFormSubmit() {
    try {
      // Form validation
      // if (!recipientId.value || !token.value || !humanAmount.value)
      //   throw new Error(vm.$i18n.tc('Send.please-complete-form'));
      if (!signer.value) throw new Error(vm.$i18n.tc('Send.wallet-not-connected'));
      if (!umbra.value) throw new Error('Umbra instance not configured');

      // Verify the recipient ID is valid. (This throws if public keys could not be found. This check is also
      // done in the Umbra class `send` method, but we do it here to throw before the user pays for a token approval.
      // This should usually be caught by the isValidId rule anyway, but is here again as a safety check)
      const ethersProvider = provider.value as Provider;
      for (let i = 0; i < Sends.value.length; i++) {
        await umbraUtils.lookupRecipient(Sends.value[i].address, ethersProvider, { advanced: shouldUseNormalPubKey.value });
      }
      // Ensure user has enough balance. We re-fetch token balances in case amounts changed since wallet was connected.
      // This does not account for gas fees, but this gets us close enough and we delegate that to the wallet
      await getTokenBalances();
      const { address: tokenAddress, decimals } = token.value;
      const tokenAmount = parseUnits(humanAmount.value, decimals);
      if (tokenAddress === NATIVE_TOKEN.value.address) {
        // Sending the native token, so check that user has balance of: amount being sent + toll
        const requiredAmount = tokenAmount.add(toll.value);
        if (requiredAmount.gt(balances.value[tokenAddress]))
          throw new Error(`${vm.$i18n.tc('Send.amount-exceeds-balance')}`);
      } else {
        // Sending other tokens, so we need to check both separately
        const nativeTokenErrorMsg = `${NATIVE_TOKEN.value.symbol} ${vm.$i18n.tc('Send.umbra-fee-exceeds-balance')}`;
        if (toll.value.gt(balances.value[NATIVE_TOKEN.value.address])) throw new Error(nativeTokenErrorMsg);
        if (tokenAmount.gt(balances.value[tokenAddress])) throw new Error(vm.$i18n.tc('Send.amount-exceeds-balance'));
      }

      // If token, get approval when required
      isSending.value = true;
      if (token.value.symbol !== NATIVE_TOKEN.value.symbol) {
        // Check allowance
        const tokenContract = new Contract(token.value.address, ERC20_ABI, signer.value);
        const umbraAddress = umbra.value.umbraContract.address;
        const allowance = await tokenContract.allowance(userAddress.value, umbraAddress);
        // If insufficient allowance, get approval
        if (tokenAmount.gt(allowance)) {
          const approveTx = await tokenContract.approve(umbraAddress, MaxUint256);
          void txNotify(approveTx.hash, ethersProvider);
          await approveTx.wait();
        }
      }

      // Send with Umbra
      const { tx } = await umbra.value.send(signer.value, tokenAddress, tokenAmount, recipientId.value, {
        advanced: shouldUseNormalPubKey.value,
      });
      void txNotify(tx.hash, ethersProvider);
      await tx.wait();
      resetForm();
    } finally {
      isSending.value = false;
      showAdvancedSendWarning.value = false;
    }
  }

  async function setHumanAmountMax(token: TokenInfoExtended | null | undefined, recipientId: string | undefined, humanAmount: string | undefined) {
    if (!token?.address) throw new Error(vm.$i18n.tc('Send.select-a-token'));
    if (!recipientId) throw new Error(vm.$i18n.tc('Send.enter-a-recipient'));

    if (NATIVE_TOKEN.value?.address === token?.address) {
      if (!userAddress.value || !provider.value) throw new Error(vm.$i18n.tc('Send.wallet-not-connected'));
      const fromAddress = userAddress.value;
      const recipientAddress = await toAddress(recipientId, provider.value);
      const { ethToSend } = await umbraUtils.getEthSweepGasInfo(fromAddress, recipientAddress, provider.value);
      humanAmount = formatUnits(ethToSend, token.decimals);
      return ethToSend;
    }

    const tokenBalance = balances.value[token.address];
    humanAmount = formatUnits(tokenBalance.toString(), token.decimals);
    return tokenBalance.toString();
  }

  return {
    Sends,
    addFields,
    // isValidRecipientId,
    // acknowledgeSendRisk,
    // advancedMode,
    // advancedAcknowledged,
    // chainId,
    // currentChain,
    // humanAmount,
    humanToll,
    // humanTotalAmount,
    isSending,
    // isValidForm,
    isValidId,
    isValidRecipientId,
    isValidTokenAmount,
    NATIVE_TOKEN,
    onFormSubmit,
    // recipientId,
    // sendAdvancedButton,
    // sendFormRef,
    setHumanAmountMax,
    // showAdvancedWarning,
    // showAdvancedSendWarning,
    // token,
    tokenList,
    toll,
    // useNormalPubKey,
    userAddress,
  }
}


export default defineComponent({
  name: 'BatchSend',
  components: {  },

  setup() {



    return { ...useBatchSendForm() };
  },
})
</script>

<style lang="sass" scoped>
// Workaround so table only takes up the minimum required width
// https://stackoverflow.com/questions/26983301/how-to-make-a-table-column-be-a-minimum-width/26983473
td
  width: auto

td.min
  width: 1%
  white-space: nowrap
</style>
