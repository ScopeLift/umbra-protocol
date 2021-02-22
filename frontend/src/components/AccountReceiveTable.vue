<template>
  <div>
    <div v-if="isLoading" class="text-center">
      <loading-spinner />
      <div class="text-center text-italic">Scanning for funds...</div>
    </div>

    <q-table
      v-else
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
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
          <q-th auto-width />
        </q-tr>
      </template>

      <!-- Body row configuration -->
      <template v-slot:body="props">
        <q-tr :props="props" :key="props.row.id">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <!-- Asset column -->
            <div v-if="col.name === 'date'">
              <div>{{ formatDate(col.value.timestamp * 1000) }}</div>
              <div class="text-caption text-grey">{{ formatTime(col.value.timestamp * 1000) }}</div>
            </div>

            <!-- Amount column -->
            <div v-else-if="col.name === 'amount'">
              <div class="row justify-start items-center no-wrap">
                <img
                  class="col-auto q-mr-md"
                  :src="getTokenLogoUri(props.row.token)"
                  style="width: 1.5rem"
                />
                <div class="col-auto">
                  {{ formatAmount(col.value, props.row.token) }}
                  {{ getTokenSymbol(props.row.token) }}
                </div>
              </div>
            </div>

            <!-- From column -->
            <div v-else-if="col.name === 'from'">
              {{ col.value.from }}
            </div>

            <!-- Default -->
            <div v-else>
              {{ col.value }}
            </div>
          </q-td>

          <!-- Expansion button, works accordian-style -->
          <q-td auto-width>
            <base-button
              @click="expanded = [props.key]"
              color="primary"
              :dense="true"
              :flat="true"
              :label="props.expand ? 'Hide' : 'Withdraw'"
            />
          </q-td>
        </q-tr>

        <!-- Expansion row -->
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="bg-muted">
            <q-form class="form q-py-md" style="white-space: normal">
              <div>Enter address to withdraw funds to</div>
              <base-input
                v-model="destinationAddress"
                @click="withdraw(props.row)"
                appendButtonLabel="Withdraw"
                :appendButtonDisable="isWithdrawInProgress"
                label="Address"
                lazy-rules
                :rules="(val) => (val && val.length > 4) || 'Please enter valid address'"
              />
              <div class="text-caption">
                <span class="text-bold">WARNING</span>: Be sure you understand the security
                implications before entering a withdrawal address. If you withdraw to an address
                publicly associated with you, privacy for this transaction will be lost
              </div>
            </q-form>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from '@vue/composition-api';
import { date } from 'quasar';
import { Contract } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import {
  Block,
  ExternalProvider,
  TransactionResponse,
  Web3Provider,
} from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { Umbra, UserAnnouncement, KeyPair } from '@umbra/umbra-js';
import { RelayProvider } from '@opengsn/gsn/dist/src/relayclient/RelayProvider';
import { Web3ProviderBaseInterface } from '@opengsn/gsn/dist/src/common/types/Aliases';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import UmbraRelayRecipient from 'src/contracts/umbra-relay-recipient.json';
import { SupportedChainIds } from 'components/models';

function useReceivedFundsTable(announcements: UserAnnouncement[]) {
  const { tokens, signer, provider, umbra, spendingKeyPair } = useWalletStore();
  const { txNotify } = useAlerts();
  const paginationConfig = { rowsPerPage: 25 };
  const expanded = ref<string[]>([]); // for managing expansion rows
  const isLoading = ref(false);
  const destinationAddress = ref('');
  const isWithdrawInProgress = ref(false);

  const mainTableColumns = [
    {
      align: 'left',
      field: 'block',
      label: 'Date Received',
      name: 'date',
      sortable: true,
      sort: (a: Block, b: Block) => b.timestamp - a.timestamp,
    },
    {
      align: 'left',
      field: 'amount',
      label: 'Amount',
      name: 'amount',
      sortable: true,
      format: (val: BigNumber) => val.toString(),
    },
    {
      align: 'left',
      field: 'receipt',
      label: 'From',
      name: 'from',
      sortable: true,
    },
  ];

  // Table formatters and helpers
  const formatDate = (timestamp: number) => date.formatDate(timestamp, 'YYYY-MM-DD');
  const formatTime = (timestamp: number) => date.formatDate(timestamp, 'H:mm A');
  const getTokenInfo = (tokenAddress: string) => {
    return tokens.value.filter((token) => token.address === tokenAddress)[0];
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
  const formatAddress = async (address: string) => {
    try {
      const ens = await provider.value?.lookupAddress(address);
      return ens || `${address}...${address}`;
    } catch (err) {
      return address;
    }
  };

  // Format announcements so from addresses support ENS and can detect withdrawals
  const formattedAnnouncements = ref(announcements.reverse()); // We reverse so most recent transaction is first
  onMounted(async () => {
    isLoading.value = true;
    // Format addresses to use ENS
    const fromAddresses = announcements.map((announcement) => announcement.receipt.from);
    const formattedFromAddresses = await Promise.all(fromAddresses.map(formatAddress));
    formattedAnnouncements.value.forEach((announcement, index) => {
      announcement.receipt.from = formattedFromAddresses[index];
      announcement.tx.from = formattedFromAddresses[index];
    });

    // Now compare against withdrawal events
    // TODO
    isLoading.value = false;
  });

  /**
   * @notice Withdraw funds from stealth address
   * @param announcement Announcement to withdraw
   */
  async function withdraw(announcement: UserAnnouncement) {
    if (!umbra.value) throw new Error('Umbra instance not found');
    // Get token info and stealth private key
    const token = getTokenInfo(announcement.token);
    const stealthKeyPair = (spendingKeyPair.value as KeyPair).mulPrivateKey(
      announcement.randomNumber
    );
    const spendingPrivateKey = stealthKeyPair.privateKeyHex as string;

    // Send transaction
    try {
      isWithdrawInProgress.value = true;
      let tx: TransactionResponse;
      if (token.symbol === 'ETH') {
        // Withdrawing ETH
        tx = await umbra.value.withdraw(
          spendingPrivateKey,
          token.address,
          announcement.receiver,
          destinationAddress.value
        );
      } else {
        // Withdrawing token
        if (!signer.value || !provider.value) throw new Error('Signer or provider not found');
        // Get user's signature. GSN doesn't care about sponsor address and fee, so for now on
        // Rinkeby we just use a value of 1 and the destinationAddress as a sanity check this functionality
        const sponsor = destinationAddress.value;
        const sponsorFee = '1';
        const { v, r, s } = await Umbra.signWithdraw(
          spendingPrivateKey,
          destinationAddress.value,
          sponsor,
          sponsorFee
        );

        // Configure GSN provider (hardcoded our Rinkeby paymaster address)
        const gsnConfig = {
          paymasterAddress: '0x53D07c0d1e382e3C66574E316ec97108C21d16DE',
          methodSuffix: '_v4', // MetaMask only
          jsonStringifyRequest: true, // MetaMask only
        };
        const gsnProvider = await RelayProvider.newProvider({
          provider: provider.value.provider as Web3ProviderBaseInterface,
          config: gsnConfig,
        }).init();
        gsnProvider.addAccount(spendingPrivateKey);
        const gsnEthersProvider = new Web3Provider((gsnProvider as unknown) as ExternalProvider);

        // Send transaction
        const chainId = String((await provider.value.getNetwork()).chainId);
        const stealthSigner = gsnEthersProvider.getSigner(stealthKeyPair.address);
        const umbraRelayRecipient = new Contract(
          UmbraRelayRecipient.addresses[chainId as SupportedChainIds],
          UmbraRelayRecipient.abi,
          stealthSigner
        );
        tx = (await umbraRelayRecipient.withdrawTokenOnBehalf(
          stealthKeyPair.address,
          destinationAddress.value,
          sponsor,
          sponsorFee,
          v,
          r,
          s,
          { gasLimit: '1000000' }
        )) as TransactionResponse;
      }
      txNotify(tx.hash);
      await tx.wait();
      isWithdrawInProgress.value = false;
    } catch (err) {
      isWithdrawInProgress.value = false;
    }
  }

  return {
    isWithdrawInProgress,
    isLoading,
    expanded,
    paginationConfig,
    mainTableColumns,
    formatDate,
    formatTime,
    getTokenLogoUri,
    getTokenSymbol,
    formatAmount,
    formattedAnnouncements,
    destinationAddress,
    withdraw,
  };
}

export default defineComponent({
  name: 'AccountReceiveTable',
  props: {
    announcements: {
      type: (undefined as unknown) as PropType<UserAnnouncement[]>,
      required: true,
    },
  },

  setup(props) {
    return { ...useReceivedFundsTable(props.announcements) };
  },
});
</script>
