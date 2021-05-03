<template>
  <div>
    <!-- Modal to show when warning user of bad privacy hygiene -->
    <q-dialog v-model="showPrivacyModal">
      <account-receive-table-warning
        @acknowledged="executeWithdraw"
        :addressDescription="privacyModalAddressDescription"
        class="q-pa-lg"
      />
    </q-dialog>

    <div v-if="isLoading" class="text-center">
      <loading-spinner />
      <div class="text-center text-italic">Scanning for funds...</div>
    </div>

    <!-- Received funds table -->
    <div v-else>
      <div v-if="advancedMode" class="text-caption q-mb-sm">
        <!-- This scanDescriptionString describes scan settings that were used -->
        {{ scanDescriptionString }}.
        <span @click="context.emit('reset')" class="cursor-pointer hyperlink">Change scan settings</span>.
      </div>
      <q-table
        :columns="mainTableColumns"
        :data="formattedAnnouncements"
        :expanded.sync="expanded"
        no-data-label="This account has not received any funds"
        :pagination="paginationConfig"
        row-key="randomNumber"
        title="Received Funds"
      >
        <!-- Header labels -->
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props"> {{ col.label }} </q-th>
            <q-th auto-width />
          </q-tr>
        </template>

        <!-- Body row configuration -->
        <template v-slot:body="props">
          <q-tr :props="props" :key="props.row.id">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <!-- Asset column -->
              <div v-if="col.name === 'date'" class="d-inline-block">
                <div
                  @click="openInEtherscan(props.row)"
                  class="row justify-start items-center cursor-pointer external-link-icon-parent"
                >
                  <div class="col-auto">
                    <div>{{ formatDate(col.value.timestamp * 1000) }}</div>
                    <div class="text-caption text-grey">{{ formatTime(col.value.timestamp * 1000) }}</div>
                  </div>
                  <q-icon class="external-link-icon" name="fas fa-external-link-alt" right />
                </div>
              </div>

              <!-- Amount column -->
              <div v-else-if="col.name === 'amount'">
                <div class="row justify-start items-center no-wrap">
                  <img class="col-auto q-mr-md" :src="getTokenLogoUri(props.row.token)" style="width: 1.5rem" />
                  <div class="col-auto">
                    {{ formatAmount(col.value, props.row.token) }}
                    {{ getTokenSymbol(props.row.token) }}
                  </div>
                </div>
              </div>

              <!-- From column -->
              <div v-else-if="col.name === 'from'" class="d-inline-block">
                <div @click="copySenderAddress(props.row)" class="cursor-pointer copy-icon-parent">
                  <span>{{ col.value.from }}</span>
                  <q-icon class="copy-icon" name="far fa-copy" right />
                </div>
                <div v-if="hasPayloadExtension(props.row.randomNumber)" class="text-caption text-grey">
                  {{ formatPayloadExtensionText(props.row.randomNumber) }}
                </div>
              </div>

              <!-- Default -->
              <div v-else>{{ col.value }}</div>
            </q-td>

            <!-- Expansion button, works accordian-style -->
            <!--
            The click modifier is a bit clunky because it touches state in two independent composition functions,
             so we explain the two things it does here:
              1. First it calls hidePrivateKey(), which is an advancedMode only feature to show your private key.
                 We call this to make sure a private key is never shown when initially expanding a row
              2. If the new row key is the same as the value of the value of expanded[0], we clicked the currently
                 expanded row and therefore set `expanded = []` to hide the row. Otherwise we update the `expanded`
                 array so it's only element is the key of the new row. This enables showing/hiding of rows and ensures
                 only one row is every expanded at a time
          -->
            <q-td auto-width>
              <div v-if="props.row.isWithdrawn" class="text-positive">
                Withdrawn<q-icon name="fas fa-check" class="q-ml-sm" />
              </div>
              <base-button
                v-else
                @click="
                  hidePrivateKey();
                  expanded = expanded[0] === props.key ? [] : [props.key];
                "
                color="primary"
                :dense="true"
                :disable="isWithdrawInProgress"
                :flat="true"
                :label="props.expand ? 'Hide' : 'Withdraw'"
              />
            </q-td>
          </q-tr>

          <!-- Expansion row -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-muted">
              <q-form class="form-wide q-py-md" style="white-space: normal">
                <div>Enter address to withdraw funds to</div>
                <base-input
                  v-model="destinationAddress"
                  @click="initializeWithdraw(props.row)"
                  appendButtonLabel="Withdraw"
                  :appendButtonDisable="isWithdrawInProgress"
                  :appendButtonLoading="isWithdrawInProgress"
                  :disable="isWithdrawInProgress"
                  label="Address"
                  lazy-rules
                  :rules="(val) => (val && val.length > 4) || 'Please enter valid address'"
                />
                <div class="text-caption">
                  <span class="text-bold">WARNING</span>: Be sure you understand the security implications before
                  entering a withdrawal address. If you withdraw to an address publicly associated with you, privacy for
                  this transaction will be lost.
                </div>

                <!-- Advanced feature: show private key -->
                <div v-if="advancedMode">
                  <div @click="togglePrivateKey(props.row)" class="text-caption hyperlink q-mt-lg">
                    {{ spendingPrivateKey ? 'Hide' : 'Show' }} withdrawal private key
                  </div>
                  <div
                    v-if="spendingPrivateKey"
                    @click="copyPrivateKey(spendingPrivateKey)"
                    class="cursor-pointer copy-icon-parent q-mt-sm"
                  >
                    <span class="text-caption">{{ spendingPrivateKey }}</span>
                    <q-icon class="copy-icon" name="far fa-copy" right />
                  </div>
                </div>
              </q-form>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, PropType, ref } from '@vue/composition-api';
import { date, copyToClipboard } from 'quasar';
import {
  arrayify,
  BigNumber,
  Block,
  joinSignature,
  formatUnits,
  toUtf8String,
  TransactionResponse,
} from 'src/utils/ethers';
import { DomainService, Umbra, UserAnnouncement, KeyPair } from '@umbra/umbra-js';
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
import { txNotify, notifyUser } from 'src/utils/alerts';
import AccountReceiveTableWarning from 'components/AccountReceiveTableWarning.vue';
import { SupportedChainIds } from 'components/models';
import { lookupOrFormatAddresses, toAddress, isAddressSafe } from 'src/utils/address';

function useAdvancedFeatures(spendingKeyPair: KeyPair) {
  const { startBlock, endBlock, scanPrivateKey } = useSettingsStore();
  const spendingPrivateKey = ref<string>(); // used for hiding/showing private key in UI, so not a computed property

  // Generate string that explains scan settings that were used
  const scanDescriptionString = computed(() => {
    const suffix = scanPrivateKey.value ? ' with custom private key' : '';
    const hasStartBlock = Number(startBlock.value) >= 0;
    const hasEndBlock = Number(endBlock.value) >= 0;
    let msg = `Scanned from block ${Number(startBlock.value)} to ${Number(endBlock.value)}`; // default message

    if (!hasStartBlock && !hasEndBlock) msg = 'All blocks have been scanned';
    if (!hasStartBlock && hasEndBlock) msg = `Scanned all blocks up to ${Number(endBlock.value)}`;
    if (hasStartBlock && !hasEndBlock) msg = `Scanned from block ${Number(startBlock.value)} to current block`;
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
    notifyUser('positive', 'Private key copied to clipboard');
    hidePrivateKey();
  };

  return { scanDescriptionString, hidePrivateKey, togglePrivateKey, spendingPrivateKey, copyPrivateKey };
}

function useReceivedFundsTable(announcements: UserAnnouncement[], spendingKeyPair: KeyPair) {
  const { tokens, userAddress, signer, provider, umbra, domainService } = useWalletStore();
  const paginationConfig = { rowsPerPage: 25 };
  const expanded = ref<string[]>([]); // for managing expansion rows
  const isLoading = ref(false);
  const showPrivacyModal = ref(false);
  const privacyModalAddressDescription = ref('a wallet that may be publicly associated with you');
  const destinationAddress = ref('');
  const isWithdrawInProgress = ref(false);
  const activeAnnouncement = ref<UserAnnouncement>();

  // Define table columns
  const sortByTime = (a: Block, b: Block) => b.timestamp - a.timestamp;
  const toString = (val: BigNumber) => val.toString();
  const mainTableColumns = [
    { align: 'left', field: 'block', label: 'Date Received', name: 'date', sortable: true, sort: sortByTime },
    { align: 'left', field: 'amount', label: 'Amount', name: 'amount', sortable: true, format: toString },
    { align: 'left', field: 'receipt', label: 'From', name: 'from', sortable: true },
  ];

  // Table formatters and helpers
  const formatDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');
  const formatTime = (timestamp: number) => date.formatDate(timestamp, 'H:mm A');
  const zeroPrefix = '0x00000000000000000000000000000000'; // 16 bytes of zeros
  const hasPayloadExtension = (randomNumber: string) => randomNumber.slice(0, 34) !== zeroPrefix;
  const formatPayloadExtensionText = (randomNumber: string) => toUtf8String(arrayify(randomNumber.slice(0, 34)));
  const isEth = (tokenAddress: string) => tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const getTokenInfo = (tokenAddress: string) => tokens.value.filter((token) => token.address === tokenAddress)[0];
  const getStealthBalance = async (tokenAddress: string, userAddress: string) => {
    if (isEth(tokenAddress)) return (await provider.value?.getBalance(userAddress)) as BigNumber;
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
    if (!provider.value) throw new Error('Wallet not connected. Try refreshing the page and connect your wallet');

    // Format addresses to use ENS, CNS, or formatted address
    const fromAddresses = announcements.map((announcement) => announcement.receipt.from);
    const formattedAddresses = await lookupOrFormatAddresses(fromAddresses, provider.value);
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.receipt.from = formattedAddresses[index];
    });

    // Find announcements that have been withdrawn
    const stealthBalancePromises = announcements.map((a) => getStealthBalance(a.token, a.receiver));
    const stealthBalances = await Promise.all(stealthBalancePromises);
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.isWithdrawn = stealthBalances[index].eq(BigNumber.from('0'));
    });
    isLoading.value = false;
  });

  /**
   * @notice Copies the sender's address to the clipboard
   */
  async function copySenderAddress(row: UserAnnouncement) {
    // row.receipt.from has the truncated from address shown in the UI, so here we use the row.tx.from address
    await copyToClipboard(row.tx.from);
    notifyUser('positive', 'Sender address copied to clipboard');
  }

  /**
   * @notice Opens the transaction in etherscan
   */
  function openInEtherscan(row: UserAnnouncement) {
    if (!provider.value) throw new Error('Wallet not connected. Try refreshing the page and connect your wallet');
    // Assume mainnet unless we have Rinkeby chainId
    const chainId = provider.value.network.chainId || 1;
    const baseUrl = chainId === 4 ? 'https://rinkeby.etherscan.io' : 'https://rinkeby.etherscan.io';
    window.open(`${baseUrl}/tx/${row.tx.hash}`);
  }

  /**
   * @notice Initialize the withdraw process
   * @param announcement Announcement to withdraw
   */
  async function initializeWithdraw(announcement: UserAnnouncement) {
    // Check if withdrawal destination is safe
    activeAnnouncement.value = announcement;
    const { safe, reason } = await isAddressSafe(
      destinationAddress.value,
      userAddress.value as string,
      domainService.value as DomainService
    );

    if (safe) {
      await executeWithdraw();
    } else {
      showPrivacyModal.value = true;
      privacyModalAddressDescription.value = reason;
    }
  }

  /**
   * @notice Executes the withdraw process
   */
  async function executeWithdraw() {
    if (!umbra.value) throw new Error('Umbra instance not found');
    if (!activeAnnouncement.value) throw new Error('No announcement is selected for withdraw');
    showPrivacyModal.value = false;

    // Get token info, stealth private key, and destination (acceptor) address
    const announcement = activeAnnouncement.value;
    const token = getTokenInfo(announcement.token);
    const stealthKeyPair = spendingKeyPair.mulPrivateKey(announcement.randomNumber);
    const spendingPrivateKey = stealthKeyPair.privateKeyHex as string;
    const destinationAddr = await toAddress(destinationAddress.value, domainService.value as DomainService);

    // Send transaction
    try {
      isWithdrawInProgress.value = true;
      let tx: TransactionResponse;
      if (token.symbol === 'ETH') {
        // Withdrawing ETH
        tx = await umbra.value.withdraw(spendingPrivateKey, token.address, destinationAddr);
        txNotify(tx.hash);
        await tx.wait();
      } else {
        // Withdrawing token
        if (!signer.value || !provider.value) throw new Error('Signer or provider not found');

        // TODO make sure token is supported

        // TODO get fee estimate

        // TODO get users signature

        // TODO relay transaction

        // TODO track status

        // Original code below
        const sponsor = destinationAddr;
        const sponsorFee = '1'; // sponsor receives 1 unit of token being withdrawn, e.g. 1e-18 DAI or 1e-6 USDC
        const chainId = (await provider.value.getNetwork()).chainId;
        const signature = joinSignature(
          await Umbra.signWithdraw(
            spendingPrivateKey,
            chainId,
            umbra.value.umbraContract.address,
            destinationAddr,
            token.address,
            sponsor,
            sponsorFee
          )
        );
      }

      // Collapse expansion row and update table to show this was withdrawn
      destinationAddress.value = '';
      expanded.value = []; // hides expanded row
      formattedAnnouncements.value.forEach((x) => {
        if (announcement.receiver === x.receiver) {
          x.isWithdrawn = true;
        }
      });
    } finally {
      isWithdrawInProgress.value = false;
      activeAnnouncement.value = undefined;
    }
  }

  return {
    copySenderAddress,
    destinationAddress,
    executeWithdraw,
    expanded,
    formatAmount,
    formatDate,
    formatPayloadExtensionText,
    formattedAnnouncements,
    formatTime,
    getTokenLogoUri,
    getTokenSymbol,
    hasPayloadExtension,
    initializeWithdraw,
    isLoading,
    isWithdrawInProgress,
    mainTableColumns,
    openInEtherscan,
    paginationConfig,
    privacyModalAddressDescription,
    showPrivacyModal,
  };
}

export default defineComponent({
  name: 'AccountReceiveTable',
  components: { AccountReceiveTableWarning },
  props: {
    announcements: {
      type: (undefined as unknown) as PropType<UserAnnouncement[]>,
      required: true,
    },
  },

  setup(props, context) {
    const { advancedMode, scanPrivateKey } = useSettingsStore();

    // Check for manually entered private key in advancedMode, otherwise use the key from user's signature
    const { spendingKeyPair: spendingKeyPairFromSig } = useWalletStore();
    const spendingKeyPair = computed(() => {
      if (advancedMode.value && scanPrivateKey.value) return new KeyPair(scanPrivateKey.value);
      return spendingKeyPairFromSig.value as KeyPair;
    });

    return {
      advancedMode,
      context,
      ...useAdvancedFeatures(spendingKeyPair.value),
      ...useReceivedFundsTable(props.announcements, spendingKeyPair.value),
    };
  },
});
</script>

<style lang="sass" scoped>
.copy-icon-parent:hover .copy-icon
  color: $primary

.copy-icon
  color: transparent

.external-link-icon-parent:hover .external-link-icon
  color: $primary

.external-link-icon
  color: transparent
</style>
