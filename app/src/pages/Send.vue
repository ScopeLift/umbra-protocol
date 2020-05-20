<template>
  <q-page padding>
    <h3 class="page-title">
      Send
    </h3>

    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to send funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>
    <div
      v-else
      class="form"
    >
      <!-- Choose recipient -->
      <lookup-recipient />

      <!-- Select token -->
      <div>
        Select the token you'd like to send
      </div>
      <q-select
        v-model="selectedToken"
        emit-value
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

      <!-- Enter Amount -->
      <div class="q-mt-lg">
        Enter the amount to send
      </div>
      <base-input
        v-model.number="tokenAmount"
        type="number"
        label="Enter Amount"
        :lazy-rules="false"
        :rules="isValidAmount"
      />

      <!-- Approve/Send Button -->
      <base-button
        :disabled="!isDataValid"
        :full-width="true"
        label="TODO: Approve or Send Tx"
      />
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import { ethers } from 'ethers';
import ConnectWallet from 'components/ConnectWallet';
import LookupRecipient from 'components/LookupRecipient';

const addresses = require('../../../addresses.json');

const { utils } = ethers;

export default {
  name: 'Send',

  components: {
    ConnectWallet,
    LookupRecipient,
  },

  data() {
    return {
      selectedToken: undefined,
      tokenAmount: undefined,
      tokenList: [
        {
          symbol: 'ETH',
          image: 'statics/tokens/eth.png',
        },
        {
          symbol: 'DAI',
          image: 'statics/tokens/dai.png',
        },
        // {
        //   symbol: 'USDC',
        //   image: 'statics/tokens/usdc.png',
        // },
      ],
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      provider: (state) => state.user.ethersProvider,
      recipientPublicKey: (state) => state.user.send.recipientPublicKey,
    }),

    balance() {
      if (!this.balanceBN) return undefined;
      return utils.formatEther(this.balanceBN);
    },

    isDataValid() {
      const isRecipientValid = !!this.recipientPublicKey;
      const isTokenValid = !!this.selectedToken;
      const isAmountValid = parseFloat(this.balance) >= parseFloat(this.tokenAmount);
      return isRecipientValid && isTokenValid && isAmountValid;
    },
  },

  asyncComputed: {
    balanceBN() {
      // Get balance of the selected currency
      if (!this.selectedToken) return undefined;
      if (this.selectedToken === 'ETH') {
        return this.provider.getBalance(this.userAddress);
      }
      const abi = require(`../../../abi/${this.selectedToken}.json`); // eslint-disable-line
      const address = addresses[this.selectedToken];
      const contract = new ethers.Contract(address, abi, this.provider);
      return contract.balanceOf(this.userAddress);
    },
  },

  methods: {
    isValidAmount(val) {
      if (!this.selectedToken) return 'Please select a token first.';
      const balance = parseFloat(this.balance);
      const message = `Please enter a valid amount. You have ${balance} ${this.selectedToken}.`;
      return balance >= parseFloat(val) ? true : message;
    },
  },
};
</script>
