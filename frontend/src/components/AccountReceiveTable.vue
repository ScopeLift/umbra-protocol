<template>
  <div>
    <!-- Modal to show when warning user of bad privacy hygiene -->
    <!--
      We don't need @show="setIsInWithdrawFlow(true)" because that's set immediately after clicking the
      withdraw button and therefore is already true by the time this modal opens
    -->
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

    <div v-if="isLoading" class="text-center">
      <loading-spinner />
      <div class="text-center text-italic">{{ $t('AccountReceiveTable.processing-results') }}</div>
    </div>

    <!-- Received funds table -->
    <div v-else>
      <div
        v-if="!isAccountSetup"
        class="dark-toggle text-center text-bold q-pa-md q-mb-lg"
        style="border-radius: 15px"
        :style="isDark ? 'color: #FFFAEB; background-color: #7C5E10' : 'color: #513C06; background-color: #FCEFC7'"
      >
        {{ $t('AccountReceiveTable.configure-umbra') }}<br />
        <i18n path="AccountReceiveTable.navigate-to-setup" tag="span">
          <router-link class="hyperlink" :to="{ name: 'setup' }">{{ $t('AccountReceiveTable.setup') }}</router-link>
        </i18n>
      </div>
      <div
        v-else-if="keysMatch === false"
        class="dark-toggle text-center text-bold q-pa-md q-mb-lg"
        style="border-radius: 15px"
        :style="isDark ? 'color: #FFEEEE; background-color: #780A0A' : 'color: #610404; background-color: #FACDCD'"
      >
        <i18n path="AccountReceiveTable.keys-dont-match" tag="span">
          <router-link class="hyperlink" :to="{ name: 'setup' }">{{ $t('AccountReceiveTable.setup') }}</router-link>
        </i18n>
        <router-link class="hyperlink" :to="{ name: 'FAQ', hash: '#account-setup' }">{{
          $t('AccountReceiveTable.learn-more')
        }}</router-link
        >.
      </div>

      <div v-if="advancedMode" class="text-caption q-mb-sm">
        <!-- This scanDescriptionString describes scan settings that were used -->
        {{ scanDescriptionString }}.
        <span @click="context.emit('reset')" class="cursor-pointer hyperlink">{{
          $t('AccountReceiveTable.scan-settings')
        }}</span
        >.
      </div>
      <q-table
        :grid="$q.screen.xs"
        card-container-class="col q-col-gutter-md"
        :columns="mainTableColumns"
        :data="formattedAnnouncements"
        :expanded.sync="expanded"
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
                <img class="q-mr-md" :src="getTokenLogoUri(props.row.token)" style="width: 1.2rem" />
                <div class="text-primary text-h6 header-black q-pb-none">
                  {{ formatAmount(props.row.amount, props.row.token) }} {{ getTokenSymbol(props.row.token) }}
                </div>
              </q-card-section>
              <q-card-section>
                <div class="row justify-between items-center">
                  <div>{{ $t('AccountReceiveTable.sender') }}</div>
                  <div @click="copyAddress(props.row.from, 'Sender')" class="cursor-pointer copy-icon-parent">
                    <span>{{ props.row.from }}</span>
                    <q-icon color="primary" class="q-ml-sm" name="far fa-copy" />
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
                  <div @click="copyAddress(props.row.receiver, 'Receiver')" class="cursor-pointer copy-icon-parent">
                    <span>{{ formatAddress(props.row.receiver) }}</span>
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
                    @updateDestinationAddress="destinationAddress = arguments[0]"
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
                  <img class="col-auto q-mr-md" :src="getTokenLogoUri(props.row.token)" style="width: 1.2rem" />
                  <div class="col-auto">
                    {{ formatAmount(col.value, props.row.token) }}
                    {{ getTokenSymbol(props.row.token) }}
                  </div>
                </div>
              </div>

              <!-- Sender column -->
              <div v-else-if="col.name === 'from'" class="d-inline-block">
                <div @click="copyAddress(props.row.from, 'Sender')" class="cursor-pointer copy-icon-parent">
                  <span>{{ col.value }}</span>
                  <q-icon class="copy-icon" name="far fa-copy" right />
                </div>
              </div>

              <!-- Receiver column -->
              <div v-else-if="col.name === 'receiver'" class="d-inline-block">
                <div @click="copyAddress(props.row.receiver, 'Receiver')" class="cursor-pointer copy-icon-parent">
                  <span>{{ formatAddress(col.value) }}</span>
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
                :disable="isWithdrawInProgress"
                :flat="true"
                :label="props.expand ? $t('AccountReceiveTable.hide') : $t('AccountReceiveTable.withdraw')"
              />
            </q-td>
          </q-tr>

          <!-- Expansion row -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-muted">
              <withdraw-form
                @initializeWithdraw="initializeWithdraw(props.row)"
                @togglePrivateKey="togglePrivateKey(props.row)"
                @copyPrivateKey="copyPrivateKey(spendingPrivateKey)"
                @updateDestinationAddress="destinationAddress = arguments[0]"
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
        v-if="keysMatch || (advancedMode && isCustomPrivateKey)"
        class="text-caption text-right q-mt-md"
        style="opacity: 0.5"
      >
        <q-icon name="fas fa-check" class="text-positive q-mr-sm" /> {{ $t('AccountReceiveTable.scanning-complete') }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, getCurrentInstance, defineComponent, onMounted, PropType, ref } from '@vue/composition-api';
import { date, copyToClipboard } from 'quasar';
import { BigNumber, Block, joinSignature, formatUnits, TransactionResponse, Web3Provider } from 'src/utils/ethers';
import { Umbra, UserAnnouncement, KeyPair } from '@umbra/umbra-js';
import useSettingsStore from 'src/store/settings';
import useStatusesStore from 'src/store/statuses';
import useWalletStore from 'src/store/wallet';
import { txNotify, notifyUser } from 'src/utils/alerts';
import AccountReceiveTableWarning from 'components/AccountReceiveTableWarning.vue';
import AccountReceiveTableWithdrawConfirmation from 'components/AccountReceiveTableWithdrawConfirmation.vue';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import WithdrawForm from 'components/WithdrawForm.vue';
import { FeeEstimateResponse } from 'components/models';
import { formatAddress, lookupOrFormatAddresses, toAddress, isAddressSafe } from 'src/utils/address';
import { MAINNET_PROVIDER } from 'src/utils/constants';
import { getEtherscanUrl } from 'src/utils/utils';

function useAdvancedFeatures(spendingKeyPair: KeyPair) {
  const vm = getCurrentInstance()!;
  const { startBlock, endBlock, scanPrivateKey } = useSettingsStore();
  const spendingPrivateKey = ref<string>(); // used for hiding/showing private key in UI, so not a computed property

  // Generate string that explains scan settings that were used
  const scanDescriptionString = computed(() => {
    const suffix = scanPrivateKey.value ? vm.$i18n.tc('AccountReceiveTable.custom-prv-key') : '';
    const hasStartBlock = Number(startBlock.value) >= 0;
    const hasEndBlock = Number(endBlock.value) >= 0;
    let msg = `${vm.$i18n.tc('AccountReceiveTable.scanned-from-block')} ${Number(startBlock.value)} ${vm.$i18n.tc(
      'AccountReceiveTable.to'
    )} ${Number(endBlock.value)}`; // default message

    if (!hasStartBlock && !hasEndBlock) msg = `${vm.$i18n.tc('AccountReceiveTable.all-blocks-scanned')}`;
    if (!hasStartBlock && hasEndBlock)
      msg = `${vm.$i18n.tc('AccountReceiveTable.scanned-all-blocks-up-to')} ${Number(endBlock.value)}`;
    if (hasStartBlock && !hasEndBlock)
      msg = `${vm.$i18n.tc('AccountReceiveTable.scanned-from-block')} ${Number(startBlock.value)} ${vm.$i18n.tc(
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

  // For advanced mode: copyies the provided stealth private key to the clipboard
  const copyPrivateKey = async (privateKey: string) => {
    await copyToClipboard(privateKey);
    notifyUser('success', vm.$i18n.tc('AccountReceiveTable.private-key-copied'));
    hidePrivateKey();
  };

  return { scanDescriptionString, hidePrivateKey, togglePrivateKey, spendingPrivateKey, copyPrivateKey };
}

function useReceivedFundsTable(announcements: UserAnnouncement[], spendingKeyPair: KeyPair) {
  const { NATIVE_TOKEN, network, provider, signer, umbra, userAddress, relayer, tokens } = useWalletStore();
  const { setIsInWithdrawFlow } = useStatusesStore();
  const paginationConfig = { rowsPerPage: 25 };
  const expanded = ref<string[]>([]); // for managing expansion rows
  const showPrivacyModal = ref(false);
  const showConfirmationModal = ref(false);
  const privacyModalAddressWarnings = ref<string[]>([]);
  const destinationAddress = ref('');
  const activeAnnouncement = ref<UserAnnouncement>();
  const activeFee = ref<FeeEstimateResponse>(); // null if native token
  // UI status variables
  const isLoading = ref(false);
  const isFeeLoading = ref(false);
  const isWithdrawInProgress = ref(false);
  const txHashIfEth = ref(''); // if withdrawing native token, show the transaction hash (if token, we have a relayer tx ID)
  const vm = getCurrentInstance()!;

  // Define table columns
  const sortByTime = (a: Block, b: Block) => b.timestamp - a.timestamp;
  const toString = (val: BigNumber) => val.toString();

  const mainTableColumns = [
    {
      align: 'left',
      field: 'timestamp',
      label: vm.$i18n.tc('AccountReceiveTable.date-received'),
      name: 'date',
      sortable: true,
      sort: sortByTime,
    },
    {
      align: 'left',
      field: 'amount',
      label: vm.$i18n.tc('AccountReceiveTable.amount'),
      name: 'amount',
      sortable: true,
      format: toString,
    },
    { align: 'left', field: 'from', label: vm.$i18n.tc('AccountReceiveTable.sender'), name: 'from', sortable: true },
    {
      align: 'left',
      field: 'receiver',
      label: vm.$i18n.tc('AccountReceiveTable.stealth-receiver'),
      name: 'receiver',
      sortable: false,
    },
  ];

  // Relayer helper method
  const getFeeEstimate = async (tokenAddress: string) => {
    if (isNativeToken(tokenAddress)) {
      // no fee for native token
      activeFee.value = { fee: '0', token: NATIVE_TOKEN.value };
      return;
    }
    isFeeLoading.value = true;
    activeFee.value = await relayer.value?.getFeeEstimate(tokenAddress);
    isFeeLoading.value = false;
  };

  // Table formatters and helpers
  const formatDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');
  const formatTime = (timestamp: number) => date.formatDate(timestamp, 'h:mm A');
  const isNativeToken = (tokenAddress: string) => tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const getTokenInfo = (tokenAddress: string) => tokens.value.filter((token) => token.address === tokenAddress)[0];
  const getStealthBalance = async (tokenAddress: string, userAddress: string) => {
    if (isNativeToken(tokenAddress)) return (await provider.value?.getBalance(userAddress)) as BigNumber;
    return (await umbra.value?.umbraContract.tokenPayments(userAddress, tokenAddress)) as BigNumber;
  };
  const getTokenSymbol = (tokenAddress: string) => getTokenInfo(tokenAddress).symbol;
  const getTokenLogoUri = (tokenAddress: string) => getTokenInfo(tokenAddress).logoURI;
  const formatAmount = (amount: BigNumber, tokenAddress: string) => {
    const decimals = getTokenInfo(tokenAddress).decimals;
    return Number(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 10,
    });
  };

  // Format announcements so from addresses support ENS/CNS, and so we can easily detect withdrawals
  const formattedAnnouncements = ref(announcements.reverse()); // We reverse so most recent transaction is first
  onMounted(async () => {
    isLoading.value = true;
    if (!provider.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.wallet-not-connected'));

    // Format addresses to use ENS, CNS, or formatted address
    const fromAddresses = announcements.map((announcement) => announcement.from);
    const formattedAddresses = await lookupOrFormatAddresses(fromAddresses, MAINNET_PROVIDER as Web3Provider);
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.from = formattedAddresses[index];
    });

    // Find announcements that have been withdrawn
    const stealthBalancePromises = announcements.map((a) => getStealthBalance(a.token, a.receiver));
    const stealthBalances = await Promise.all(stealthBalancePromises);
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.isWithdrawn = stealthBalances[index].lt(announcement.amount);
    });
    isLoading.value = false;
  });

  /**
   * @notice Copies the address of type to the clipboard
   */
  async function copyAddress(address: string, type: 'Sender' | 'Receiver') {
    await copyToClipboard(address);
    notifyUser('success', `${type} ${vm.$i18n.tc('AccountReceiveTable.address-copied')}`);
  }

  /**
   * @notice Opens the transaction in etherscan
   */
  function openInEtherscan(row: UserAnnouncement) {
    if (!provider.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.wallet-not-connected'));
    // Assume mainnet if we don't have a provider with a valid chainId
    const chainId = provider.value.network.chainId || 1;
    window.open(getEtherscanUrl(row.txHash, chainId));
  }

  /**
   * @notice Initialize the withdraw process
   * @param announcement Announcement to withdraw
   */
  async function initializeWithdraw(announcement: UserAnnouncement) {
    if (!provider.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.wallet-not-connected'));
    if (!userAddress.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.wallet-not-connected'));

    activeAnnouncement.value = announcement;

    try {
      // Check if withdrawal destination is safe
      const { safe, reasons } = await isAddressSafe(
        destinationAddress.value,
        userAddress.value,
        announcement.receiver,
        provider.value
      );

      if (safe) {
        showConfirmationModal.value = true;
      } else {
        showPrivacyModal.value = true;
        privacyModalAddressWarnings.value = reasons;
      }
    } catch (err: any) {
      setIsInWithdrawFlow(false);
      console.warn(err);
      throw new Error(err);
    }
  }

  /**
   * @notice Show withdraw confirmation modal
   * @param announcement Announcement to withdraw
   */
  function confirmWithdraw() {
    showPrivacyModal.value = false;
    showConfirmationModal.value = true;
  }

  type ExecuteWithdrawalOptions = {
    gasPrice?: BigNumber; // fee in wei
  };

  /**
   * @notice Executes the withdraw process
   */
  async function executeWithdraw(options: ExecuteWithdrawalOptions) {
    if (!umbra.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.umbra-instance-not-found'));
    if (!provider.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.provider-not-found'));
    if (!activeAnnouncement.value) throw new Error(vm.$i18n.tc('AccountReceiveTable.no-announcement-selected'));
    showPrivacyModal.value = false;

    // Get token info, stealth private key, and destination (acceptor) address
    const announcement = activeAnnouncement.value;
    const token = getTokenInfo(announcement.token);
    const stealthKeyPair = spendingKeyPair.mulPrivateKey(announcement.randomNumber);
    const spendingPrivateKey = stealthKeyPair.privateKeyHex as string;
    const acceptor = await toAddress(destinationAddress.value, provider.value);

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
        if (!signer.value || !provider.value)
          throw new Error(vm.$i18n.tc('AccountReceiveTable.signer-or-provider-not-found'));
        if (!activeFee.value || !('fee' in activeFee.value))
          throw new Error(vm.$i18n.tc('AccountReceiveTable.fee-not-set'));
        const chainId = network.value?.chainId;
        if (!chainId) throw new Error(`${vm.$i18n.tc('AccountReceiveTable.invalid-chain-id')} ${String(chainId)}`);

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
    formatAddress,
    formatAmount,
    formatDate,
    formattedAnnouncements,
    formatTime,
    formatUnits,
    getFeeEstimate,
    getTokenLogoUri,
    getTokenSymbol,
    initializeWithdraw,
    isNativeToken,
    isFeeLoading,
    isLoading,
    isWithdrawInProgress,
    mainTableColumns,
    openInEtherscan,
    paginationConfig,
    privacyModalAddressWarnings,
    showConfirmationModal,
    showPrivacyModal,
    txHashIfEth,
  };
}

export default defineComponent({
  name: 'AccountReceiveTable',
  components: { AccountReceiveTableWarning, AccountReceiveTableWithdrawConfirmation, BaseTooltip, WithdrawForm },
  props: {
    announcements: {
      type: (undefined as unknown) as PropType<UserAnnouncement[]>,
      required: true,
    },
  },

  setup(props, context) {
    const { advancedMode, isDark, scanPrivateKey } = useSettingsStore();
    const { setIsInWithdrawFlow } = useStatusesStore();

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const { isAccountSetup, keysMatch, spendingKeyPair: spendingKeyPairFromSig } = useWalletStore();
    const spendingKeyPair = computed(() => {
      if (advancedMode.value && scanPrivateKey.value) return new KeyPair(scanPrivateKey.value);
      return spendingKeyPairFromSig.value as KeyPair;
    });
    const vm = getCurrentInstance()!;
    const receiverTooltipText = vm.$i18n.tc('AccountReceiveTable.receiver-tool-tip');

    return {
      advancedMode,
      context,
      receiverTooltipText,
      isAccountSetup,
      isDark,
      isCustomPrivateKey: scanPrivateKey.value?.length,
      keysMatch,
      setIsInWithdrawFlow,
      ...useAdvancedFeatures(spendingKeyPair.value),
      ...useReceivedFundsTable(props.announcements, spendingKeyPair.value),
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
