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

    <div
      v-else
      class="form text-center"
    >
      <div>
        Enter the private key associated with your public identifier, and we'll
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
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';
import InputPrivateKey from 'components/InputPrivateKey';
import umbra from 'umbra-js';

const { KeyPair } = umbra;

export default {
  name: 'Withdraw',

  components: {
    ConnectWallet,
    InputPrivateKey,
  },

  data() {
    return {
      isScanning: undefined,
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      privateKey: (state) => state.user.privateKey,
    }),

    keyPair() {
      if (!this.privateKey) return undefined;
      return new KeyPair(this.privateKey);
    },
  },

  methods: {
    searchForFunds() {
      this.isScanning = true;
      // this.isScanning = false;
    },
  },
};
</script>
