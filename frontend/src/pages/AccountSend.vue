<template>
  <q-page v-if="isMaintenanceMode" padding>
    <div
      class="dark-toggle form-max-wide text-center text-bold q-pa-md"
      style="border-radius: 15px"
      :style="isDark ? 'color: #FFEEEE; background-color: #780A0A' : 'color: #610404; background-color: #FACDCD'"
    >
      Sending via Umbra has been temporarily disabled while we perform system maintenance. Please check back soon!
    </div>
  </q-page>

  <q-page v-else padding>
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
        v-if="advancedMode && false"
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

      <!-- Toll + summary details -->
      <div v-if="toll && toll.gt(0) && humanAmount && token">
        <div class="text-bold">Summary</div>

        <q-markup-table class="q-mb-lg" dense flat separator="none" style="background-color: rgba(0, 0, 0, 0)">
          <tbody>
            <!-- What user is sending -->
            <tr>
              <td class="min text-left" style="padding: 0 2rem 0 0">Sending</td>
              <td class="min text-right">{{ humanAmount }}</td>
              <td class="min text-left">{{ token.symbol }}</td>
              <td class="min text-left"><img :src="token.logoURI" height="15rem" /></td>
              <td><!-- Fills space --></td>
            </tr>
            <!-- Toll -->
            <tr>
              <td class="min text-left" style="padding: 0 2rem 0 0">
                Umbra Fee
                <base-tooltip class="col-auto q-ml-xs" icon="fas fa-question-circle">
                  <span>
                    Transactions on {{ currentChain.chainName }} are very cheap, so a small fee is charged to deter
                    spamming the protocol.
                    <router-link
                      class="dark-toggle hyperlink"
                      :to="{ name: 'FAQ', hash: '#why-is-there-sometimes-an-umbra-fee' }"
                    >
                      Learn more
                    </router-link>
                  </span>
                </base-tooltip>
              </td>
              <td class="min text-right">{{ humanToll }}</td>
              <td class="min text-left">{{ NATIVE_TOKEN.symbol }}</td>
              <td class="min text-left"><img :src="NATIVE_TOKEN.logoURI" height="15rem" /></td>
              <td><!-- Fills space --></td>
            </tr>
            <!-- Summary if they're sending native token -->
            <tr v-if="token.address === NATIVE_TOKEN.address">
              <td class="min text-left text-bold" style="padding: 0 2rem 0 0">Total</td>
              <td class="min text-right">{{ formatNumber(Number(humanAmount) + Number(humanToll)) }}</td>
              <td class="min text-left">{{ NATIVE_TOKEN.symbol }}</td>
              <td class="min text-left"><img :src="NATIVE_TOKEN.logoURI" height="15rem" /></td>
              <td><!-- Fills space --></td>
            </tr>
            <!-- Summary if they're sending other token -->
            <tr v-else>
              <td class="min text-left text-bold" style="padding: 0 2rem 0 0">Total</td>
              <td class="min text-right">{{ humanAmount }}</td>
              <td class="min text-left">{{ token.symbol }}</td>
              <td class="min text-left">+</td>
              <td class="min text-right" style="padding-left: 0">{{ humanToll }}</td>
              <td class="min text-left">{{ NATIVE_TOKEN.symbol }}</td>
              <td><!-- Fills space --></td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>

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
import { QForm, QInput } from 'quasar';
import { utils as umbraUtils } from '@umbra/umbra-js';
// --- Components ---
import BaseTooltip from 'components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
// --- Store ---
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
// --- Other ---
import { txNotify } from 'src/utils/alerts';
import { BigNumber, Contract, formatUnits, getAddress, MaxUint256, parseUnits, Zero } from 'src/utils/ethers';
import { round } from 'src/utils/utils';
import { generatePaymentLink, parsePaymentLink } from 'src/utils/payment-links';
import { Provider, TokenInfo } from 'components/models';
import { ERC20_ABI } from 'src/utils/constants';

function useSendForm() {
  const { advancedMode } = useSettingsStore();
  const {
    balances,
    currentChain,
    getTokenBalances,
    isLoading,
    NATIVE_TOKEN,
    provider,
    signer,
    tokens: tokenOptions,
    umbra,
    userAddress,
  } = useWalletStore();

  // Helpers
  const sendFormRef = ref<QForm>();
  const isSending = ref(false);

  // Form parameters
  const recipientId = ref<string>();
  const recipientIdBaseInputRef = ref<Vue>();
  const useNormalPubKey = ref(false);
  const shouldUseNormalPubKey = computed(() => advancedMode.value && useNormalPubKey.value); // only use normal public key if advanced mode is on
  const token = ref<TokenInfo | null>();
  const tokenBaseInputRef = ref<Vue>();
  const humanAmount = ref<string>();
  const humanAmountBaseInputRef = ref<Vue>();
  const isValidForm = ref(false);
  const isValidRecipientId = ref(true); // for showing/hiding bottom space (error message div) under input field
  const toll = ref<BigNumber>(Zero);
  const humanToll = computed(() => round(formatUnits(toll.value, 18), 4));

  watch(
    // We watch `shouldUseNormalPubKey` to ensure the "Address 0x123 has not registered stealkth keys" validation
    // message is hidden if the user checks the block after entering an address. We do this by checking if the
    // checkbox toggle was changed, and if so re-validating the form. The rest of this watcher is for handling
    // async validation rules
    [isLoading, shouldUseNormalPubKey, recipientId, token, humanAmount],
    async (
      [isLoadingValue, useNormalPubKey, recipientIdValue, tokenValue, humanAmountValue],
      [prevIsLoadingValue, prevUseNormalPubKey, prevRecipientIdValue, prevTokenValue, prevHumanAmountValue]
    ) => {
      // Fetch toll
      toll.value = <BigNumber>await umbra.value?.umbraContract.toll();

      // Validates value initially passed through params
      const recipientIdInputRef = recipientIdBaseInputRef.value?.$children[0] as QInput;
      const tokenInputRef = tokenBaseInputRef.value?.$children[0] as QInput;
      const humanAmountInputRef = humanAmountBaseInputRef.value?.$children[0] as QInput;
      if (recipientIdInputRef && recipientIdValue && typeof prevRecipientIdValue === 'undefined') {
        await recipientIdInputRef.validate();
      }

      if (tokenInputRef && tokenValue && typeof prevTokenValue === 'undefined') {
        await tokenInputRef.validate();
      }
      if (humanAmountInputRef && humanAmountValue && typeof prevHumanAmountValue === 'undefined') {
        await humanAmountInputRef.validate();
      }

      // Reset token and amount if token is not supported on the network
      if (
        tokenOptions.value.length &&
        !tokenOptions.value.some((tokenOption) => tokenOption.symbol === (tokenValue as TokenInfo)?.symbol)
      ) {
        token.value = tokenOptions.value[0];
        humanAmount.value = undefined;
      }

      // Revalidates form
      if (
        // on network change
        useNormalPubKey !== prevUseNormalPubKey ||
        isLoadingValue !== prevIsLoadingValue ||
        // when both token and value are present
        (tokenValue && humanAmountValue)
      ) {
        void sendFormRef.value?.validate();
      }
      const validId = Boolean(recipientIdValue) && (await isValidId(recipientIdValue as string)) === true;
      isValidRecipientId.value = validId;
      const validAmount = Boolean(humanAmountValue) && isValidTokenAmount(humanAmountValue as string) === true;
      isValidForm.value = validId && Boolean(tokenValue) && validAmount;
    }
  );

  onMounted(async () => {
    // Check for query parameters on load
    const { to, token: paymentToken, amount } = await parsePaymentLink(NATIVE_TOKEN.value);
    if (to) recipientId.value = to;
    if (amount) humanAmount.value = amount;

    // For token, we always default to the chain's native token if none was selected
    if (paymentToken?.symbol) token.value = paymentToken;
    else token.value = tokenOptions.value[0];
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

  const isNativeToken = (address: string) => getAddress(address) === NATIVE_TOKEN.value.address;
  const getMinSendAmount = (tokenAddress: string) => {
    const chainId = BigNumber.from(currentChain.value?.chainId).toNumber();
    // Polygon
    if (chainId === 137) {
      if (isNativeToken(tokenAddress)) return 1.0;
      else return 3; // stablecoin token minimum
    }
    // Mainnet, Rinkeby, and other networks have higher ETH and stablecoin minimums due to higher fees
    if (isNativeToken(tokenAddress)) return 0.01;
    else return 100; // stablecoin token minimum
  };

  function isValidTokenAmount(val: string | undefined) {
    if (val === undefined) return true; // don't show error on empty field
    if (!val || !(Number(val) > 0)) return 'Please enter an amount';
    if (!token.value) return 'Please select a token';

    const { address: tokenAddress, decimals } = token.value;
    const minAmt = getMinSendAmount(tokenAddress);
    if (Number(val) < minAmt && isNativeToken(tokenAddress)) return `Please send at least ${minAmt} ${NATIVE_TOKEN.value.symbol}`; // prettier-ignore
    if (Number(val) < minAmt && !isNativeToken(tokenAddress)) return `Please send at least ${minAmt} ${token.value.symbol}`; // prettier-ignore

    const amount = parseUnits(val, decimals);
    if (!balances.value[tokenAddress]) return true; // balance hasn't loaded yet, so return without erroring
    if (amount.gt(balances.value[tokenAddress])) return 'Amount exceeds wallet balance';
    return true;
  }

  // Send funds
  async function onFormSubmit() {
    try {
      // Form validation
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error('Please complete the form');
      if (!signer.value) throw new Error('Wallet not connected');
      if (!umbra.value) throw new Error('Umbra instance not configured');

      // Verify the recipient ID is valid. (This throws if public keys could not be found. This check is also
      // done in the Umbra class `send` method, but we do it here to throw before the user pays for a token approval.
      // This should usually be caught by the isValidId rule anyway, but is here again as a safety check)
      const ethersProvider = provider.value as Provider;
      await umbraUtils.lookupRecipient(recipientId.value, ethersProvider, { advanced: shouldUseNormalPubKey.value });

      // Ensure user has enough balance. We re-fetch token balances in case amounts changed since wallet was connected.
      // This does not account for gas fees, but this gets us close enough and we delegate that to the wallet
      await getTokenBalances();
      const { address: tokenAddress, decimals } = token.value;
      const tokenAmount = parseUnits(humanAmount.value, decimals);
      if (tokenAddress === NATIVE_TOKEN.value.address) {
        // Sending the native token, so check that user has balance of: amount being sent + toll
        const requiredAmount = tokenAmount.add(toll.value);
        if (requiredAmount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');
      } else {
        // Sending other tokens, so we need to check both separately
        const nativeTokenErrorMsg = `${NATIVE_TOKEN.value.symbol} required for Umbra fee exceeds wallet balance`;
        if (toll.value.gt(balances.value[NATIVE_TOKEN.value.address])) throw new Error(nativeTokenErrorMsg);
        if (tokenAmount.gt(balances.value[tokenAddress])) throw new Error('Amount exceeds wallet balance');
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
    currentChain,
    formatNumber: (x: number) => parseFloat(x.toFixed(4)), // rounds to 4 decimals, then shows minimum number of digits
    humanAmount,
    humanToll,
    isSending,
    isValidForm,
    isValidId,
    isValidRecipientId,
    isValidTokenAmount,
    NATIVE_TOKEN,
    onFormSubmit,
    recipientId,
    sendFormRef,
    token,
    tokenOptions,
    toll,
    useNormalPubKey,
    userAddress,
  };
}

export default defineComponent({
  name: 'PageSend',
  components: { BaseTooltip, ConnectWallet },
  setup() {
    const isMaintenanceMode = Number(process.env.MAINTENANCE_MODE_SEND) === 1;
    return { generatePaymentLink, ...useSendForm(), isMaintenanceMode };
  },
});
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
