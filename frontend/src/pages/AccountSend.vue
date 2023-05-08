<template>
  <q-page v-if="isMaintenanceMode" padding>
    <div
      class="dark-toggle form-max-wide text-center text-bold q-pa-md"
      style="border-radius: 15px"
      :style="isDark ? 'color: #FFEEEE; background-color: #780A0A' : 'color: #610404; background-color: #FACDCD'"
    >
      {{ $t('Send.sending-disabled') }}
    </div>
  </q-page>

  <q-page v-else padding>
    <q-dialog v-model="showAdvancedWarning">
      <q-card class="row justify-center q-my-none q-py-none border-top-thick">
        <q-card-section>
          <h5 class="text-bold text-center q-mt-none">
            <q-icon name="fas fa-exclamation-triangle" color="warning" left />{{ $t('Utils.Dialog.warning') }}
          </h5>
        </q-card-section>
        <q-card-section class="q-pb-lg">
          <div class="row items-center text">
            <span class="q-pa-sm">
              {{ $t('Send.advanced-send-warning') }}
              <router-link
                class="hyperlink"
                to="/faq#how-do-i-send-funds-to-a-user-by-their-address-or-public-key"
                target="_blank"
              >
                {{ $t('Send.learn-more') }}
              </router-link>
            </span>
          </div>
          <q-checkbox v-model="advancedAcknowledged">
            {{ $t('Send.acknowledge-risks') }}
          </q-checkbox>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="showAdvancedSendWarning">
      <q-card class="row justify-center q-my-none q-py-none border-top-thick">
        <q-card-section>
          <h5 class="text-bold text-center q-mt-none">
            <q-icon name="fas fa-exclamation-triangle" color="warning" left />{{ $t('Utils.Dialog.warning') }}
          </h5>
        </q-card-section>
        <q-card-section class="q-pb-sm">
          <div class="row items-center text">
            <span class="q-pa-sm">
              {{ $t('Send.advanced-send-warning') }}
              <router-link
                class="hyperlink"
                to="/faq#how-do-i-send-funds-to-a-user-by-their-address-or-public-key"
                target="_blank"
              >
                {{ $t('Send.learn-more') }}
              </router-link>
            </span>
            <q-checkbox v-model="acknowledgeSendRisk">
              {{ $t('Send.acknowledge-risks') }}
            </q-checkbox>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="row justify-evenly">
            <base-button
              type="submit"
              @click="onFormSubmit()"
              :disable="!isValidForm || isSending || !acknowledgeSendRisk"
              :full-width="true"
              :label="$t('Send.send')"
              :loading="isSending"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <h2 class="page-title">{{ $t('Send.send') }}</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">{{ $t('Send.connect-your-wallet') }}</p>
      <div class="row justify-center">
        <connect-wallet :to="connectRedirectTo" :params="paymentLinkParams">
          <base-button class="text-center" :label="$t('Send.connect-wallet')" />
        </connect-wallet>
      </div>
    </div>

    <!-- Send form -->
    <q-form v-else @submit="onFormSubmit" class="form" ref="sendFormRef">
      <!-- Identifier -->
      <div>{{ $t('Send.recipient') }}</div>
      <base-input
        v-model="recipientId"
        :debounce="500"
        :disable="isSending"
        placeholder="vitalik.eth"
        lazy-rules
        :rules="isValidId"
        ref="recipientIdBaseInputRef"
      />

      <!-- Identifier, advanced mode tooltip -->
      <div
        v-if="advancedMode"
        class="row items-center text-caption q-pt-sm q-pb-lg"
        :style="!recipientId || isValidRecipientId ? 'margin-top:-2em' : ''"
      >
        <q-checkbox v-model="useNormalPubKey" class="col-auto" dense>
          {{ $t('Send.recipient-pkey') }}
        </q-checkbox>
        <base-tooltip class="col-auto q-ml-sm" icon="fas fa-question-circle">
          <span>
            {{ $t('Send.question-circle') }}
            <span class="text-bold">
              {{ $t('Send.question-circle-warning') }}
              <router-link
                class="dark-toggle hyperlink"
                :to="{ name: 'FAQ', hash: '#how-do-i-send-funds-to-a-user-by-their-address-or-public-key' }"
              >
                {{ $t('Send.learn-more') }}
              </router-link>
            </span>
          </span>
        </base-tooltip>
      </div>

      <!-- Token -->
      <div>{{ $t('Send.select-token') }}</div>
      <base-select
        v-model="token"
        :disable="isSending"
        filled
        :label="$t('Send.token')"
        :options="tokenList"
        option-label="symbol"
        ref="tokenBaseSelectRef"
        :token-balances="balances"
      />

      <!-- Amount -->
      <div>
        {{ $t('Send.amount') }}
      </div>
      <base-input
        v-model="humanAmount"
        :disable="isSending"
        placeholder="0"
        :appendButtonDisable="!recipientId || !isValidRecipientId"
        :appendButtonLabel="$t('Send.max')"
        @click="setHumanAmountMax"
        @input="() => (sendMax = false)"
        lazy-rules
        :rules="isValidTokenAmount"
        ref="humanAmountBaseInputRef"
      />

      <!-- Toll + summary details -->
      <div v-if="toll && toll.gt(0) && humanAmount && token">
        <div class="text-bold">{{ $t('Send.summary') }}</div>

        <q-markup-table class="q-mb-lg" dense flat separator="none" style="background-color: rgba(0, 0, 0, 0)">
          <tbody>
            <!-- What user is sending -->
            <tr>
              <td class="min text-left" style="padding: 0 2rem 0 0">{{ $t('Send.sending') }}</td>
              <td class="min text-right">{{ humanAmount }}</td>
              <td class="min text-left">{{ token.symbol }}</td>
              <td class="min text-left"><img :src="token.logoURI" height="15rem" /></td>
              <td><!-- Fills space --></td>
            </tr>
            <!-- Toll -->
            <tr>
              <td class="min text-left" style="padding: 0 2rem 0 0">
                {{ $t('Send.fee') }}
                <base-tooltip class="col-auto q-ml-xs" icon="fas fa-question-circle">
                  <span>
                    {{ $t('Send.fee-explain', { chainName: currentChain.chainName }) }}
                    <router-link
                      class="dark-toggle hyperlink"
                      :to="{ name: 'FAQ', hash: '#why-is-there-sometimes-an-umbra-fee' }"
                    >
                      {{ $t('Send.learn-more') }}
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
              <td class="min text-left text-bold" style="padding: 0 2rem 0 0">{{ $t('Send.total') }}</td>
              <td class="min text-right">{{ humanTotalAmount }}</td>
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
          v-if="sendAdvancedButton"
          :disable="!isValidForm || isSending"
          :full-width="true"
          :label="$t('Send.send')"
          :loading="isSending"
          @click="showAdvancedSendWarning = true"
        />
        <base-button
          v-if="!sendAdvancedButton"
          :disable="!isValidForm || isSending"
          :full-width="true"
          :label="$t('Send.send')"
          :loading="isSending"
          type="submit"
        />
        <base-button
          @click="generatePaymentLink({ to: recipientId, token, amount: humanAmount, chainId: chainId })"
          :disable="isSending"
          :flat="true"
          :full-width="true"
          icon="far fa-copy"
          :label="$t('Send.copy-payment-link')"
        />
        <router-link :class="{ 'no-text-decoration': true, 'dark-toggle': true }" :to="{ name: 'sent' }">
          <div class="row items-center justify-center q-pa-xs link-container">
            {{ $t('Send.send-history') }}
          </div>
        </router-link>
      </div>
    </q-form>
  </q-page>
</template>

<script lang="ts">
// --- External imports ---
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { QForm, QInput, QSelect } from 'quasar';
import { RandomNumber, utils as umbraUtils } from '@umbracash/umbra-js';
// --- Components ---
import BaseInput from 'components/BaseInput.vue';
import BaseSelect from 'components/BaseSelect.vue';
import BaseTooltip from 'components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
// --- Store ---
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
// --- Other ---
import { tc } from 'src/boot/i18n';
import { txNotify } from 'src/utils/alerts';
import {
  BigNumber,
  Contract,
  formatUnits,
  getAddress,
  hexValue,
  MaxUint256,
  parseUnits,
  TransactionResponse,
  Zero,
} from 'src/utils/ethers';
import { humanizeTokenAmount, humanizeMinSendAmount, humanizeArithmeticResult } from 'src/utils/utils';
import { generatePaymentLink, parsePaymentLink } from 'src/utils/payment-links';
import { Provider, TokenInfoExtended, supportedChains } from 'components/models';
import { ERC20_ABI } from 'src/utils/constants';
import { toAddress } from 'src/utils/address';
import { storeSend } from 'src/utils/account-send';

function useSendForm() {
  const { advancedMode } = useSettingsStore();
  const {
    balances,
    chainId,
    currentChain,
    getPrivateKeys,
    getTokenBalances,
    isLoading,
    NATIVE_TOKEN,
    provider,
    setNetwork,
    signer,
    tokens: tokenList,
    umbra,
    userAddress,
    viewingKeyPair,
  } = useWalletStore();

  // Helpers
  const sendFormRef = ref<QForm>();
  const isSending = ref(false);
  const advancedAcknowledged = ref(false);
  const showAdvancedSendWarning = ref(false);
  const acknowledgeSendRisk = ref(false);

  // Form refs for triggering validation via form items' `validate()` method.
  const recipientIdBaseInputRef = ref<InstanceType<typeof BaseInput> | null>(null);
  const tokenBaseSelectRef = ref<InstanceType<typeof BaseSelect> | null>(null);
  const humanAmountBaseInputRef = ref<InstanceType<typeof BaseInput> | null>(null);

  // Form parameters.
  const recipientId = ref<string>();
  const useNormalPubKey = ref(false);
  const token = ref<TokenInfoExtended | null>();
  const humanAmount = ref<string>();
  const isValidForm = ref(false);
  const isValidRecipientId = ref(true); // for showing/hiding bottom space (error message div) under input field
  const toll = ref<BigNumber>(Zero);
  const sendMax = ref(false);
  const paymentLinkParams = ref(window.location.search);
  const attemptedNetworkChange = ref(false);
  const connectRedirectTo = ref('send');

  // Computed form parameters.
  const showAdvancedWarning = computed(() => advancedAcknowledged.value === false && useNormalPubKey.value === true);
  const sendAdvancedButton = computed(() => useNormalPubKey.value && advancedMode.value);
  const shouldUseNormalPubKey = computed(() => advancedMode.value && useNormalPubKey.value); // only use normal public key if advanced mode is on
  const humanToll = computed(() => humanizeTokenAmount(toll.value, NATIVE_TOKEN.value));
  const humanTotalAmount = computed(() => {
    if (typeof humanAmount.value !== 'string') return '--'; // appease TS
    if (isNaN(Number(humanAmount.value))) return '--';
    const sendAmount = parseUnits(humanAmount.value, NATIVE_TOKEN.value.decimals);
    const totalAmount = sendAmount.add(toll.value);

    return humanizeArithmeticResult(
      totalAmount,
      [humanAmount.value, humanToll.value], // subtotal and fee
      NATIVE_TOKEN.value
    );
  });

  watch(
    // We watch `shouldUseNormalPubKey` to ensure the "Address 0x123 has not registered stealth keys" validation
    // message is hidden if the user checks the block after entering an address. We do this by checking if the
    // checkbox toggle was changed, and if so re-validating the form. The rest of this watcher is for handling
    // async validation rules
    [isLoading, shouldUseNormalPubKey, recipientId, token, humanAmount, NATIVE_TOKEN],
    async (
      [isLoadingValue, useNormalPubKey, recipientIdValue, tokenValue, humanAmountValue, nativeTokenValue],
      [
        prevIsLoadingValue,
        prevUseNormalPubKey,
        prevRecipientIdValue,
        _prevTokenValue,
        prevHumanAmountValue,
        prevNativeTokenValue,
      ]
    ) => {
      _prevTokenValue; // Silence unused var warning.

      // Fetch toll.
      umbra.value?.umbraContract
        .toll()
        .then((tollValue) => {
          toll.value = tollValue;
        })
        .catch((e) => {
          throw new Error(`Error fetching toll: ${JSON.stringify(e)}`);
        });

      // Reset acknowledgement if user changes the public key type.
      if (!useNormalPubKey) {
        advancedAcknowledged.value = false;
      }

      // Switch off the sendMax flag and clear value if we change tokens.
      if (tokenValue !== (_prevTokenValue || prevNativeTokenValue) && sendMax.value) {
        sendMax.value = false;
        humanAmount.value = '0.0';
      }

      // Perform minimal required validation based on what changed.
      if (useNormalPubKey !== prevUseNormalPubKey || recipientIdValue !== prevRecipientIdValue) {
        const recipientIdInputRef = recipientIdBaseInputRef.value?.$refs.QInput as QInput;
        isValidRecipientId.value = await recipientIdInputRef?.validate();
      } else if (humanAmountValue !== prevHumanAmountValue && tokenValue && humanAmountValue) {
        const tokenInputRef = tokenBaseSelectRef.value?.$refs.QSelect as QSelect;
        await tokenInputRef?.validate();
      } else if (nativeTokenValue.chainId !== prevNativeTokenValue.chainId || isLoadingValue !== prevIsLoadingValue) {
        // When network finally connects after page load, we need to re-parse the payment link data.
        await setPaymentLinkData(); // Handles validations.
      }

      const validAmount = Boolean(humanAmountValue) && isValidTokenAmount(humanAmountValue as string) === true;
      isValidForm.value = isValidRecipientId.value && Boolean(tokenValue) && validAmount;
    }
  );

  onMounted(async () => {
    await setPaymentLinkData();
  });

  async function setPaymentLinkData() {
    const { to, token: paymentToken, amount, chainId: linkChainId } = await parsePaymentLink(NATIVE_TOKEN.value);
    if (to) recipientId.value = to;
    if (amount) humanAmount.value = amount;

    // For token, we always default to the chain's native token if none was selected
    if (paymentToken?.symbol) token.value = paymentToken;
    else token.value = tokenList.value[0];

    // Validate the form
    await sendFormRef.value?.validate();

    // Switch chain
    if (linkChainId) {
      const chain = supportedChains.filter((chain) => chain.chainId === hexValue(BigNumber.from(linkChainId)));

      if (
        chain.length === 1 &&
        !isLoading.value &&
        chainId.value !== Number(linkChainId) &&
        !attemptedNetworkChange.value &&
        userAddress.value
      ) {
        attemptedNetworkChange.value = true;
        await setNetwork(chain[0]);
      }
    }
  }

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
    } catch (e: unknown) {
      const toSentenceCase = (str: string) => str[0].toUpperCase() + str.slice(1);
      if (e instanceof Error && e.message) return toSentenceCase(e.message);
      if ((e as { reason: string }).reason) return toSentenceCase((e as { reason: string }).reason);
      return JSON.stringify(e);
    }
  }

  const isNativeToken = (address: string) => getAddress(address) === NATIVE_TOKEN.value.address;

  const getMinSendAmount = (tokenAddress: string): number => {
    const tokenInfo = tokenList.value.filter((token) => token.address === tokenAddress)[0];

    // This can happen when parsing a payment link and the token list has not loaded yet. In that
    // case, we just return a very high number so the user can't send anything.
    if (!tokenInfo) return Number.POSITIVE_INFINITY;

    const tokenMinSendInWei = parseUnits(tokenInfo.minSendAmount, 'wei');
    // We don't need to worry about fallbacks: native tokens have hardcoded fallbacks
    // defined in the wallet store. For any other tokens, we wouldn't have info about them
    // unless we got it from the relayer, which includes minSend amounts for all tokens.
    const minSend = Number(formatUnits(tokenMinSendInWei, tokenInfo.decimals));
    return humanizeMinSendAmount(minSend);
  };

  function isValidTokenAmount(val: string | undefined) {
    if (val === undefined) return true; // don't show error on empty field
    if (!val || !(Number(val) > 0)) return tc('Send.enter-an-amount');
    if (!token.value) return tc('Send.select-a-token');

    const { address: tokenAddress, decimals } = token.value;
    const minAmt = getMinSendAmount(tokenAddress);
    if (Number(val) < minAmt && isNativeToken(tokenAddress)) return `${tc('Send.send-at-least')} ${minAmt} ${NATIVE_TOKEN.value.symbol}`; // prettier-ignore
    if (Number(val) < minAmt && !isNativeToken(tokenAddress)) return `${tc('Send.send-at-least')} ${minAmt} ${token.value.symbol}`; // prettier-ignore

    const amount = parseUnits(val, decimals);
    if (!balances.value[tokenAddress]) return true; // balance hasn't loaded yet, so return without erroring
    if (amount.gt(balances.value[tokenAddress])) return `${tc('Send.amount-exceeds-balance')}`;
    return true;
  }

  // Send funds
  async function onFormSubmit() {
    try {
      // Form validation
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error(tc('Send.please-complete-form'));
      if (!signer.value) throw new Error(tc('Send.wallet-not-connected'));
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

      const currentBalance = balances.value[tokenAddress];
      const sendingNativeToken = tokenAddress === NATIVE_TOKEN.value.address;
      let sendMaxGasPrice; // Used if sendMax is true.
      let sendMaxGasLimit; // Used if sendMax is true.
      let tokenAmount = parseUnits(humanAmount.value, decimals);
      // Refresh the tokenAmount if the sendMax flag is set.
      if (sendMax.value) {
        if (sendingNativeToken) {
          const [_toAddress, _estimatedNativeSendGasLimit] = await Promise.all([
            toAddress(recipientId.value, provider.value!),
            estimateNativeSendGasLimit(),
          ]);
          // Get current balance less gas costs.
          const {
            gasPrice: _sendMaxGasPrice,
            gasLimit: _sendMaxGasLimit,
            ethToSend: balanceLessGasCosts,
          } = await umbraUtils.getEthSweepGasInfo(userAddress.value!, _toAddress, provider.value!, {
            // We override the gasLimit here because we are sending to an
            // address that has never been seen before, which increases gas
            // costs and is not accounted for by getEthSweepGasInfo.
            gasLimit: _estimatedNativeSendGasLimit,
          });
          sendMaxGasPrice = _sendMaxGasPrice;
          sendMaxGasLimit = _sendMaxGasLimit;
          tokenAmount = balanceLessGasCosts.sub(toll.value);
        } else {
          tokenAmount = currentBalance;
        }
      }

      if (tokenAddress === NATIVE_TOKEN.value.address) {
        // Throw if the tokenAmount differs from humanAmount.value by too much.
        const expectedAmount = parseUnits(humanAmount.value, decimals);
        // Only 2% downward slippage is tolerated. Any more and we throw.
        if (tokenAmount.mul('100').div(expectedAmount).lt('98')) {
          throw new Error(`${tc('Send.slippage-exceeded')}`);
        }

        // Sending the native token, so check that user has balance of: amount being sent + toll
        const requiredAmount = tokenAmount.add(toll.value);
        if (requiredAmount.gt(currentBalance)) {
          throw new Error(`${tc('Send.amount-exceeds-balance')}`);
        }
      } else {
        // Sending other tokens, so we need to check both separately
        const nativeTokenErrorMsg = `${NATIVE_TOKEN.value.symbol} ${tc('Send.umbra-fee-exceeds-balance')}`;
        if (toll.value.gt(balances.value[NATIVE_TOKEN.value.address])) throw new Error(nativeTokenErrorMsg);
        if (tokenAmount.gt(currentBalance)) throw new Error(tc('Send.amount-exceeds-balance'));
      }

      // If token, get approval when required
      isSending.value = true;
      if (token.value.symbol !== NATIVE_TOKEN.value.symbol) {
        // Check allowance
        const tokenContract = new Contract(token.value.address, ERC20_ABI, signer.value);
        const umbraAddress = umbra.value.umbraContract.address;
        const allowance = <BigNumber>await tokenContract.allowance(userAddress.value, umbraAddress);
        // If insufficient allowance, get approval
        if (tokenAmount.gt(allowance)) {
          const approveTx = <TransactionResponse>await tokenContract.approve(umbraAddress, MaxUint256);
          void txNotify(approveTx.hash, ethersProvider);
          await approveTx.wait();
        }
      }
      if (!viewingKeyPair.value?.privateKeyHex) {
        await getPrivateKeys();
      }

      // Send with Umbra
      const { tx } = await umbra.value.send(signer.value, tokenAddress, tokenAmount, recipientId.value, {
        advanced: shouldUseNormalPubKey.value,
        // When attempting to sendMax, we override the gasPrice to use the price
        // from the sweepETH function that estimated the tokenAmount. That function
        // calculates the tokenAmount based on a low (but reasonable) estimate of
        // the gasPrice. Wallets are configured to choose a high-probability
        // gasPrice for new transactions -- which is to say: a fairly high gasPrice.
        // So if we don't specify the gasPrice here, the wallet will almost
        // certainly choose a higher gasPrice. And since:
        //   token amount = (account balance) - (expected gas costs)
        // when the wallet increases gas costs on us, we end up in a situation where:
        //   account balance < (token amount) + (wallet-chosen gas costs)
        // So the wallet will reject the transaction on grounds that the account
        // doesn't have enough funds.
        gasPrice: sendMax.value && sendingNativeToken ? sendMaxGasPrice : undefined,
        gasLimit: sendMax.value && sendingNativeToken ? sendMaxGasLimit : undefined,
      });
      void txNotify(tx.hash, ethersProvider);
      // The values in this if statement should exist. We have this check to appease the type checker and handle regressions.
      if (viewingKeyPair.value?.privateKeyHex && userAddress.value && provider.value) {
        const publicKeys = await umbraUtils.lookupRecipient(recipientId.value, provider.value, {
          advanced: shouldUseNormalPubKey.value,
        });
        await storeSend({
          chainId: chainId.value!,
          viewingPrivateKey: viewingKeyPair.value?.privateKeyHex,
          provider: provider.value,
          accountDataToEncrypt: {
            recipientAddress: recipientId.value,
            advancedMode: advancedMode.value,
            usePublicKeyChecked: advancedAcknowledged.value,
            pubKey: publicKeys.spendingPublicKey,
          },
          unencryptedAccountSendData: {
            amount: tokenAmount.toString(),
            tokenAddress,
            txHash: tx.hash,
            senderAddress: userAddress.value,
          },
        });
      }
      await tx.wait();
      resetForm();
    } finally {
      isSending.value = false;
      showAdvancedSendWarning.value = false;
    }
  }

  function resetForm() {
    recipientId.value = undefined;
    token.value = undefined;
    humanAmount.value = undefined;
    sendFormRef.value?.resetValidation();
  }

  async function setHumanAmountMax() {
    if (!token.value?.address) throw new Error(tc('Send.select-a-token'));
    if (!recipientId.value) throw new Error(tc('Send.enter-a-recipient'));

    sendMax.value = true;

    if (NATIVE_TOKEN.value?.address === token.value?.address) {
      if (!userAddress.value || !provider.value) throw new Error(tc('Send.wallet-not-connected'));
      const fromAddress = userAddress.value;
      const recipientAddress = await toAddress(recipientId.value, provider.value);
      const { ethToSend } = await umbraUtils.getEthSweepGasInfo(fromAddress, recipientAddress, provider.value, {
        // We override the gasLimit here because we are sending to an
        // address that has never been seen before, which increases gas
        // costs and is not accounted for by getEthSweepGasInfo.
        gasLimit: await estimateNativeSendGasLimit(),
      });
      const sendAmount = ethToSend.sub(toll.value);
      if (sendAmount.lt('0')) throw new Error(tc('Send.max-native-less-than-toll'));
      humanAmount.value = formatUnits(sendAmount, token.value.decimals);
    } else {
      const tokenBalance = balances.value[token.value.address];
      humanAmount.value = formatUnits(tokenBalance.toString(), token.value.decimals);
    }
  }

  // Get an accurate estimate of the amount of gas needed to perform a native send.
  async function estimateNativeSendGasLimit() {
    return await umbra.value!.umbraContract.estimateGas.sendEth(
      // We will be sending to an address that has never been seen before which substantially
      // increases gas costs on some networks (e.g. by 25k on mainnet). To ensure this cost is
      // included in our gas limit estimate, we estimate using a `to` address that is randomly
      // generated (and thus likely to have never been seen before).
      new RandomNumber().asHex.replace(/0/g, 'f').replace(/^./, '0').slice(0, 42),
      // The toll needs to be correct, otherwise the tx would revert.
      toll.value,
      // Fake values just to get a reasonable estimate.
      new RandomNumber().asHex.replace(/0/g, 'f').replace(/^./, '0'), // pubKeyXCoordinate
      new RandomNumber().asHex.replace(/0/g, 'f').replace(/^./, '0'), // ciphertext
      // Value doesn't matter, it just needs to be more than the toll else the tx would revert.
      { value: toll.value.add('1') }
    );
  }

  return {
    acknowledgeSendRisk,
    advancedAcknowledged,
    advancedMode,
    balances,
    connectRedirectTo,
    chainId,
    currentChain,
    humanAmount,
    humanAmountBaseInputRef,
    humanToll,
    humanTotalAmount,
    isSending,
    isValidForm,
    isValidId,
    isValidRecipientId,
    isValidTokenAmount,
    NATIVE_TOKEN,
    onFormSubmit,
    paymentLinkParams,
    recipientId,
    recipientIdBaseInputRef,
    sendAdvancedButton,
    sendFormRef,
    sendMax,
    setHumanAmountMax,
    showAdvancedSendWarning,
    showAdvancedWarning,
    token,
    tokenBaseSelectRef,
    tokenList,
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

.link-container
  color: $primary

.link-container:hover
  background: rgba($primary, 0.15)
</style>
