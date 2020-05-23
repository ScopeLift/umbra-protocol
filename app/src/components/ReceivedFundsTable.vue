<template>
  <div>
    <!-- WITHDRAW DIALOG -->
    <q-dialog v-model="showWithdrawDialog">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-center text-h5 header-black primary">
            Complete Withdrawal
          </div>
        </q-card-section>

        <q-card-section>
          <!-- Destination address -->
          <div>
            Enter the ENS name or address you would like to send your
            {{ selectedPayment.amount }} {{ selectedPayment.tokenName }} to.
          </div>
          <base-input
            v-model="selectedPayment.destinationAddress"
            class="q-pt-none"
            label="Enter ENS name or address"
            :lazy-rules="false"
            :rules="isValidDestination"
          />

          <!-- Output token -->
          <div>
            Enter the desired output token
          </div>
          <q-select
            v-model="selectedPayment.outputToken"
            class="q-mt-xs"
            emit-value
            disable
            filled
            label="Select token"
            :options="tokenList"
            option-label="symbol"
            option-value="symbol"
          >
            <template v-slot:option="token">
              <q-item
                v-bind="token.itemProps"
                v-on="token.itemEvents"
              >
                <q-item-section avatar>
                  <img
                    :src="token.opt.image"
                    style="max-width:30px; max-height:30px; margin: 0 auto;"
                  >
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ token.opt.symbol }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-section>
          <div v-if="sendState == 'waitingForConfirmation'">
            Your transaction is processing...
            <div class="text-caption">
              <a
                :href="`https://ropsten.etherscan.io/tx/${txHash}`"
                target="_blank"
                class="hyperlink"
              >View on Etherscan</a>
            </div>
          </div>
          <div v-else-if="sendState === 'complete'">
            <q-icon
              left
              color="positive"
              name="fas fa-check"
            />
            Withdrawal complete!
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-if="sendState === 'complete'"
            v-close-popup
            color="primary"
            flat
            label="Close"
          />
          <q-btn
            v-if="sendState !== 'complete'"
            v-close-popup
            color="primary"
            flat
            label="Cancel"
          />
          <base-button
            v-if="sendState !== 'complete'"
            class="q-ml-md"
            color="primary"
            :disabled="!okToSend"
            :loading="sendState === 'waitingToSend' || sendState === 'waitingForConfirmation'"
            label="Send"
            @click="withdrawFunds"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- TABLE OF RECEIVED FUNDS -->
    <q-table
      title="Received Funds"
      :data="withdrawalData"
      :columns="columns"
      :pagination.sync="pagination"
      row-key="name"
    >
      <!-- Header row -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
            class="header-bold text-uppercase darkestgrey"
            :class="{ 'darkgrey': $q.dark.isActive}"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <!-- Date column -->
      <template v-slot:body-cell-txDate="props">
        <q-td :props="props">
          <div>
            {{ props.row.txDate }}
          </div>
          <div class="text-caption text-grey">
            {{ props.row.txTime }}
          </div>
        </q-td>
      </template>

      <!-- From column -->
      <template v-slot:body-cell-sender="props">
        <q-td :props="props">
          <!-- TODO Update to handle mainnet URLs. Currently only handles Ropsten -->
          <a
            class="cursor-pointer"
            :href="`https://ropsten.etherscan.io/tx/${props.row.txHash}`"
            style="text-decoration: none; color: inherit; "
            target="_blank"
          >
            {{ props.row.from }}
            <q-icon
              color="primary"
              name="fas fa-external-link-alt"
              right
            />
          </a>
        </q-td>
      </template>

      <!-- Amount column -->
      <template v-slot:body-cell-txAmount="props">
        <q-td :props="props">
          <div class="row justify-start items-center">
            <img
              :src="`statics/tokens/${props.row.tokenName.toLowerCase()}.png`"
              width="20px"
            >
            <div class="q-ml-md">
              {{ props.row.amount }} {{ props.row.tokenName }}
            </div>
          </div>
        </q-td>
      </template>

      <!-- Actions -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div v-if="!props.row.isWithdrawn">
            <base-button
              :dense="true"
              :flat="true"
              label="Withdraw"
              @click="beginWithdrawalProcess(props)"
            />
          </div>
          <div v-else>
            <div class="positive">
              <!-- TODO Update to handle mainnet URLs. Currently only handles Ropsten -->
              <a
                class="cursor-pointer"
                :href="`https://ropsten.etherscan.io/address/${props.row.to}`"
                style="text-decoration: none; color: inherit; "
                target="_blank"
              >
                Withdrawn
                <q-icon
                  right
                  color="positive"
                  name="fas fa-check"
                />
              </a>
            </div>
          </div>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { ethers } from 'ethers';
import helpers from 'src/mixins/helpers';

const { RelayProvider, configureGSN } = require('@opengsn/gsn');
const umbra = require('umbra-js');
// TODO update to handle mainnet. Currently has ropsten hardcoded
const umbraAbi = require('../../../contracts/build/contracts/Umbra.json').abi; // eslint-disable-line
const umbraAddress = require('../../../contracts/.openzeppelin/ropsten.json').proxies['umbra/Umbra'][0].address; // eslint-disable-line

const { KeyPair } = umbra;

export default {
  name: 'ReceivedFundsTable',

  mixins: [helpers],

  data() {
    return {
      sendState: undefined,
      txHash: undefined,
      showWithdrawDialog: undefined,
      stealthPrivateKey: undefined,
      selectedPayment: {
        amount: undefined,
        tokenName: undefined,
        destinationAddress: undefined,
        outputToken: undefined,
        data: undefined, // all related data to this tx
      },
      //
      tokenList: [
        {
          symbol: 'ETH',
          image: 'statics/tokens/eth.png',
        },
        {
          symbol: 'DAI',
          image: 'statics/tokens/dai.png',
        },
      ],
      //
      pagination: {
        sortBy: 'txDate',
        descending: true,
        rowsPerPage: 10,
      },
      columns: [
        {
          align: 'left',
          field: 'timestamp',
          label: 'Date Received',
          name: 'txDate',
          sortable: true,
        },
        {
          align: 'left',
          field: 'amount,',
          label: 'Amount',
          name: 'txAmount',
          sortable: true,
        },
        {
          align: 'left',
          field: 'from',
          label: 'From',
          name: 'sender',
          sortable: true,
        },
        {
          align: 'left',
          label: 'Withdraw Funds',
          name: 'actions',
          sortable: false,
        },
      ],
    };
  },

  computed: {
    ...mapState({
      privateKey: (state) => state.user.sensitive.privateKey,
      provider: (state) => state.user.ethersProvider,
      signer: (state) => state.user.signer,
      withdrawalData: (state) => state.user.withdrawalData,
    }),

    okToSend() {
      const identifier = this.selectedPayment.destinationAddress;
      if (!identifier) return undefined;
      const isAddress = ethers.utils.isAddress(identifier);
      const isEns = identifier.endsWith('.eth');
      return isAddress || isEns;
    },
  },

  methods: {
    isValidDestination() {
      const identifier = this.selectedPayment.destinationAddress;
      const isAddress = ethers.utils.isAddress(identifier);
      const isEns = identifier.endsWith('.eth');
      return isAddress || isEns || 'Please enter a valid ENS domain or address';
    },

    beginWithdrawalProcess(data) {
      try {
        // Get stealth private key
        const { randomNumber } = data.row;
        const privateKeyPair = new KeyPair(this.privateKey);
        const stealthKeyPair = privateKeyPair.mulPrivateKey(randomNumber);
        this.stealthPrivateKey = stealthKeyPair.privateKeyHex;

        // Confirm funds can be accessed
        if (stealthKeyPair.address !== data.row.to) {
          throw new Error('Something went wrong. These funds may not be accessible.');
        }

        // Save info on token being withdrawn
        this.selectedPayment.amount = data.row.amount;
        this.selectedPayment.tokenName = data.row.tokenName;
        this.selectedPayment.outputToken = data.row.tokenName;
        this.selectedPayment.data = data.row;

        // Show withdraw dialog
        this.sendState = undefined;
        this.showWithdrawDialog = true;
      } catch (err) {
        this.showError(err);
      }
    },

    async withdrawFunds() {
      try {
        // Check that address is valid
        this.sendState = 'waitingToSend';
        let destination = this.selectedPayment.destinationAddress;
        if (destination.endsWith('.eth')) {
          destination = await this.provider.resolveName(destination);
          if (!destination) throw new Error('Invalid ENS address entered');
        }

        // Send payment
        const wallet = new ethers.Wallet(this.stealthPrivateKey, this.provider);
        let tx;
        if (this.selectedPayment.tokenName === 'ETH') {
          const balance = await this.provider.getBalance(wallet.address);

          // TODO for mainnet, get real gas price instead of hardcoding 21000 gas at 10 gwei
          // (This is to avoid leaving dust)
          tx = await wallet.sendTransaction({
            value: balance.sub('210000000000000'),
            to: destination,
            gasLimit: ethers.BigNumber.from('21000'),
            gasPrice: ethers.BigNumber.from('10000000000'),
          });
        } else {
          // Generate object in the format that gsnProvider wants
          const stealthPrivateKey = Buffer.from(this.stealthPrivateKey.slice(2), 'hex');
          const stealthAddress = (new KeyPair(this.stealthPrivateKey)).address;
          const stealthKeyPair = {
            privateKey: stealthPrivateKey,
            address: stealthAddress,
          };

          // Create GSN-enabled provider
          const config = configureGSN({
            relayHubAddress: '0xEF46DD512bCD36619a6531Ca84B188b47D85124b',
            stakeManagerAddress: '0x41c7C7c1Bf501e2F43b51c200FEeEC87540AC925',
            paymasterAddress: '0xCCA839B94Ba3B52B8f82485B14856602E8635ebA',
            methodSuffix: '_v4', // MetaMask only
            jsonStringifyRequest: true, // MetaMask only
          });
          const gsnProvider = new RelayProvider(this.provider.provider, config);
          gsnProvider.addAccount(stealthKeyPair);
          const ethersProvider = new ethers.providers.Web3Provider(gsnProvider);
          const signer = ethersProvider.getSigner(stealthAddress);

          // Create contract instance and send tx
          const Umbra = new ethers.Contract(umbraAddress, umbraAbi, signer);
          tx = await Umbra.withdrawToken(destination);
        }

        // Wait for transaction to be mined
        this.txHash = tx.hash;
        this.sendState = 'waitingForConfirmation';
        await tx.wait(); // this section doesn't do anything for GSN provider

        // Update state to indicate successful withdrawal
        const updatedWithdrawalData = this.withdrawalData.map((log) => {
          if (log.to !== this.selectedPayment.data.to) return log;
          log.isWithdrawn = true;
          return log;
        });
        this.$store.commit('user/withdrawalData', updatedWithdrawalData);

        // Update UI
        this.sendState = 'complete';
      } catch (err) {
        this.showError(err);
        this.sendState = undefined;
      }
    },
  },
};
</script>
