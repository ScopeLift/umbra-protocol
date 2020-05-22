<template>
  <q-page padding>
    <h3 class="page-title">
      Withdraw
    </h3>

    <!-- IF USER IS NOT LOGGED IN WITH WEB3 WALLET -->
    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to withdraw funds funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <!-- IF USER IS SCANNING WITH LOCAL STORAGE KEY -->
    <div v-else-if="isUmbraPrivateKeyLogin && !isScanning && !isScanComplete">
      <div class="form text-justify">
        Enter your password and we'll scan the blockchain for funds
        sent to a stealth address you control.
        <unlock-account
          button-label="Search for Funds"
          @unlocked="searchForFunds"
        />
      </div>

      <div class="row justify-center q-mt-xl">
        <div
          class="text-caption hyperlink"
          @click="toggleInputMethod"
        >
          Login with private key
        </div>
      </div>
    </div>

    <!-- IF USER IS SCANNING WITH PRIVAYE KEY -->
    <div
      v-else-if="!isUmbraPrivateKeyLogin && !isScanning && !isScanComplete"
      class="text-center"
    >
      <div class="form">
        <div>
          Enter the private key associated with your public identifier and we'll
          scan the blockchain for funds sent to a stealth address you control.
        </div>
        <input-private-key />

        <base-button
          :disabled="!privateKey"
          :full-width="true"
          label="Search For Funds"
          :loading="isScanning"
          @click="searchForFunds"
        />
      </div>

      <div class="row justify-center q-mt-xl">
        <div
          class="text-caption text-center hyperlink"
          @click="toggleInputMethod"
        >
          Login with Umbra password
        </div>
      </div>
    </div>

    <!-- IF WE ARE IN THE PROCESS OF SCANNING -->
    <div
      v-else-if="isScanning"
      class="text-center q-mt-xl"
    >
      <q-spinner
        color="primary"
        size="3rem"
      />
      <div class="text-center q-mt-md">
        Scanning for funds...
      </div>
    </div>

    <!-- SCAN IS COMPLETE, NO FUNDS HAVE BEEN SENT TO USER -->
    <div
      v-else-if="isScanComplete && !areFundsAvailable"
      class="text-center q-mt-xl"
    >
      No funds have been sent to you
    </div>

    <!-- SCAN IS COMPLETE AND USER HAS RECEIVED FUNDS -->
    <div
      v-else-if="isScanComplete && areFundsAvailable"
      class="text-center q-mt-xl"
    >
      <received-funds-table />
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';
import InputPrivateKey from 'components/InputPrivateKey';
import ReceivedFundsTable from 'components/ReceivedFundsTable';
import UnlockAccount from 'components/UnlockAccount';
import { ethers } from 'ethers';
import umbra from 'umbra-js';
import helpers from 'src/mixins/helpers';
import { date } from 'quasar';

const { formatDate } = date;
const { KeyPair } = umbra;

// TODO update to handle mainnet. Currently has ropsten hardcoded
const addresses = require('../../../addresses.json');
const umbraAbi = require('../../../contracts/build/contracts/Umbra.json').abi; // eslint-disable-line
const umbraAddress = require('../../../contracts/.openzeppelin/ropsten.json').proxies['umbra/Umbra'][0].address; // eslint-disable-line

export default {
  name: 'Withdraw',

  components: {
    ConnectWallet,
    InputPrivateKey,
    ReceivedFundsTable,
    UnlockAccount,
  },

  mixins: [helpers],

  data() {
    return {
      isScanning: undefined,
      isScanComplete: undefined,
      areFundsAvailable: undefined, // true if user has funds to withdraw
      isUmbraPrivateKeyLogin: true,
      tokenMappings: {
        [addresses.ETH]: 'ETH',
        [addresses.DAI]: 'DAI',
      },
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      privateKey: (state) => state.user.sensitive.privateKey,
      provider: (state) => state.user.ethersProvider,
    }),

    keyPair() {
      if (!this.privateKey) return undefined;
      return new KeyPair(this.privateKey);
    },
  },

  methods: {
    secondsToFormattedDate(seconds) {
      return `${formatDate(seconds * 1000, 'YYYY MMM DD')}`;
    },

    secondsToFormattedTime(seconds) {
      return `${formatDate(seconds * 1000, 'hh:mm A')}`;
    },

    async searchForFunds() {
      this.isScanning = true;
      try {
        // Get last block scanned from localStorage. If none found, use block of contract deployment
        // TODO update to handle mainnet (currently uses Ropsten block)
        const startBlock = this.$q.localStorage.getItem('lastBlock') || 7938811;

        // Get the most recent block seen
        const endBlock = await this.provider.getBlockNumber();

        // Create Umbra contract instance
        const Umbra = new ethers.Contract(umbraAddress, umbraAbi, this.provider);

        // Get list of all Announcement events
        const events = await Umbra.queryFilter('Announcement', startBlock, endBlock);

        // Generate KeyPair instance from user's decrypted private key
        const keyPairFromPrivate = new KeyPair(this.privateKey);

        // Get events that decrypt and start with the expected message prefix
        const userEvents = [];
        for (let i = 0; i < events.length; i += 1) {
          const event = events[i];
          try {
            // Extract out event parameters
            const {
              receiver, amount, token, iv, pkx, pky, ct0, ct1, ct2, mac,
            } = event.args;

            // Attempt descrypion
            const payload = {
              iv,
              ephemeralPublicKey: `0x04${pkx.slice(2)}${pky.slice(2)}`,
              ciphertext: `0x${ct0.slice(2)}${ct1.slice(2)}${ct2.slice(2)}`,
              mac,
            };
            const plaintext = await keyPairFromPrivate.decrypt(payload); // eslint-disable-line

            // Confirm expected prefix was seen and save off event
            const prefix = 'umbra-protocol-v0';
            if (!plaintext.startsWith(prefix)) throw new Error('Bad decryption');
            userEvents.push({
              ...event, randomNumber: plaintext.slice(prefix.length), receiver, amount, token,
            });
          } catch (err) {
            // Announcement not for user, so ignore it
          }
        }

        // Show list a table of accessible funds with the option to withdraw
        const tableData = [];
        for (let i = 0; i < userEvents.length; i += 1) {
          /* eslint-disable no-await-in-loop */
          const event = userEvents[i];
          const receipt = await event.getTransactionReceipt();
          const block = await event.getBlock();
          const { timestamp } = block;
          const from = await this.provider.lookupAddress(receipt.from)
            || `${receipt.from.slice(0, 6)}...${receipt.from.slice(38, 42)}`;
          const tokenName = this.tokenMappings[event.token] || 'Unknown';

          const data = {
            amount: ethers.utils.formatEther(event.amount),
            event,
            from,
            randomNumber: event.randomNumber,
            to: event.receiver,
            tokenAddress: event.token,
            tokenName,
            txHash: event.transactionHash,
            timestamp,
            txDate: this.secondsToFormattedDate(timestamp),
            txTime: this.secondsToFormattedTime(timestamp),
          };
          tableData.push(data);
        }
        this.$store.commit('user/withdrawalData', tableData);

        // Scan for funds is complete
        this.isScanComplete = true;
        this.areFundsAvailable = userEvents.length > 0;


        // Save off block number of the last scanned block in localstorage
        // this.$q.localStorage.set('lastBlock', endBlock);
        this.isScanning = false;
      } catch (err) {
        this.showError(err);
        this.isScanning = false;
      }
    },

    toggleInputMethod() {
      this.isUmbraPrivateKeyLogin = !this.isUmbraPrivateKeyLogin;
    },
  },
};
</script>
