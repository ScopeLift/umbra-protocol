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
          Enter the ENS name or address you would like to send your
          {{ selectedPayment.amount }} {{ selectedPayment.tokenName }} to.
        </q-card-section>

        <q-card-section>
          <base-input
            v-model="selectedPayment.destinationAddress"
            :rules="isValidDestination"
            label="Enter ENS name or address"
            :lazy-rules="false"
          />
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
      :data="tableData"
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
          <div>
            <base-button
              :dense="true"
              :flat="true"
              label="Withdraw"
              @click="beginWithdrawalProcess(props)"
            />
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

const umbra = require('umbra-js');

const { KeyPair } = umbra;

export default {
  name: 'ReceivedFundsTable',

  mixins: [helpers],

  props: {
    tableData: {
      type: undefined, // Object, but will be undefined before data is fetched
      required: true,
      default: undefined,
    },
  },

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
      },
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

        // Show withdraw dialog
        this.selectedPayment.amount = data.row.amount;
        this.selectedPayment.tokenName = data.row.tokenName;
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
        if (this.selectedPayment.tokenName === 'ETH') {
          const tx = await wallet.sendTransaction({
            value: ethers.BigNumber.from(ethers.utils.parseEther('0.00001')),
            to: destination,
          });
          this.txHash = tx.hash;
          this.sendState = 'waitingForConfirmation';
          await tx.wait();
        }
        this.sendState = 'complete';
      } catch (err) {
        this.showError(err);
        this.sendState = undefined;
      }
    },
  },
};
</script>
