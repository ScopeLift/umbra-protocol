<template>
  <q-page padding>
    <h3 class="page-title">
      Withdraw
    </h3>

    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to withdraw funds funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <div v-else-if="isUmbraPrivateKeyLogin && !isScanning">
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

    <div
      v-else-if="!isUmbraPrivateKeyLogin && !isScanning"
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

    <div v-if="isScanning">
      Scanning...
      <br>
      TODO
      <ol>
        <li>Check localstorage to see last block scanned from</li>
        <li>Scan for all Announcement events and parse out parameters</li>
        <li>Call `decrypt` on each set of outputs</li>
        <li>If decrypted outputed starts with `umbra-protocol-v0`, it's for this private key</li>
        <li>Save off block number of the last scanned block in localstorage</li>
        <li>Show list a table of accessible funds with the option to withdraw</li>
      </ol>
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';
import InputPrivateKey from 'components/InputPrivateKey';
import UnlockAccount from 'components/UnlockAccount';
import { ethers } from 'ethers';
import umbra from 'umbra-js';
import helpers from 'src/mixins/helpers';

const { KeyPair } = umbra;

// TODO update to handle mainnet. Currently has ropsten hardcoded
const umbraAbi = require('../../../contracts/build/contracts/Umbra.json').abi; // eslint-disable-line
const umbraAddress = require('../../../contracts/.openzeppelin/ropsten.json').proxies['umbra/Umbra'][0].address; // eslint-disable-line

export default {
  name: 'Withdraw',

  components: {
    ConnectWallet,
    InputPrivateKey,
    UnlockAccount,
  },

  mixins: [helpers],

  data() {
    return {
      isScanning: undefined,
      isUmbraPrivateKeyLogin: true,
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
              /* receiver, amount, token, */ iv, pkx, pky, ct0, ct1, ct2, mac,
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
            userEvents.push({ ...event, randomNumber: plaintext.slice(prefix.length) });
          } catch (err) {
            // Announcement not for user, so ignore it
          }
        }

        console.log('userEvents: ', userEvents);

        // Show list a table of accessible funds with the option to withdraw

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
