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
        :rules="isValidAmount"
      />

      <!-- Approve/Send Button -->
      <base-button
        :disabled="true"
        :full-width="true"
        label="TODO: Approve or Send Tx"
      />
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';
import LookupRecipient from 'components/LookupRecipient';

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
        {
          symbol: 'USDC',
          image: 'statics/tokens/usdc.png',
        },
      ],
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
    }),
  },

  methods: {
    isValidAmount(val) {
      return val > 0 ? true : 'Please enter a valid amount';
    },
  },
};
</script>
