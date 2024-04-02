<template>
  <div>
    <!-- Modal to show when warning user of bad privacy hygiene -->
    <!--
      We don't need @show="setIsInWithdrawFlow(true)" because that's set immediately after clicking the
      withdraw button and therefore is already true by the time this modal opens
    -->
    <q-dialog v-model="showWithdrawLossModal" @hide="setIsInWithdrawFlow(false)">
      <account-receive-table-loss-warning @acknowledged="confirmWithdraw" class="q-pa-lg" />
    </q-dialog>
    <q-dialog v-model="showPrivacyModal" @hide="setIsInWithdrawFlow(false)">
      <account-receive-table-warning
        @acknowledged="confirmWithdraw"
        :destinationAddress="destinationAddress"
        :warnings="privacyModalAddressWarnings"
        class="q-pa-lg"
      />
    </q-dialog>

    <!-- Modal to show confirmation of withdraw -->
    <q-dialog v-model="showConfirmationModal" @show="setIsInWithdrawFlow(true)" @hide="setIsInWithdrawFlow(false)">
      <account-receive-table-withdraw-confirmation
        class="q-pa-lg"
        @cancel="showConfirmationModal = false"
        @confirmed="executeWithdraw"
        :activeAnnouncement="activeAnnouncement"
        :activeFee="activeFee"
        :chainId="chainId"
        :destinationAddress="destinationAddress"
        :isWithdrawInProgress="isWithdrawInProgress"
        :txHash="txHashIfEth"
      />
    </q-dialog>

    <!-- Received funds table -->
    <div>
      <div
        v-if="!isAccountSetup"
        class="dark-toggle text-center text-bold q-pa-md q-mb-lg"
        style="border-radius: 15px"
        :style="isDark ? 'color: #FFFAEB; background-color: #7C5E10' : 'color: #513C06; background-color: #FCEFC7'"
      >
        {{ $t('AccountReceiveTable.configure-umbra') }}<br />
        <i18n-t keypath="AccountReceiveTable.navigate-to-setup" tag="span">
          <router-link class="hyperlink" :to="{ name: 'setup' }">{{ $t('AccountReceiveTable.setup') }}</router-link>
        </i18n-t>
      </div>
      <div
        v-else-if="keysMatch === false"
        class="dark-toggle text-center text-bold q-pa-md q-mb-lg"
        style="border-radius: 15px"
        :style="isDark ? 'color: #FFEEEE; background-color: #780A0A' : 'color: #610404; background-color: #FACDCD'"
      >
        <i18n-t keypath="AccountReceiveTable.keys-dont-match" tag="span">
          <router-link class="hyperlink" :to="{ name: 'setup' }">{{ $t('AccountReceiveTable.setup') }}</router-link>
        </i18n-t>
        <router-link class="hyperlink" :to="{ name: 'FAQ', hash: '#account-setup' }">{{
          $t('AccountReceiveTable.learn-more')
        }}</router-link
        >.
      </div>

      <div v-if="scanStatus === 'complete'" class="text-caption q-mb-sm">
        <!-- Show the most recent timestamp and block that were scanned -->
        {{ $t('AccountReceiveTable.most-recent-announcement') }}
        {{ mostRecentAnnouncementBlockNumber }} /
        {{ formatDate(mostRecentAnnouncementTimestamp * 1000) }}
        {{ formatTime(mostRecentAnnouncementTimestamp * 1000) }}
        <div v-if="advancedMode" class="text-caption q-mb-sm">
          {{ $t('AccountReceiveTable.most-recent-mined') }}
          {{ mostRecentBlockNumber }} /
          {{ formatDate(mostRecentBlockTimestamp * 1000) }}
          {{ formatTime(mostRecentBlockTimestamp * 1000) }}
        </div>
        <div v-if="advancedMode" class="text-caption q-mb-sm">
          <!-- This scanDescriptionString describes scan settings that were used -->
          {{ scanDescriptionString }}.
          <span @click="context.emit('reset')" class="cursor-pointer hyperlink">{{
            $t('AccountReceiveTable.scan-settings')
          }}</span
          >.
        </div>
      </div>

      <q-table
        :grid="$q.screen.xs"
        card-container-class="col q-col-gutter-md"
        :columns="mainTableColumns"
        :rows="formattedAnnouncements"
        :binary-state-sort="true"
        v-model:expanded="expanded"
        :no-data-label="$t('AccountReceiveTable.account-empty')"
        :pagination="paginationConfig"
        row-key="randomNumber"
        :title="$t('AccountReceiveTable.received-funds')"
      >
        <!-- Card Layout for grid option -->
        <template v-slot:item="props">
          <div :key="props.row.id" class="col-12">
            <q-card class="card-border cursor-pointer q-pt-md col justify-center items-center">
              <q-card-section class="row justify-center items-center">
                <img
                  class="q-mr-md"
                  :src="getTokenLogoUri(props.row.token, tokens)"
                  style="width: 1.2rem"
                  v-if="getTokenInfo(props.row.token)"
                />
                <div class="text-primary text-h6 header-black q-pb-none">
                  {{ formatAmount(props.row.amount, props.row.token, tokens) }}
                  {{ getTokenSymbol(props.row.token, tokens) }}
                </div>
              </q-card-section>
              <q-card-section>
                <div class="row justify-between items-center">
                  <div>{{ $t('AccountReceiveTable.sender') }}</div>
                  <div @click="copyAddress(props.row.from, provider, 'Sender')" class="cursor-pointer copy-icon-parent">
                    <span>{{
                      props.row.formattedFrom
                        ? formatNameOrAddress(props.row.formattedFrom)
                        : formatNameOrAddress(props.row.from)
                    }}</span>
                    <loading-spinner v-if="isLoading" size="1em" customClass="q-ml-sm" />
                    <q-icon v-else color="primary" class="q-ml-sm" name="far fa-copy" />
                  </div>
                </div>
                <div class="row justify-between items-center">
                  <div>
                    <span class="q-mr-xs">{{ $t('AccountReceiveTable.stealth-receiver') }}</span>
                    <base-tooltip icon="fas fa-question-circle">
                      <span>
                        {{ receiverTooltipText }}
                      </span>
                      <router-link
                        active-class="text-bold"
                        class="hyperlink dark-toggle"
                        :to="{ path: 'faq', hash: '#receiving-funds' }"
                      >
                        {{ $t('AccountReceiveTable.learn-more') }}
                      </router-link>
                    </base-tooltip>
                  </div>
                  <div
                    @click="copyAddress(props.row.receiver, provider, 'Receiver')"
                    class="cursor-pointer copy-icon-parent"
                  >
                    <span>{{ formatNameOrAddress(props.row.receiver) }}</span>
                    <q-icon color="primary" class="q-ml-sm" name="far fa-copy" />
                  </div>
                </div>
                <div class="row justify-between items-center text-caption text-grey">
                  <div>{{ $t('AccountReceiveTable.received') }}</div>
                  <div>
                    {{ formatDate(props.row.timestamp * 1000) }}
                    {{ formatTime(props.row.timestamp * 1000) }}
                  </div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-actions class="row justify-center items-center">
                <div
                  v-if="props.row.isWithdrawn"
                  class="text-positive"
                  :class="{ 'cursor-pointer': advancedMode }"
                  @click="
                    hidePrivateKey();
                    if (advancedMode) expanded = expanded[0] === props.key ? [] : [props.key];
                  "
                >
                  {{ $t('AccountReceiveTable.withdrawn') }}<q-icon name="fas fa-check" class="q-ml-sm" />
                </div>
                <base-button
                  v-else
                  @click="
                    hidePrivateKey();
                    getFeeEstimate(props.row.token); // kickoff process in background
                    expanded = expanded[0] === props.key ? [] : [props.key];
                  "
                  color="primary"
                  :dense="true"
                  :isLoading="isLoading"
                  :disable="isWithdrawInProgress"
                  :flat="true"
                  :label="props.expand ? $t('AccountReceiveTable.hide') : $t('AccountReceiveTable.withdraw')"
                />
              </q-card-actions>
              <q-slide-transition>
                <div v-show="props.expand">
                  <withdraw-form
                    @initializeWithdraw="initializeWithdraw(props.row)"
                    @togglePrivateKey="togglePrivateKey(props.row)"
                    @copyPrivateKey="copyPrivateKey(spendingPrivateKey)"
                    @updateDestinationAddress="onUpdateDestinationAddress"
                    :destinationAddress="destinationAddress"
                    :isWithdrawn="props.row.isWithdrawn"
                    :isWithdrawInProgress="isWithdrawInProgress"
                    :isFeeLoading="isFeeLoading"
                    :isNativeToken="isNativeToken(props.row.token)"
                    :spendingPrivateKey="spendingPrivateKey"
                    :activeFee="activeFee"
                    :advancedMode="advancedMode"
                  />
                </div>
              </q-slide-transition>
            </q-card>
          </div>
        </template>

        <!-- Header labels -->
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.label }}

              <!-- Question mark with tooltip for receiver column -->
              <base-tooltip v-if="col.name === 'receiver'" icon="fas fa-question-circle">
                <span>
                  {{ receiverTooltipText }}
                </span>
                <router-link
                  active-class="text-bold"
                  class="hyperlink dark-toggle"
                  :to="{ path: 'faq', hash: '#receiving-funds' }"
                >
                  {{ $t('AccountReceiveTable.learn-more') }}
                </router-link>
              </base-tooltip>
            </q-th>
            <q-th auto-width />
          </q-tr>
        </template>

        <!-- Body row configuration -->
        <template v-slot:body="props">
          <q-tr :props="props" :key="props.row.id">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <!-- Date column -->
              <div v-if="col.name === 'date'" class="d-inline-block">
                <div
                  @click="openInEtherscan(props.row)"
                  class="row justify-start items-center cursor-pointer external-link-icon-parent"
                >
                  <div class="col-auto">
                    <div>{{ formatDate(col.value * 1000) }}</div>
                    <div class="text-caption text-grey">{{ formatTime(col.value * 1000) }}</div>
                  </div>
                  <q-icon class="external-link-icon" name="fas fa-external-link-alt" right />
                </div>
              </div>

              <!-- Amount column -->
              <div v-else-if="col.name === 'amount'">
                <div class="row justify-start items-center no-wrap">
                  <img
                    class="col-auto q-mr-md"
                    :src="getTokenLogoUri(props.row.token, tokens)"
                    style="width: 1.2rem"
                    v-if="getTokenInfo(props.row.token)"
                  />
                  <div class="col-auto">
                    {{ formatAmount(col.value, props.row.token, tokens) }}
                    {{ getTokenSymbol(props.row.token, tokens) }}
                  </div>
                </div>
              </div>

              <!-- Sender column -->
              <div v-else-if="col.name === 'from'" class="d-inline-block">
                <div @click="copyAddress(props.row.from, provider, 'Sender')" class="cursor-pointer copy-icon-parent">
                  <span>{{
                    props.row.formattedFrom
                      ? formatNameOrAddress(props.row.formattedFrom)
                      : formatNameOrAddress(props.row.from)
                  }}</span>
                  <loading-spinner v-if="isLoading" size="1em" customClass="q-ml-sm" />
                  <q-icon v-else class="copy-icon" name="far fa-copy" right />
                </div>
              </div>

              <!-- Receiver column -->
              <div v-else-if="col.name === 'receiver'" class="d-inline-block">
                <div
                  @click="copyAddress(props.row.receiver, provider, 'Receiver')"
                  class="cursor-pointer copy-icon-parent"
                >
                  <span>{{ formatNameOrAddress(col.value) }}</span>
                  <q-icon class="copy-icon" name="far fa-copy" right />
                </div>
              </div>

              <!-- Default -->
              <div v-else>{{ col.value }}</div>
            </q-td>

            <!-- Expansion button, works accordion-style -->
            <!--
            The click modifier is a bit clunky because it touches state in two independent composition functions,
             so we explain the two things it does here:
              1. First it calls hidePrivateKey(), which is an advancedMode only feature to show your private key.
                 We call this to make sure a private key is never shown when initially expanding a row
              2. For tokens (but not ETH/native token of the network), we get the fee estimate to withdraw the token
              3. If the new row key is the same as the value of the value of expanded[0], we clicked the currently
                 expanded row and therefore set `expanded = []` to hide the row. Otherwise we update the `expanded`
                 array so it's only element is the key of the new row. This enables showing/hiding of rows and ensures
                 only one row is every expanded at a time
          -->
            <q-td auto-width>
              <div
                v-if="props.row.isWithdrawn"
                class="text-positive"
                :class="{ 'cursor-pointer': advancedMode }"
                @click="
                  hidePrivateKey();
                  if (advancedMode) expanded = expanded[0] === props.key ? [] : [props.key];
                "
              >
                <div v-if="isNativeToken(props.row.token)" class="cursor-pointer external-link-icon-parent">
                  <a :href="getSenderOrReceiverEtherscanUrl(props.row.receiver)" class="text-positive" target="_blank">
                    {{ $t('AccountReceiveTable.withdrawn') }}</a
                  >
                  <q-icon name="fas fa-check" class="q-ml-sm" right />
                  <q-icon class="external-link-icon" name="fas fa-external-link-alt" right />
                </div>
                <div v-else>
                  {{ $t('AccountReceiveTable.withdrawn') }}
                  <q-icon name="fas fa-check" class="q-ml-sm" right />
                </div>
              </div>
              <div v-else>
                <base-button
                  @click="
                    hidePrivateKey();
                    getFeeEstimate(props.row.token); // kickoff process in background
                    expanded = expanded[0] === props.key ? [] : [props.key];
                  "
                  color="primary"
                  :dense="true"
                  :loading="isLoading"
                  :disable="isWithdrawInProgress"
                  :flat="true"
                  :label="props.expand ? $t('AccountReceiveTable.hide') : $t('AccountReceiveTable.withdraw')"
                />
              </div>
            </q-td>
          </q-tr>

          <!-- Expansion row -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-muted">
              <withdraw-form
                @initializeWithdraw="initializeWithdraw(props.row)"
                @togglePrivateKey="togglePrivateKey(props.row)"
                @copyPrivateKey="copyPrivateKey(spendingPrivateKey)"
                @updateDestinationAddress="onUpdateDestinationAddress"
                :destinationAddress="destinationAddress"
                :isWithdrawn="props.row.isWithdrawn"
                :isWithdrawInProgress="isWithdrawInProgress"
                :isFeeLoading="isFeeLoading"
                :isNativeToken="isNativeToken(props.row.token)"
                :spendingPrivateKey="spendingPrivateKey"
                :activeFee="activeFee"
                :advancedMode="advancedMode"
              />
            </q-td>
          </q-tr>
        </template>
      </q-table>

      <div
        v-if="scanStatus === 'complete' && (keysMatch || (advancedMode && isCustomPrivateKey))"
        class="text-caption text-right q-mt-md"
        style="opacity: 0.5"
      >
        <q-icon name="fas fa-check" class="text-positive q-mr-sm" /> {{ $t('AccountReceiveTable.scanning-complete') }}
      </div>
      <div v-else-if="scanStatus === 'scanning'" class="text-caption text-right q-mt-md" style="opacity: 0.5">
        <progress-indicator customClass="q-mr-sm" :percentage="scanPercentage" size="2em" />
        {{ $t('Receive.scanning') }}
      </div>
      <div v-else-if="scanStatus === 'fetching'" class="text-caption text-right q-mt-md" style="opacity: 0.5">
        <loading-spinner size="1.5rem" customClass="q-mr-sm" />
        <span class="text-caption text-right q-mt-md">{{ $t('Receive.fetching') }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, watch, PropType, ref, watchEffect, Ref } from 'vue';
import { copyToClipboard } from 'quasar';
import { BigNumber, Contract, joinSignature, formatUnits, TransactionResponse, Web3Provider } from 'src/utils/ethers';
import { Umbra, UserAnnouncement, KeyPair, utils } from '@umbracash/umbra-js';
import { tc } from 'src/boot/i18n';
import useSettingsStore from 'src/store/settings';
import useStatusesStore from 'src/store/statuses';
import useWalletStore from 'src/store/wallet';
import { txNotify, notifyUser } from 'src/utils/alerts';
import AccountReceiveTableWarning from 'components/AccountReceiveTableWarning.vue';
import AccountReceiveTableLossWarning from 'components/AccountReceiveTableLossWarning.vue';
import AccountReceiveTableWithdrawConfirmation from 'components/AccountReceiveTableWithdrawConfirmation.vue';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import WithdrawForm from 'components/WithdrawForm.vue';
import { FeeEstimateResponse } from 'components/models';
import { formatNameOrAddress, lookupOrReturnAddresses, toAddress, isAddressSafe } from 'src/utils/address';
import { MAINNET_PROVIDER, MULTICALL_ABI, MULTICALL_ADDRESS } from 'src/utils/constants';
import {
  getEtherscanUrl,
  isToken,
  formatDate,
  formatAmount,
  formatTime,
  getTokenSymbol,
  getTokenLogoUri,
  copyAddress,
} from 'src/utils/utils';

function useAdvancedFeatures(spendingKeyPair: KeyPair) {
  const { startBlock, endBlock, scanPrivateKey } = useSettingsStore();
  const spendingPrivateKey = ref<string>(); // used for hiding/showing private key in UI, so not a computed property

  // Generate string that explains scan settings that were used
  const scanDescriptionString = computed(() => {
    const suffix = scanPrivateKey.value ? tc('AccountReceiveTable.custom-prv-key') : '';
    const hasStartBlock = Number(startBlock.value) >= 0;
    const hasEndBlock = Number(endBlock.value) >= 0;
    let msg = `${tc('AccountReceiveTable.scanned-from-block')} ${Number(startBlock.value)} ${tc(
      'AccountReceiveTable.to'
    )} ${Number(endBlock.value)}`; // default message

    if (!hasStartBlock && !hasEndBlock) msg = `${tc('AccountReceiveTable.all-blocks-scanned')}`;
    if (!hasStartBlock && hasEndBlock)
      msg = `${tc('AccountReceiveTable.scanned-all-blocks-up-to')} ${Number(endBlock.value)}`;
    if (hasStartBlock && !hasEndBlock)
      msg = `${tc('AccountReceiveTable.scanned-from-block')} ${Number(startBlock.value)} ${tc(
        'AccountReceiveTable.to-current-block'
      )}`;
    return `${msg}${suffix}`;
  });

  // For advanced mode: compute the stealth private key for a given random number
  const computePrivateKey = (randomNumber: string) => String(spendingKeyPair.mulPrivateKey(randomNumber).privateKeyHex);

  // For advanced mode: toggles visibility of the stealth private key
  const togglePrivateKey = (announcement: UserAnnouncement) => {
    spendingPrivateKey.value = spendingPrivateKey.value ? undefined : computePrivateKey(announcement.randomNumber);
  };

  // For advanced mode: hides the stealth private key after it's shown
  const hidePrivateKey = () => (spendingPrivateKey.value = undefined);

  // For advanced mode: copies the provided stealth private key to the clipboard
  const copyPrivateKey = async (privateKey: string) => {
    await copyToClipboard(privateKey);
    notifyUser('success', tc('AccountReceiveTable.private-key-copied'));
    hidePrivateKey();
  };

  return { scanDescriptionString, hidePrivateKey, togglePrivateKey, spendingPrivateKey, copyPrivateKey };
}

interface ReceiveTableAnnouncement extends UserAnnouncement {
  formattedFrom: string;
}

function useReceivedFundsTable(userAnnouncements: Ref<UserAnnouncement[]>, spendingKeyPair: KeyPair) {
  const { NATIVE_TOKEN, network, provider, signer, umbra, userAddress, relayer, tokens } = useWalletStore();
  const { setIsInWithdrawFlow } = useStatusesStore();
  const paginationConfig = { rowsPerPage: 25 };
  const expanded = ref<string[]>([]); // for managing expansion rows
  const showPrivacyModal = ref(false);
  const showConfirmationModal = ref(false);
  const showWithdrawLossModal = ref(false);
  const privacyModalAddressWarnings = ref<string[]>([]);
  const destinationAddress = ref('');
  const activeAnnouncement = ref<UserAnnouncement>();
  const activeFee = ref<FeeEstimateResponse>(); // null if native token
  // UI status variables
  const isLoading = ref(false);
  const isFeeLoading = ref(false);
  const isWithdrawInProgress = ref(false);
  const txHashIfEth = ref(''); // if withdrawing native token, show the transaction hash (if token, we have a relayer tx ID)

  // Define table columns
  const toString = (val: BigNumber) => val.toString();

  const mainTableColumns = [
    {
      align: 'left',
      field: 'timestamp',
      label: tc('AccountReceiveTable.date-received'),
      name: 'date',
      sortable: true,
    },
    {
      align: 'left',
      field: 'amount',
      label: tc('AccountReceiveTable.amount'),
      name: 'amount',
      sortable: true,
      format: toString,
      sort: (a: BigNumber, b: BigNumber, rowA: { token: string }, rowB: { token: string }) => {
        const tokenA = tokens.value.find((token) => {
          return token.address === rowA.token;
        });
        const tokenB = tokens.value.find((token) => {
          return token.address === rowB.token;
        });
        return parseFloat(formatUnits(a, tokenA?.decimals)) - parseFloat(formatUnits(b, tokenB?.decimals));
      },
    },
    {
      align: 'left',
      field: 'from',
      label: tc('AccountReceiveTable.sender'),
      name: 'from',
      sortable: true,
    },
    {
      align: 'left',
      field: 'receiver',
      label: tc('AccountReceiveTable.stealth-receiver'),
      name: 'receiver',
      sortable: false,
    },
  ];

  // Relayer helper method
  const getFeeEstimate = async (tokenAddress: string) => {
    if (isNativeToken(tokenAddress)) {
      // no fee for native token
      activeFee.value = { umbraApiVersion: { major: 0, minor: 0, patch: 0 }, fee: '0', token: NATIVE_TOKEN.value };
      return;
    }
    isFeeLoading.value = true;
    activeFee.value = await relayer.value?.getFeeEstimate(tokenAddress);
    isFeeLoading.value = false;
  };

  // Table formatters and helpers
  const isNativeToken = (tokenAddress: string) => tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const getTokenInfo = (tokenAddress: string) => tokens.value.filter((token) => token.address === tokenAddress)[0];

  // Format announcements so from addresses support ENS/CNS, and so we can easily detect withdrawals
  const formattedAnnouncements = ref([] as ReceiveTableAnnouncement[]);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watchEffect(async () => {
    if (userAnnouncements.value.length === 0) formattedAnnouncements.value = [];
    isLoading.value = true;
    const announcements = userAnnouncements.value as ReceiveTableAnnouncement[];
    const newAnnouncements = announcements.filter((x) => !formattedAnnouncements.value.includes(x));
    formattedAnnouncements.value = [...formattedAnnouncements.value, ...newAnnouncements];
    // Format addresses to use ENS, CNS, or formatted address
    const fromAddresses = announcements.map((announcement) => announcement.from);
    let formattedAddresses: string[] = [];
    try {
      formattedAddresses = await lookupOrReturnAddresses(fromAddresses, MAINNET_PROVIDER as Web3Provider);
    } catch (err) {
      console.error(err);
    }
    formattedAnnouncements.value.forEach((announcement, index) => {
      if (newAnnouncements.some((newAnnouncement) => newAnnouncement.txHash === announcement.txHash)) {
        announcement.formattedFrom = formattedAddresses[index];
        announcement.from = fromAddresses[index];
      }
    });

    // Find announcements that have been withdrawn
    const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider.value);
    const stealthBalanceCalls = announcements.map((a) => {
      if (isNativeToken(a.token)) {
        return {
          target: MULTICALL_ADDRESS,
          allowFailure: true,
          callData: multicall.interface.encodeFunctionData('getEthBalance', [a.receiver]),
        };
      }
      return {
        target: umbra.value?.umbraContract.address,
        allowFailure: true,
        callData: umbra.value?.umbraContract.interface.encodeFunctionData('tokenPayments', [a.receiver, a.token]),
      };
    });
    type Response = { success: boolean; returnData: string };
    const stealthBalanceResponses: Response[] = await multicall.callStatic.aggregate3(stealthBalanceCalls);
    const stealthBalances = stealthBalanceResponses.map((r) => BigNumber.from(r.returnData));

    formattedAnnouncements.value.forEach((announcement, index) => {
      if (newAnnouncements.some((newAnnouncement) => newAnnouncement.txHash === announcement.txHash))
        announcement.isWithdrawn = stealthBalances[index].lt(announcement.amount);
    });
    isLoading.value = false;
  });

  /**
   * @notice Opens the transaction in etherscan
   */
  function openInEtherscan(row: UserAnnouncement) {
    if (!provider.value) throw new Error(tc('AccountReceiveTable.wallet-not-connected'));
    // Assume mainnet if we don't have a provider with a valid chainId
    const chainId = provider.value.network.chainId || 1;
    window.open(getEtherscanUrl(row.txHash, chainId));
  }

  function getSenderOrReceiverEtherscanUrl(address: string) {
    if (!provider.value) throw new Error(tc('AccountReceiveTable.wallet-not-connected'));
    // Assume mainnet if we don't have a provider with a valid chainId
    const chainId = provider.value.network.chainId || 1;
    return getEtherscanUrl(address, chainId);
  }

  function onUpdateDestinationAddress(addr: string) {
    destinationAddress.value = addr;
  }

  /**
   * @notice Initialize the withdraw process
   * @param announcement Announcement to withdraw
   */
  async function initializeWithdraw(announcement: UserAnnouncement) {
    if (!provider.value) throw new Error(tc('AccountReceiveTable.wallet-not-connected'));
    if (!userAddress.value) throw new Error(tc('AccountReceiveTable.wallet-not-connected'));

    activeAnnouncement.value = announcement;

    try {
      // Check if withdrawal destination is safe
      const { safe, reasons } = await isAddressSafe(
        destinationAddress.value,
        userAddress.value,
        announcement.receiver,
        announcement.from,
        provider.value
      );
      // Check if destination is an ERC-20 or ERC-721 token
      // one of these addresses will cause a loss of funds vs privacy like in isAddressSafe
      const desIsToken = await isToken(destinationAddress.value, provider.value);

      if (desIsToken) {
        showWithdrawLossModal.value = true;
      } else if (safe) {
        showConfirmationModal.value = true;
      } else {
        showPrivacyModal.value = true;
        privacyModalAddressWarnings.value = reasons;
      }
    } catch (err: unknown) {
      setIsInWithdrawFlow(false);
      console.warn(err);
      throw new Error(<string>err);
    }
  }

  /**
   * @notice Show withdraw confirmation modal
   * @param announcement Announcement to withdraw
   */
  function confirmWithdraw() {
    showPrivacyModal.value = false;
    showConfirmationModal.value = true;
    showWithdrawLossModal.value = false;
  }

  type ExecuteWithdrawalOptions = {
    gasPrice?: BigNumber; // fee in wei
  };

  /**
   * @notice Executes the withdraw process
   */
  async function executeWithdraw(options: ExecuteWithdrawalOptions) {
    if (!umbra.value) throw new Error(tc('AccountReceiveTable.umbra-instance-not-found'));
    if (!provider.value) throw new Error(tc('AccountReceiveTable.provider-not-found'));
    if (!activeAnnouncement.value) throw new Error(tc('AccountReceiveTable.no-announcement-selected'));
    showPrivacyModal.value = false;

    // Get token info, stealth private key, and destination (acceptor) address
    const announcement = activeAnnouncement.value;
    const token = getTokenInfo(announcement.token);
    const stealthKeyPair = spendingKeyPair.mulPrivateKey(announcement.randomNumber);
    const spendingPrivateKey = stealthKeyPair.privateKeyHex as string;
    const acceptor = await toAddress(destinationAddress.value, provider.value);
    await utils.assertSupportedAddress(acceptor);

    // Send transaction
    try {
      isWithdrawInProgress.value = true;
      let tx: TransactionResponse;
      if (token.symbol === NATIVE_TOKEN.value.symbol) {
        const { gasPrice } = options;
        tx = await umbra.value.withdraw(spendingPrivateKey, token.address, acceptor, { gasPrice });
        txHashIfEth.value = tx.hash;
        void txNotify(tx.hash, provider.value);
        await tx.wait();
      } else {
        // Withdrawing token
        if (!signer.value || !provider.value) throw new Error(tc('AccountReceiveTable.signer-or-provider-not-found'));
        if (!activeFee.value || !('fee' in activeFee.value)) throw new Error(tc('AccountReceiveTable.fee-not-set'));
        const chainId = network.value?.chainId;
        if (!chainId) throw new Error(`${tc('AccountReceiveTable.invalid-chain-id')} ${String(chainId)}`);

        // Get users signature
        const sponsor = '0xb4435399AB53D6136C9AEEBb77a0120620b117F9'; // TODO update this
        const fee = activeFee.value.fee;
        const umbraAddress = umbra.value.umbraContract.address;
        const signature = joinSignature(
          await Umbra.signWithdraw(spendingPrivateKey, chainId, umbraAddress, acceptor, token.address, sponsor, fee)
        );

        // Relay transaction
        const withdrawalInputs = { stealthAddr: stealthKeyPair.address, acceptor, signature, sponsorFee: fee };
        const { relayTransactionHash } = (await relayer.value?.relayWithdraw(token.address, withdrawalInputs)) as {
          relayTransactionHash: string;
        };

        // This is a regular transaction hash, though it's possible OZ Defender will replace it to ensure it gets
        // included quickly, in which case the frontend would not automatically reflect when the relay was successful.
        // Because we relay with the "fast" setting, this is unlikely to be the case.
        window.logger.info(`Relayed with transaction hash ${relayTransactionHash}`);
        const receipt = await provider.value.waitForTransaction(relayTransactionHash);
        window.logger.info('Withdraw successful. Receipt:', receipt);
      }

      // Send complete, cleanup state
      txHashIfEth.value = ''; // no transaction hash to show anymore
      destinationAddress.value = ''; // clear destination address
      expanded.value = []; // hides expanded row
      formattedAnnouncements.value.forEach((x) => {
        if (announcement.receiver === x.receiver) {
          x.isWithdrawn = true; // update receive table to indicate this was withdrawn
        }
      });
    } finally {
      isWithdrawInProgress.value = false;
      showConfirmationModal.value = false;
      activeAnnouncement.value = undefined;
      setIsInWithdrawFlow(false);
    }
  }

  return {
    activeAnnouncement,
    activeFee,
    chainId: network.value?.chainId,
    confirmWithdraw,
    copyAddress,
    destinationAddress,
    executeWithdraw,
    expanded,
    formatAmount,
    formatDate,
    formatNameOrAddress,
    formattedAnnouncements,
    formatTime,
    formatUnits,
    getFeeEstimate,
    getSenderOrReceiverEtherscanUrl,
    getTokenInfo,
    getTokenLogoUri,
    getTokenSymbol,
    initializeWithdraw,
    isFeeLoading,
    isLoading,
    isNativeToken,
    isWithdrawInProgress,
    mainTableColumns,
    onUpdateDestinationAddress,
    openInEtherscan,
    umbra,
    paginationConfig,
    privacyModalAddressWarnings,
    provider,
    showConfirmationModal,
    showPrivacyModal,
    showWithdrawLossModal,
    txHashIfEth,
    tokens,
  };
}

export default defineComponent({
  name: 'AccountReceiveTable',
  components: {
    AccountReceiveTableWarning,
    AccountReceiveTableLossWarning,
    AccountReceiveTableWithdrawConfirmation,
    BaseTooltip,
    WithdrawForm,
  },
  props: {
    announcements: {
      type: undefined as unknown as PropType<UserAnnouncement[]>,
      required: true,
    },
    scanPercentage: {
      type: Number,
      required: true,
    },
    scanStatus: {
      type: String,
      required: true,
    },
    mostRecentAnnouncementBlockNumber: {
      type: Number,
      required: true,
    },
    mostRecentAnnouncementTimestamp: {
      type: Number,
      required: true,
    },
    mostRecentBlockNumber: {
      type: Number,
      required: true,
    },
    mostRecentBlockTimestamp: {
      type: Number,
      required: true,
    },
  },

  setup(props, context) {
    const { advancedMode, isDark, scanPrivateKey } = useSettingsStore();
    const { setIsInWithdrawFlow } = useStatusesStore();
    const userAnnouncements = ref<UserAnnouncement[]>(props.announcements);
    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const { isAccountSetup, keysMatch, spendingKeyPair: spendingKeyPairFromSig } = useWalletStore();
    const spendingKeyPair = computed(() => {
      if (advancedMode.value && scanPrivateKey.value) return new KeyPair(scanPrivateKey.value);
      return spendingKeyPairFromSig.value as KeyPair;
    });
    const receiverTooltipText = tc('AccountReceiveTable.receiver-tool-tip');

    watch(
      () => props.announcements,
      (announcements, preAnnouncements) => {
        const newAnnouncements = announcements.filter((x) => !preAnnouncements.includes(x));
        userAnnouncements.value = [...userAnnouncements.value, ...newAnnouncements];
      }
    );

    return {
      advancedMode,
      context,
      receiverTooltipText,
      isAccountSetup,
      isDark,
      isCustomPrivateKey: scanPrivateKey.value?.length,
      keysMatch,
      userAnnouncements,
      setIsInWithdrawFlow,
      ...useAdvancedFeatures(spendingKeyPair.value),
      ...useReceivedFundsTable(userAnnouncements, spendingKeyPair.value),
    };
  },
});
</script>

<style lang="sass" scoped>
.border
  border-bottom: 1px solid rgba(0,0,0, 0.2)

.copy-icon-parent:hover .copy-icon
  color: $primary

.copy-icon
  color: transparent

.external-link-icon-parent:hover .external-link-icon
  color: $primary

.external-link-icon
  color: transparent
</style>
