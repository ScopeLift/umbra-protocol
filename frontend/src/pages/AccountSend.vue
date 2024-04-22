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
    <h2 class="send-page-title">{{ $t('Send.send') }}</h2>

    <q-tabs
      v-model="tab"
      dense
      :class="['text-grey', $q.screen.xs ? '' : 'batch-send-tabs']"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
      v-if="batchSendIsSupported"
    >
      <q-tab name="send" :disable="isSending" :label="$t('Send.single-send')" @click="handleTabClick()" />
      <q-tab name="batch-send" :disable="isSending" :label="$t('Send.batch-send')" @click="handleTabClick()" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <!-- Send Page -->
      <q-tab-panel name="send" :style="isDark ? 'background-color: #121212' : ''">
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
            :lazy-rules="false"
            :hideBottomSpace="true"
            :rules="(value: string) => isValidId(value, undefined)"
            ref="recipientIdBaseInputRef"
          />
          <div class="flex row text-caption warning-container q-pb-sm" v-if="recipientIdWarning">
            {{ recipientIdWarning }}
          </div>

          <!-- Identifier, advanced mode tooltip -->
          <div v-if="advancedMode" class="row items-center text-caption q-pt-sm">
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
          <div class="q-pt-sm">{{ $t('Send.select-token') }}</div>
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
                        {{ $t('Send.fee-explain', { chainName: currentChain?.chainName }) }}
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
              :disable="!isValidForm || isSending || showAdvancedSendWarning"
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
              iconMargin="q-mx-sm"
              :label="$t('Send.copy-payment-link')"
            />
            <router-link :class="{ 'no-text-decoration': true, 'dark-toggle': true }" :to="{ name: 'sent' }">
              <div class="row items-center justify-center q-pa-xs link-container">
                {{ $t('Send.send-history') }}
              </div>
            </router-link>
          </div>
        </q-form>
      </q-tab-panel>
      <!-- Batch Send Page -->
      <q-tab-panel name="batch-send" :style="isDark ? 'background-color: #121212' : ''">
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
          <!-- User has not connected wallet  -->
          <div v-if="!userAddress">
            <p class="text-center">{{ $t('Send.connect-your-wallet') }}</p>
            <div class="row justify-center">
              <connect-wallet :to="connectRedirectTo">
                <base-button class="text-center" :label="$t('Send.connect-wallet')" />
              </connect-wallet>
            </div>
          </div>

          <q-form v-else @submit="onBatchSendFormSubmit">
            <!-- Mobile Card Layout -->

            <div v-if="$q.screen.xs">
              <div v-for="(Send, index) in batchSends" :key="index" class="col-12 batch-send-card">
                <q-card class="cursor-pointer q-pt-md col justify-center items-center">
                  <q-card-section class="row justify-center items-center">
                    <div class="text-primary text-h6 header-black q-pb-none">
                      {{ $t('Send.send') }} #{{ index + 1 }}
                    </div>
                    <base-button
                      v-show="index !== 0"
                      @click="isSending ? null : removeField(Send.id)"
                      :disable="isSending"
                      :flat="true"
                      label=""
                      icon="fas fa-times"
                    />
                  </q-card-section>
                  <q-card-section>
                    <div>{{ $t('Send.recipient') }}</div>
                    <base-input
                      v-model="Send.receiver"
                      :debounce="500"
                      :disable="isSending"
                      placeholder="vitalik.eth"
                      :lazy-rules="false"
                      :rules="(value: string) => isValidId(value, index)"
                    />
                    <div class="text-caption warning-container" v-if="batchSends[index].warning">
                      <br /><br />
                      {{ batchSends[index].warning }}
                    </div>
                    <div
                      class="text-caption warning-container"
                      v-if="batchSends[index].validationError && !batchSends[index].warning"
                    >
                      <br /><br />
                    </div>
                    <!-- Token -->
                    <div>{{ $t('Send.select-token') }}</div>

                    <base-select
                      v-model="Send.token"
                      :disable="isSending"
                      filled
                      :options="tokenList"
                      option-label="symbol"
                      ref="tokenBaseSelectRef"
                      :token-balances="balances"
                      lazy-rules
                    />
                    <!-- Amount -->
                    <div>
                      {{ $t('Send.amount') }}
                    </div>
                    <base-input
                      v-model="Send.amount"
                      :disable="isSending"
                      placeholder="0"
                      :appendButtonDisable="!Send.receiver || !isValidRecipientId"
                      lazy-rules
                      :rules="(value: string) => isValidBatchSendAmount(value, Send.token)"
                      ref="humanAmountBaseInputRef"
                    />
                  </q-card-section>
                  <q-separator />
                </q-card>
              </div>
            </div>

            <!-- Desktop Layout -->
            <q-form v-else style="display: flex; flex-direction: column">
              <div v-for="(Send, index) in batchSends" :key="index">
                <!-- Identifier -->
                <div class="batch-send">
                  <p class="batch-send-label text-grey">{{ index + 1 }}</p>
                  <div class="input-container-address">
                    <base-input
                      v-model="Send.receiver"
                      :debounce="500"
                      :disable="isSending"
                      placeholder="vitalik.eth"
                      :label="$t('Send.receiver-addr-ens')"
                      :lazy-rules="false"
                      :rules="(value: string) => isValidId(value, index)"
                    />
                  </div>

                  <!-- Token -->
                  <base-select
                    v-model="Send.token"
                    :disable="isSending"
                    filled
                    :label="$t('Send.token')"
                    :options="tokenList"
                    option-label="symbol"
                    ref="tokenBaseSelectRef"
                    :token-balances="balances"
                    class="input-container-token"
                  />

                  <!-- Amount -->
                  <base-input
                    v-model="Send.amount"
                    :disable="isSending"
                    placeholder="0"
                    :appendButtonDisable="!Send.receiver || !isValidRecipientId"
                    lazy-rules
                    :label="$t('Send.amount')"
                    :rules="(value: string) => isValidBatchSendAmount(value, Send.token)"
                    ref="humanAmountBaseInputRef"
                    class="input-container-amount"
                  />
                  <base-button
                    v-bind:style="{
                      visibility: index !== 0 ? 'visible' : 'hidden',
                    }"
                    @click="isSending ? null : removeField(Send.id)"
                    class="batch-send-label"
                    :disable="isSending"
                    :flat="true"
                    label=""
                    icon="fas fa-times"
                  />
                </div>
                <div class="batch-send" v-if="batchSends[index].validationError">
                  <div><br /></div>
                </div>
                <div v-for="n in numberOfErrorOrWarningBreaksNeeded" :key="n">
                  <br v-if="batchSends[index].validationError" />
                </div>
                <div class="batch-send" v-if="batchSends[index].warning">
                  <div class="text-caption batch-send-warning-container">
                    {{ batchSends[index].warning }}
                  </div>
                  <p class="input-container-token"></p>
                  <p class="input-container-token"></p>
                </div>
              </div>
            </q-form>
            <!-- Toll + summary details -->
            <div v-if="batchSends[0]?.amount" class="batch-send-buttons">
              <div class="text-bold">{{ $t('Send.summary') }}</div>
              <br />

              <q-markup-table class="q-mb-lg" dense flat separator="none" style="background-color: rgba(0, 0, 0, 0)">
                <tbody>
                  <!-- What user is sending -->
                  <tr>
                    <td class="min text-left" style="padding: 0 2rem 0 0">{{ $t('Send.sending') }}</td>
                    <td class="min text-right">{{ sendingString }}</td>
                  </tr>
                  <!-- Toll -->
                  <tr>
                    <td class="min text-right" style="padding: 0 2rem 0 0">
                      {{ $t('Send.fee') }}
                      <base-tooltip class="col-auto q-ml-xs" icon="fas fa-question-circle">
                        <span>
                          {{ $t('Send.fee-explain', { chainName: currentChain?.chainName }) }}
                          <router-link
                            class="dark-toggle hyperlink"
                            :to="{ name: 'FAQ', hash: '#why-is-there-sometimes-an-umbra-fee' }"
                          >
                            {{ $t('Send.learn-more') }}
                          </router-link>
                        </span>
                      </base-tooltip>
                    </td>
                    <span>
                      <td class="min text-right">{{ batchSendHumanToll }} {{ NATIVE_TOKEN.symbol }}</td>
                    </span>
                  </tr>
                  <!-- Summary -->
                  <tr>
                    <td class="min text-left text-bold" style="padding: 0 2rem 0 0">{{ $t('Send.total') }}</td>
                    <td class="min text-bold text-right">{{ summaryTotalString }}</td>
                  </tr>
                </tbody>
              </q-markup-table>
            </div>
            <!-- Send button -->
            <div class="batch-send-buttons">
              <base-button
                class="button-container"
                :label="$t('Send.send')"
                :loading="isSending"
                type="submit"
                :disable="batchSends.length == 1 || isSending || !isValidBatchSendForm"
              />
              <base-button
                @click="isSending ? null : addFields(batchSends)"
                :disable="isSending"
                :flat="true"
                :label="$t('Send.add-send')"
              />
              <div>
                <router-link :class="{ 'no-text-decoration': true, 'dark-toggle': true }" :to="{ name: 'sent' }">
                  <div class="row items-center justify-center q-pa-sm link-container rounded-borders">
                    {{ $t('Send.send-history') }}
                  </div>
                </router-link>
              </div>
            </div>
          </q-form>
        </q-page>
      </q-tab-panel>
    </q-tab-panels>
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
import { SendBatch } from '@umbracash/umbra-js';
import { Provider, TokenInfoExtended, supportedChains } from 'components/models';
import { ERC20_ABI } from 'src/utils/constants';
import { toAddress } from 'src/utils/address';
import { storeSend, StoreSendArgs } from 'src/utils/account-send';
import { assertValidEnsName } from 'src/utils/validation';

interface BatchSendData {
  id: number;
  receiver: string | undefined;
  token: TokenInfoExtended | null | undefined;
  amount: string;
  warning: string;
  validationError: boolean;
}

function useSendForm() {
  const { advancedMode, isDark, sendHistorySave } = useSettingsStore();
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
  const recipientIdWarning = ref<string>();
  const useNormalPubKey = ref(false);
  const token = ref<TokenInfoExtended>();
  const humanAmount = ref<string>();
  const isValidForm = ref(false);
  const isValidBatchSendForm = ref(false);
  const isValidRecipientId = ref(true); // for showing/hiding bottom space (error message div) under input field
  const toll = ref<BigNumber>(Zero);
  const sendMax = ref(false);
  const paymentLinkParams = ref(window.location.search);
  const attemptedNetworkChange = ref(false);
  const connectRedirectTo = ref('send');

  // Batch Send Form Parameters
  const batchSends = ref<BatchSendData[]>([]);
  const tab = ref('send');
  const previousTabChecked = ref('send');
  const batchSendSupportedChains = [1, 10, 100, 137, 8453, 42161, 11155111];
  const batchSendIsSupported = ref(false);
  const numberOfErrorOrWarningBreaksNeeded = ref(0);

  // Computed form parameters.
  const showAdvancedWarning = computed(() => advancedAcknowledged.value === false && useNormalPubKey.value === true);
  const sendAdvancedButton = computed(() => useNormalPubKey.value && advancedMode.value);
  const shouldUseNormalPubKey = computed(() => advancedMode.value && useNormalPubKey.value); // only use normal public key if advanced mode is on
  const humanToll = computed(() => humanizeTokenAmount(toll.value, NATIVE_TOKEN.value));
  const batchSendHumanToll = computed(() =>
    humanizeTokenAmount(toll.value.mul(batchSends.value.length), NATIVE_TOKEN.value)
  );

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

  // Batch Send Computed Form Parameters
  const batchSendHumanTotalAmount = computed(() => {
    let ethSendAmount;
    for (const token of summaryAmount.value.keys()) {
      if (token.symbol === NATIVE_TOKEN.value.symbol) {
        ethSendAmount = summaryAmount.value.get(token);
      }
    }
    if (!ethSendAmount) return '--';
    const sendAmount = BigNumber.from(ethSendAmount);
    const totalAmount = sendAmount.add(toll.value.mul(batchSends.value.length));

    return humanizeArithmeticResult(
      totalAmount,
      [ethSendAmount.toString(), batchSendHumanToll.value], // subtotal and fee
      NATIVE_TOKEN.value
    );
  });

  const summaryAmount = computed(() => {
    return batchSends.value.reduce((summaryMap: Map<TokenInfoExtended, BigNumber>, send: BatchSendData) => {
      if (send.token && send.amount) {
        const isValidAmount = Boolean(send.amount) && isValidTokenAmount(send.amount, send.token) === true;
        if (isValidAmount) {
          const previousAmount = summaryMap.get(send.token) || BigNumber.from(0);
          const updatedAmount = previousAmount.add(parseUnits(send.amount, send.token.decimals));
          summaryMap.set(send.token, updatedAmount);
        }
      }
      return summaryMap;
    }, new Map<TokenInfoExtended, BigNumber>());
  });

  const sendingString = computed(() => {
    let string = '';
    for (const [index, entry] of Array.from(summaryAmount.value).entries()) {
      const token = entry[0];
      const amount = humanizeTokenAmount(entry[1], token);
      string += `${amount} ${token.symbol}`;
      if (index != Array.from(summaryAmount.value).length - 1) {
        string += ' + ';
      }
    }
    return string;
  });

  const summaryTotalString = computed(() => {
    let allString = '';
    let includesNativeToken = false;
    for (const [index, entry] of Array.from(summaryAmount.value).entries()) {
      const token = entry[0];
      const amount = humanizeTokenAmount(entry[1], token);

      if (token.symbol === NATIVE_TOKEN.value.symbol) {
        allString += `${batchSendHumanTotalAmount.value} ${NATIVE_TOKEN.value.symbol}`;
        includesNativeToken = true;
      } else {
        allString += `${amount} ${token.symbol}`;
      }
      if (index != Array.from(summaryAmount.value).length - 1) {
        allString += ' + ';
      } else if (!includesNativeToken) {
        allString += ` + ${batchSendHumanToll.value} ${NATIVE_TOKEN.value.symbol}`;
      }
    }
    return allString;
  });

  watch(
    // We watch `shouldUseNormalPubKey` to ensure the "Address 0x123 has not registered stealth keys" validation
    // message is hidden if the user checks the block after entering an address. We do this by checking if the
    // checkbox toggle was changed, and if so re-validating the form. The rest of this watcher is for handling
    // async validation rules
    [isLoading, shouldUseNormalPubKey, recipientId, token, humanAmount, NATIVE_TOKEN, batchSends.value],
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
        const chainId = BigNumber.from(currentChain.value?.chainId || 0).toNumber();
        batchSendIsSupported.value = batchSendSupportedChains.includes(chainId);
        if (batchSends.value.length > 0) {
          batchSends.value[0].token = NATIVE_TOKEN.value;
          batchSends.value[1].token = NATIVE_TOKEN.value;
        }
      }

      const validAmount = Boolean(humanAmountValue) && isValidTokenAmount(humanAmountValue as string) === true;
      isValidForm.value = isValidRecipientId.value && Boolean(tokenValue) && validAmount;

      let validatedBatchSendForm = true;
      const isValidRecipientPromises: Promise<boolean | string>[] = [];
      batchSends.value.forEach((batchSend, index) => {
        if (validatedBatchSendForm) {
          const { token, amount, receiver } = batchSend;
          const isValidAmount = Boolean(amount) && isValidTokenAmount(amount, token);
          const isValidToken = Boolean(token);
          isValidRecipientPromises.push(isValidId(receiver, index));
          if (isValidAmount !== true || !receiver || !isValidToken) validatedBatchSendForm = false;
        }
      });
      if (validatedBatchSendForm) {
        await Promise.all(isValidRecipientPromises).then((results) => {
          for (const result of results) {
            if (result !== true) validatedBatchSendForm = false;
          }
        });
      }

      isValidBatchSendForm.value = validatedBatchSendForm;
    }
  );

  onMounted(async () => {
    await setPaymentLinkData();
    batchSends.value.push(
      { id: 1, receiver: '', token: NATIVE_TOKEN.value, amount: '', warning: '', validationError: false },
      { id: 2, receiver: '', token: NATIVE_TOKEN.value, amount: '', warning: '', validationError: false }
    );
    const chainId = BigNumber.from(currentChain.value?.chainId || 0).toNumber();
    batchSendIsSupported.value = batchSendSupportedChains.includes(chainId);
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

  function addFields(CurrentSends: BatchSendData[]) {
    CurrentSends.push({
      id: CurrentSends[CurrentSends.length - 1]?.id + 1 || 1,
      receiver: '',
      token: NATIVE_TOKEN.value,
      amount: '',
      warning: '',
      validationError: false,
    });
  }

  function removeField(removeId: number) {
    const index = batchSends.value.findIndex((send) => send.id === removeId);
    batchSends.value.splice(index, 1);
  }

  function calculateErrorOrWarningBreaks() {
    // Width setpoints for extra break(s) needed after error (or before warning) message on the batch send page
    // These are eeded to prevent the error message from overlapping with the warning field field,
    // as page width and layout dictate the number of error lines (and therefore) breaks needed.
    const warningWidths = [1140, 955, 790, 710, 685, 645, 630];
    numberOfErrorOrWarningBreaksNeeded.value = 0;
    for (const width of warningWidths) {
      if (window.innerWidth < width) numberOfErrorOrWarningBreaksNeeded.value += 1;
    }
  }

  function setWarning(warning: string, index: number | undefined) {
    if (index !== undefined) {
      batchSends.value[index].warning = warning;
    } else {
      recipientIdWarning.value = warning;
    }
  }

  function handleTabClick() {
    setWarning('', undefined);
    for (let i = 0; i < batchSends.value.length; i++) {
      setWarning('', i);
    }
  }

  // Validators
  async function isValidId(val: string | undefined, index: number | undefined) {
    // Check if confusable chars in string, throws with warning if so
    checkConfusables(val, index);

    // Return true if nothing is provided
    if (!val) return true;

    // Check if recipient ID is valid
    try {
      await umbraUtils.lookupRecipient(val, provider.value as Provider, {
        advanced: shouldUseNormalPubKey.value,
      });
      if (index !== undefined) {
        batchSends.value[index].validationError = false;
      }
      return true;
    } catch (e: unknown) {
      if (index !== undefined) {
        batchSends.value[index].validationError = true;
        if (batchSends.value[index].warning === '') {
          // checkConfusables didn't find a warning but we have an error, we may need breaks depending on page width
          calculateErrorOrWarningBreaks();
        }
      }
      const toSentenceCase = (str: string) => str[0].toUpperCase() + str.slice(1);
      if (e instanceof Error && e.message) {
        if (e.message.includes('Please verify the provided name or address')) {
          e.message =
            'Please verify the provided name or address is correct. ' +
            'If providing an ENS name, ensure it is registered, and has a valid address record.';
        }
        return toSentenceCase(e.message);
      }
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

  function isValidTokenAmount(val?: string, tokenInput?: TokenInfoExtended | null) {
    if (val === undefined) return true; // don't show error on empty field
    if (!val || !(Number(val) > 0)) return tc('Send.enter-an-amount');

    const tokenToUse = tokenInput || token.value;
    if (!tokenToUse) return tc('Send.select-a-token');

    const { address: tokenAddress, decimals } = tokenToUse;

    const minAmt = getMinSendAmount(tokenAddress);
    if (Number(val) < minAmt && isNativeToken(tokenAddress)) return `${tc('Send.send-at-least')} ${minAmt} ${NATIVE_TOKEN.value.symbol}`; // prettier-ignore
    else if (Number(val) < minAmt && !isNativeToken(tokenAddress)) return `${tc('Send.send-at-least')} ${minAmt} ${tokenToUse.symbol}`; // prettier-ignore

    const amount = parseUnits(val, decimals);
    if (!balances.value[tokenAddress]) return true; // balance hasn't loaded yet, so return without erroring
    if (amount.gt(balances.value[tokenAddress])) return `${tc('Send.amount-exceeds-balance')}`;
    return true;
  }

  // Gets total batch send amount for `tokenInput` and check if it exceeds the wallet balance.
  // If it doesn't, check if `val`, the single send amount field value, is valid for `tokenInput` like we do for all single sends.
  function isValidBatchSendAmount(val?: string, tokenInput?: TokenInfoExtended | null) {
    const tokenToUse = tokenInput || token.value;
    if (!tokenToUse) return tc('Send.select-a-token');

    const { address: tokenAddress } = tokenToUse;

    // Get total batch send amount for the token
    const totalBatchSendAmount = summaryAmount.value.get(tokenToUse) || BigNumber.from(0);
    if (totalBatchSendAmount.gt(balances.value[tokenAddress])) return `${tc('Send.total-amount-exceeds-balance')}`;

    return isValidTokenAmount(val, tokenInput);
  }

  // Send funds
  async function onFormSubmit() {
    try {
      // Form validation
      if (!recipientId.value || !token.value || !humanAmount.value) throw new Error(tc('Send.please-complete-form'));
      if (!signer.value) throw new Error(tc('Send.wallet-not-connected'));
      if (!umbra.value) throw new Error('Umbra instance not configured');
      showAdvancedSendWarning.value = false;

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

      isSending.value = true;
      if (!viewingKeyPair.value?.privateKeyHex) {
        await getPrivateKeys();
      }

      // If token, get approval when required
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
      if (viewingKeyPair.value?.privateKeyHex && userAddress.value && provider.value && sendHistorySave.value) {
        const publicKeys = await umbraUtils.lookupRecipient(recipientId.value, provider.value, {
          advanced: shouldUseNormalPubKey.value,
        });
        await storeSend(chainId.value!, viewingKeyPair.value?.privateKeyHex, {
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
    }
  }

  // Send funds
  async function onBatchSendFormSubmit() {
    try {
      // Form validation
      for (let i = 0; i < batchSends.value.length; i++) {
        if (!batchSends.value[i].receiver || !batchSends.value[i].token || !batchSends.value[i].amount)
          throw new Error(tc('Send.please-complete-form'));
      }
      if (!signer.value) throw new Error(tc('Send.wallet-not-connected'));
      if (!umbra.value) throw new Error('Umbra instance not configured');

      // Verify the recipient ID is valid. (This throws if public keys could not be found. This check is also
      // done in the Umbra class `send` method, but we do it here to throw before the user pays for a token approval.
      // This should usually be caught by the isValidId rule anyway, but is here again as a safety check)
      const ethersProvider = provider.value as Provider;
      await Promise.all(
        batchSends.value.map((send) => {
          return umbraUtils.lookupRecipient(send.receiver as string, ethersProvider);
        })
      );

      // Ensure user has enough balance. We re-fetch token balances in case amounts changed since wallet was connected.
      // This does not account for gas fees, but this gets us close enough and we delegate that to the wallet
      await getTokenBalances();

      // Check for balance
      for (let i = 0; i < batchSends.value.length; i++) {
        const token: TokenInfoExtended | null | undefined = batchSends.value[i].token;
        if (!token) throw new Error(tc('Send.select-a-token-for-send') + ` #${i + 1}`);

        const { address: tokenAddress, decimals } = token;
        const tokenAmount = parseUnits(batchSends.value[i].amount, decimals);

        if (tokenAddress === NATIVE_TOKEN.value.address) {
          // Sending the native token, so check that user has balance of: amount being sent + toll
          const requiredAmount = tokenAmount.add(toll.value);
          if (requiredAmount.gt(balances.value[tokenAddress])) throw new Error('amount exceeds balance');
        } else {
          // Sending other tokens, so we need to check both separately
          const nativeTokenErrorMsg = `${NATIVE_TOKEN.value.symbol} Send.umbra-fee-exceeds-balance`;
          if (toll.value.gt(balances.value[NATIVE_TOKEN.value.address])) throw new Error(nativeTokenErrorMsg);
          if (tokenAmount.gt(balances.value[tokenAddress])) throw new Error('Send.amount-exceeds-balance');
        }
        isSending.value = true;
      }

      if (!viewingKeyPair.value?.privateKeyHex) {
        await getPrivateKeys();
      }

      // Get allowances
      const promises = [];
      const batchSendAddress = umbra.value?.batchSendContract!.address;
      for (const token of summaryAmount.value.keys()) {
        if (token.symbol !== NATIVE_TOKEN.value.symbol) {
          const tokenContract = new Contract(token.address, ERC20_ABI, signer.value);
          promises.push(tokenContract.allowance(userAddress.value, batchSendAddress) as BigNumber);
        } else {
          promises.push(Promise.resolve(Zero));
        }
      }
      const allowances = await Promise.all(promises);

      // If allowances aren't enough, get approvals
      const approveTxs: TransactionResponse[] = [];
      const summaryAmountValues = Array.from(summaryAmount.value.entries());
      for (let i = 0; i < summaryAmountValues.length; i++) {
        const [token, amount] = summaryAmountValues[i];
        if (token.symbol !== NATIVE_TOKEN.value.symbol) {
          const tokenContract = new Contract(token.address, ERC20_ABI, signer.value);
          const batchSendAddress = umbra.value?.batchSendContract!.address;
          if (amount.gt(allowances[i])) {
            const approveTx: TransactionResponse = await tokenContract.approve(batchSendAddress, MaxUint256);
            void txNotify(approveTx.hash, ethersProvider);
            approveTxs.push(approveTx);
          }
        }
      }

      // Wait for all approval tx to go through
      await Promise.all(
        approveTxs.map((approveTx) => {
          return approveTx.wait();
        })
      );

      const newSends = <SendBatch[]>[];
      for (let i = 0; i < batchSends.value.length; i++) {
        const token: TokenInfoExtended | null | undefined = batchSends.value[i].token;
        if (!token) throw new Error('Send.please-complete-form');
        const { address: tokenAddress, decimals } = token;
        const tokenAmount = parseUnits(batchSends.value[i].amount, decimals);

        if (tokenAddress)
          newSends.push({ token: tokenAddress, amount: tokenAmount, address: batchSends.value[i].receiver as string });
      }

      // Send with Umbra
      const { tx } = await umbra.value.batchSend(signer.value, newSends);
      void txNotify(tx.hash, ethersProvider);
      if (viewingKeyPair.value?.privateKeyHex && userAddress.value && provider.value) {
        const batchSendDataPromises = newSends.map(async (item) => {
          const publicKey = await umbraUtils.lookupRecipient(item.address, ethersProvider, {
            advanced: false,
          });
          return {
            unencryptedAccountSendData: {
              amount: item.amount.toString(),
              tokenAddress: item.token,
              senderAddress: userAddress.value,
              txHash: tx.hash,
            },
            accountDataToEncrypt: {
              pubKey: publicKey.spendingPublicKey,
              recipientAddress: item.address,
              advancedMode: false,
              usePublicKeyChecked: false,
            },
          };
        });
        const batchSendData = await Promise.allSettled(batchSendDataPromises).then((values) => {
          const batches = [];
          for (const item of values) {
            if (item.status === 'fulfilled') {
              batches.push(item.value as StoreSendArgs);
            }
          }
          return batches;
        });

        await storeSend(chainId.value!, viewingKeyPair.value.privateKeyHex, batchSendData);
      }
      await tx.wait();
      resetBatchSendForm();
    } finally {
      isSending.value = false;
    }
  }

  function resetForm() {
    token.value = NATIVE_TOKEN.value;
    recipientId.value = undefined;
    humanAmount.value = undefined;
    sendFormRef.value?.resetValidation();
  }

  function resetBatchSendForm() {
    batchSends.value = [
      { id: 1, receiver: '', token: NATIVE_TOKEN.value, amount: '', warning: '', validationError: false },
      { id: 2, receiver: '', token: NATIVE_TOKEN.value, amount: '', warning: '', validationError: false },
    ];
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

  function checkConfusables(recipientIdString: string | undefined, index: number | undefined) {
    if (previousTabChecked.value !== tab.value) {
      previousTabChecked.value = tab.value;
      return;
    }
    try {
      if (recipientIdString && recipientIdString.endsWith('eth')) {
        assertValidEnsName(recipientIdString);
      }
      setWarning('', index); // clear warning
    } catch (e) {
      if (e instanceof Error && e.message) {
        setWarning(e.message, index);
      }
    }
  }

  return {
    acknowledgeSendRisk,
    addFields,
    advancedAcknowledged,
    advancedMode,
    balances,
    batchSendHumanToll,
    batchSendIsSupported,
    batchSendSupportedChains,
    connectRedirectTo,
    chainId,
    checkConfusables,
    currentChain,
    handleTabClick,
    humanAmount,
    humanAmountBaseInputRef,
    humanToll,
    humanTotalAmount,
    isDark,
    isSending,
    isValidBatchSendForm,
    isValidForm,
    isValidId,
    isValidRecipientId,
    isValidTokenAmount,
    isValidBatchSendAmount,
    NATIVE_TOKEN,
    numberOfErrorOrWarningBreaksNeeded,
    onFormSubmit,
    onBatchSendFormSubmit,
    paymentLinkParams,
    recipientId,
    recipientIdWarning,
    recipientIdBaseInputRef,
    removeField,
    batchSends,
    sendAdvancedButton,
    sendFormRef,
    sendingString,
    sendMax,
    setHumanAmountMax,
    setWarning,
    showAdvancedSendWarning,
    showAdvancedWarning,
    summaryAmount,
    summaryTotalString,
    tab,
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

.warning-container
  padding-left: 12px
  color: $warning
  line-height: normal
</style>
