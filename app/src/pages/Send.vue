<template>
  <q-page padding>
    <h3 class="page-title">
      Send
    </h3>

    <!-- IF USER IS NOT LOGGED IN WITH WEB3 WALLET -->
    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to send funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <!-- IF USER IS ON WRONG NETWORK -->
    <div
      v-else-if="networkName !== 'ropsten'"
      class="text-center"
    >
      Please switch to the Ropsten network to continue
    </div>

    <q-form
      v-else
      ref="sendForm"
      class="form"
    >
      <!-- Choose recipient -->
      <lookup-recipient ref="recipientInput" />

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
        :loading="isSendPending"
        :full-width="true"
        label="Send"
        @click="sendFundsFlow"
      />

      <div
        v-if="selectedToken && selectedToken !== 'ETH' && !hasAllowance"
        class="text-caption q-mt-md"
      >
        Since this is your first time sending {{ selectedToken }}, you will be asked
        to send two transactions. The first grants Umbra approval to spend your
        tokens, and the second is the payment.
      </div>

      <div
        v-if="isTxProcessing"
        class="q-mt-md"
      >
        Your transaction is processing...
        <div class="text-caption">
          <a
            :href="`https://ropsten.etherscan.io/tx/${txHash}`"
            target="_blank"
            class="hyperlink"
          >View on Etherscan</a>
        </div>
      </div>
    </q-form>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import { ethers } from 'ethers';
import ConnectWallet from 'components/ConnectWallet';
import LookupRecipient from 'components/LookupRecipient';
import helpers from 'src/mixins/helpers';

const umbra = require('umbra-js');
const addresses = require('../../../addresses.json');

// TODO update to handle mainnet. Currently has ropsten hardcoded
const umbraAbi = require('../../../contracts/build/contracts/Umbra.json').abi; // eslint-disable-line
const umbraAddress = require('../../../contracts/.openzeppelin/ropsten.json').proxies['umbra/Umbra'][0].address; // eslint-disable-line

const { constants, utils } = ethers;
const { KeyPair, RandomNumber } = umbra;

export default {
  name: 'Send',

  components: {
    ConnectWallet,
    LookupRecipient,
  },

  mixins: [helpers],

  data() {
    return {
      isSendPending: undefined,
      isTxProcessing: undefined,
      txHash: undefined,
      toll: undefined,
      selectedToken: undefined,
      selectedTokenAddress: undefined,
      selectedTokenContract: undefined,
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
      signer: (state) => state.user.signer,
      networkName: (state) => state.user.networkName,
      recipientPublicKey: (state) => state.user.send.recipientPublicKey,
    }),

    /**
     * @notice User's balance of the selected token
     */
    balance() {
      if (!this.balanceBN) return undefined;
      return utils.formatEther(this.balanceBN);
    },

    /**
     * @notice True if Umbra contract has allowance to spend tokens, false otherwise
     */
    hasAllowance() {
      if (!this.tokenAllowance) return undefined;
      return this.tokenAllowance.gt(constants.Zero);
    },

    /**
     * @notice True if form is correctly filled out, false otherwise
     */
    isDataValid() {
      const isRecipientValid = !!this.recipientPublicKey;
      const isTokenValid = !!this.selectedToken;
      const isAmountValid = parseFloat(this.balance) >= 0
        && parseFloat(this.balance) >= parseFloat(this.tokenAmount);
      return isRecipientValid && isTokenValid && isAmountValid;
    },
  },

  asyncComputed: {
    /**
     * @notice Returns users balance of the selected currency as BugNumber
     */
    balanceBN() {
      // Get balance of the selected currency
      if (!this.selectedToken) return undefined;
      if (this.selectedToken === 'ETH') {
        return this.provider.getBalance(this.userAddress);
      }
      const abi = require(`../../../abi/${this.selectedToken}.json`); // eslint-disable-line
      this.selectedTokenAddress = addresses[this.selectedToken];
      const tokenContract = new ethers.Contract(this.selectedTokenAddress, abi, this.signer);
      this.selectedTokenContract = tokenContract;
      return tokenContract.balanceOf(this.userAddress);
    },

    /**
     * @notice Returns allowance of Umbra contract to spend selected token
     */
    tokenAllowance() {
      if (!this.selectedTokenContract) return undefined;
      return this.selectedTokenContract.allowance(this.userAddress, umbraAddress);
    },

    /**
     * @notice Current toll
     */
    toll() {
      if (!this.provider) return undefined;
      const Umbra = new ethers.Contract(umbraAddress, umbraAbi, this.provider);
      return Umbra.toll();
    },
  },

  methods: {
    isValidAmount(val) {
      if (!this.selectedToken) return true;
      const balance = parseFloat(this.balance);
      const message = `Please enter a valid amount. You have ${balance} ${this.selectedToken}.`;
      return parseFloat(val) > 0 && balance >= parseFloat(val) ? true : message;
    },

    /**
     * @notice Check if Umbra has approval to spend the token. If not, get approval
     * then send transaction
     */
    async sendFundsFlow() {
      if (!this.hasAllowance && this.selectedToken !== 'ETH') {
        await this.getTokenApproval();
      }
      await this.sendFunds();
    },

    /**
     * @notice Get approval for Umbra to spend tokens
     */
    async getTokenApproval() {
      /* eslint-disable no-console */
      try {
        this.isSendPending = true;
        console.log('Requesting token approval...');
        const tx = await this.selectedTokenContract.approve(umbraAddress, constants.MaxUint256);
        this.txHash = tx.hash;
        this.isTxProcessing = true;
        console.log('Approval transaction hash: ', this.txHash);
        console.log('Pending confirmation...');
        await tx.wait();
        console.log('Approval transaction complete!');
        this.txHash = undefined;
        this.isTxProcessing = false;
      } catch (err) {
        this.showError(err);
      }
      /* eslint-enable no-console */
    },

    /**
     * @notice Send funds via the Umbra contract
     */
    async sendFunds() {
      /* eslint-disable no-console */
      try {
        this.isSendPending = true;
        // Create contract instance
        const Umbra = new ethers.Contract(umbraAddress, umbraAbi, this.signer);

        // Generate random number and encrypt with recipient's public key
        const randomNumber = new RandomNumber();
        const recipientKeyPair = new KeyPair(this.recipientPublicKey);
        const encrypted = await recipientKeyPair.encrypt(randomNumber);
        const {
          iv, ephemeralPublicKey, ciphertext, mac,
        } = encrypted;

        // Get x,y coordinates of ephemeral private key
        const ephemeralPublicKeyCoords = (new KeyPair(ephemeralPublicKey)).publicKeyHexCoords;

        // Break cipher text into three 32-byte components
        const ciphertextSlim = ciphertext.slice(2); // strip 0x prefix
        const ciphertextParts = {
          part1: `0x${ciphertextSlim.slice(0, 64)}`,
          part2: `0x${ciphertextSlim.slice(64, 128)}`,
          part3: `0x${ciphertextSlim.slice(128)}`,
        };

        // Compute stealth address
        const stealthKeyPair = recipientKeyPair.mulPublicKey(randomNumber);
        const stealthAddress = stealthKeyPair.address;

        // Send transaction
        console.log('Sending payment transaction...');
        let tx;
        if (this.selectedToken === 'ETH') {
          const paymentAmount = ethers.BigNumber.from(utils.parseEther(String(this.tokenAmount)));
          const totalAmount = paymentAmount.add(this.toll);
          const overrides = { value: totalAmount };
          tx = await Umbra.sendEth(
            stealthAddress,
            iv,
            ephemeralPublicKeyCoords.x,
            ephemeralPublicKeyCoords.y,
            ciphertextParts.part1,
            ciphertextParts.part2,
            ciphertextParts.part3,
            mac,
            overrides,
          );
        } else {
          // TODO update decimal parsing as more tokens are supported
          const paymentAmount = utils.parseEther(String(this.tokenAmount));
          const overrides = { value: this.toll };
          tx = await Umbra.sendToken(
            stealthAddress,
            this.selectedTokenAddress,
            paymentAmount,
            iv,
            ephemeralPublicKeyCoords.x,
            ephemeralPublicKeyCoords.y,
            ciphertextParts.part1,
            ciphertextParts.part2,
            ciphertextParts.part3,
            mac,
            overrides,
          );
        }
        this.txHash = tx.hash;
        this.isTxProcessing = true;
        console.log('Transaction hash: ', this.txHash);
        console.log('Pending confirmation...');
        await tx.wait();
        console.log('Transaction complete!');

        // Notify user on success
        this.notifyUser('positive', 'Your payment was successfully sent!');
        this.tokenAmount = undefined;
        this.selectedToken = undefined;
        this.selectedTokenAddress = undefined;
        this.$refs.recipientInput.resetIdentifier();
        this.$refs.sendForm.resetValidation();

        this.isTxProcessing = false;
        this.isSendPending = false;
      } catch (err) {
        this.showError(err);
        this.isTxProcessing = false;
        this.isSendPending = false;
      }
      /* eslint-enable no-console */
    },
  },
};
</script>
